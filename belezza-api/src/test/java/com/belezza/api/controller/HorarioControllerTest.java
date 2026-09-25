package com.belezza.api.controller;

import com.belezza.api.dto.horario.BloqueioHorarioRequest;
import com.belezza.api.dto.horario.HorarioTrabalhoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.service.BloqueioHorarioService;
import com.belezza.api.service.HorarioTrabalhoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("HorarioController - permissões de agenda")
class HorarioControllerTest {

    @Mock
    private HorarioTrabalhoService horarioTrabalhoService;

    @Mock
    private BloqueioHorarioService bloqueioHorarioService;

    @Mock
    private ProfissionalRepository profissionalRepository;

    @InjectMocks
    private HorarioController controller;

    private final Salon salonA = Salon.builder().id(1L).build();
    private final Salon salonB = Salon.builder().id(2L).build();
    private Profissional profA;      // profissional 6, salão A, usuário 20
    private Profissional colegaA;    // profissional 7, salão A, usuário 21
    private Profissional profB;      // profissional 10, salão B

    private final Usuario admin = Usuario.builder().id(1L).role(Role.ADMIN).build();
    private final Usuario usuarioProfA = Usuario.builder().id(20L).role(Role.PROFISSIONAL).build();

    @BeforeEach
    void setUp() {
        profA = Profissional.builder().id(6L).salon(salonA).build();
        colegaA = Profissional.builder().id(7L).salon(salonA).build();
        profB = Profissional.builder().id(10L).salon(salonB).build();
        lenient().when(profissionalRepository.findById(6L)).thenReturn(Optional.of(profA));
        lenient().when(profissionalRepository.findById(7L)).thenReturn(Optional.of(colegaA));
        lenient().when(profissionalRepository.findById(10L)).thenReturn(Optional.of(profB));
        lenient().when(profissionalRepository.findByUsuarioId(20L)).thenReturn(Optional.of(profA));
        TenantContext.setCurrentTenant(1L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private HorarioTrabalhoRequest horario() {
        return HorarioTrabalhoRequest.builder().diaSemana(DiaSemana.SABADO).horaInicio("08:00").horaFim("12:00").build();
    }

    private BloqueioHorarioRequest bloqueio() {
        return BloqueioHorarioRequest.builder()
                .dataInicio(LocalDateTime.now().plusDays(1))
                .dataFim(LocalDateTime.now().plusDays(1).plusHours(2))
                .motivo("teste").build();
    }

    @Test
    @DisplayName("Admin altera agenda de profissional do próprio salão")
    void adminMesmoSalao() {
        controller.criarHorario(7L, horario(), admin);
        controller.criarBloqueio(7L, bloqueio(), admin);
        controller.removerBloqueio(7L, 99L, admin);

        verify(horarioTrabalhoService).criar(eq(7L), any());
        verify(bloqueioHorarioService).criar(eq(7L), any());
        verify(bloqueioHorarioService).remover(7L, 99L);
    }

    @Test
    @DisplayName("Admin NÃO altera agenda de profissional de outro salão")
    void adminOutroSalao() {
        assertThatThrownBy(() -> controller.criarHorario(10L, horario(), admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.atualizarHorario(10L, DiaSemana.SEGUNDA, horario(), admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.desativarHorario(10L, DiaSemana.SEGUNDA, admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.criarBloqueio(10L, bloqueio(), admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.removerBloqueio(10L, 99L, admin)).isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(horarioTrabalhoService, bloqueioHorarioService);
    }

    @Test
    @DisplayName("Profissional altera a própria agenda")
    void profissionalPropriaAgenda() {
        controller.criarBloqueio(6L, bloqueio(), usuarioProfA);
        controller.desativarHorario(6L, DiaSemana.SEGUNDA, usuarioProfA);

        verify(bloqueioHorarioService).criar(eq(6L), any());
        verify(horarioTrabalhoService).desativar(6L, DiaSemana.SEGUNDA);
    }

    @Test
    @DisplayName("Profissional NÃO altera a agenda de um colega")
    void profissionalAgendaDeColega() {
        assertThatThrownBy(() -> controller.criarHorario(7L, horario(), usuarioProfA)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.criarBloqueio(7L, bloqueio(), usuarioProfA)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.removerBloqueio(7L, 99L, usuarioProfA)).isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(horarioTrabalhoService, bloqueioHorarioService);
    }

    @Test
    @DisplayName("Sem salão no token, nenhuma alteração é permitida")
    void semTenant() {
        TenantContext.clear();
        assertThatThrownBy(() -> controller.criarBloqueio(6L, bloqueio(), admin)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(bloqueioHorarioService);
    }

    @Test
    @DisplayName("Profissional inexistente responde 404")
    void profissionalInexistente() {
        when(profissionalRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> controller.criarBloqueio(999L, bloqueio(), admin)).isInstanceOf(ResourceNotFoundException.class);
    }
}
