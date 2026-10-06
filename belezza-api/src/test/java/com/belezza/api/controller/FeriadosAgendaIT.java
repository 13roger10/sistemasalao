package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.*;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.ServicoRepository;
import com.belezza.api.service.ProfissionalService;
import com.belezza.api.support.TenantFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-008 (auditoria): feriados e datas especiais gravados por salão e respeitados pela agenda.
 * Antes o POST devolvia um id aleatório sem gravar e a agenda aceitava horário no feriado.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Feriados e datas especiais na agenda")
class FeriadosAgendaIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private ProfissionalService profissionalService;

    private Salon salao;
    private String admin;
    private String recep;
    private Profissional profissional;
    private Cliente cliente;
    private Servico servico;
    private LocalDate terca;

    @BeforeEach
    void setUp() {
        salao = fx.salao("Salao Feriado");
        admin = fx.tokenAdmin(salao);
        recep = fx.token(fx.usuario(Role.RECEPCIONISTA, salao), salao.getId());
        servico = servicoRepository.save(Servico.builder()
                .nome("Corte").preco(BigDecimal.valueOf(50)).duracaoMinutos(30)
                .tipo(TipoServico.CABELO).salon(salao).ativo(true).build());
        profissional = profissionalRepository.save(Profissional.builder()
                .usuario(fx.usuario(Role.PROFISSIONAL, null))
                .salon(salao)
                .aceitaAgendamentoOnline(true)
                .servicos(new ArrayList<>(List.of(servico)))
                .build());
        profissionalService.criarHorariosTrabalhoDefault(profissional, salao);
        cliente = fx.cliente(salao);
        // Terça daqui a 3 semanas: dia útil normal do salão e do profissional
        LocalDate d = LocalDate.now().plusWeeks(3);
        while (d.getDayOfWeek() != DayOfWeek.TUESDAY) d = d.plusDays(1);
        terca = d;
    }

    private ResultActions agendar(LocalDate dia, String hora) throws Exception {
        return mockMvc.perform(post("/api/agendamentos")
                .header("Authorization", "Bearer " + recep)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"profissionalId": %d, "clienteId": %d, "servicoIds": [%d], "dataHora": "%sT%s:00"}
                        """.formatted(profissional.getId(), cliente.getId(), servico.getId(), dia, hora)));
    }

    @Test
    @DisplayName("Feriado gravado aparece na lista e bloqueia agendamento e disponibilidade")
    void feriadoBloqueiaAgenda() throws Exception {
        mockMvc.perform(post("/api/salon/schedule/holidays").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"" + terca + "\",\"name\":\"Feriado Municipal\",\"isOpen\":false,\"recurring\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty());

        mockMvc.perform(get("/api/salon/schedule/holidays").header("Authorization", "Bearer " + recep))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Feriado Municipal"));

        agendar(terca, "10:00")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Feriado Municipal")));

        mockMvc.perform(get("/api/agendamentos/disponibilidade")
                        .param("salonId", salao.getId().toString())
                        .param("data", terca.toString())
                        .param("servicoIds", servico.getId().toString())
                        .param("profissionalId", profissional.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("\"available\":true"))));

        // Uma semana depois (sem feriado) o mesmo horário é aceito
        agendar(terca.plusWeeks(1), "10:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Feriado recorrente vale no mesmo dia e mês de outro ano")
    void feriadoRecorrente() throws Exception {
        mockMvc.perform(post("/api/salon/schedule/holidays").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"" + terca.minusYears(3) + "\",\"name\":\"Aniversario da cidade\",\"isOpen\":false,\"recurring\":true}"))
                .andExpect(status().isOk());

        agendar(terca, "10:00").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Data especial com horário reduzido: fora dele recusa, dentro aceita")
    void dataEspecialComHorario() throws Exception {
        mockMvc.perform(post("/api/salon/schedule/special-dates").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"" + terca + "\",\"name\":\"Meio expediente\",\"type\":\"special_hours\",\"schedule\":{\"start\":\"14:00\",\"end\":\"16:00\"}}"))
                .andExpect(status().isOk());

        agendar(terca, "10:00").andExpect(status().isBadRequest());
        agendar(terca, "14:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Excluir o feriado libera a agenda; só o ADMIN do próprio salão mexe nos feriados")
    void exclusaoEPermissoes() throws Exception {
        String id = com.jayway.jsonpath.JsonPath.read(mockMvc.perform(post("/api/salon/schedule/holidays")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"" + terca + "\",\"name\":\"Feriado\",\"isOpen\":false}"))
                .andReturn().getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/salon/schedule/holidays").header("Authorization", "Bearer " + recep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"" + terca + "\",\"name\":\"Outro\",\"isOpen\":false}"))
                .andExpect(status().isForbidden());

        Salon outro = fx.salao("Outro Salao");
        mockMvc.perform(delete("/api/salon/schedule/holidays/" + id).header("Authorization", "Bearer " + fx.tokenAdmin(outro)))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/salon/schedule/holidays/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        agendar(terca, "10:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Dados inválidos são recusados com 400")
    void validacao() throws Exception {
        mockMvc.perform(post("/api/salon/schedule/holidays").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"2026-02-31\",\"name\":\"Data impossivel\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/salon/schedule/special-dates").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"" + terca + "\",\"name\":\"X\",\"type\":\"special_hours\",\"schedule\":{\"start\":\"16:00\",\"end\":\"14:00\"}}"))
                .andExpect(status().isBadRequest());
    }
}
