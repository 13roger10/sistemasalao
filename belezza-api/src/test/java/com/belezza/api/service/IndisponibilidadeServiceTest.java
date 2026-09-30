package com.belezza.api.service;

import com.belezza.api.dto.agendamento.CancelamentoRequest;
import com.belezza.api.dto.horario.BloqueioHorarioRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.AgendamentosAfetadosException;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.AgendamentoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Ausência e desativação com agendamentos marcados (BUG-033)")
class IndisponibilidadeServiceTest {

    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private AgendamentoService agendamentoService;
    @Mock private BloqueioHorarioService bloqueioHorarioService;
    @Mock private ProfissionalService profissionalService;
    @Mock private ServicoService servicoService;

    @InjectMocks
    private IndisponibilidadeService service;

    private final Usuario admin = Usuario.builder().id(1L).email("admin@teste.com").nome("Admin").role(Role.ADMIN).build();

    private Agendamento agendamento(long id) {
        Usuario cliente = Usuario.builder().id(100L + id).nome("Cliente " + id).telefone("11999990000").build();
        Usuario prof = Usuario.builder().id(50L).nome("Funcionário").build();
        return Agendamento.builder().id(id)
                .cliente(Cliente.builder().id(id).usuario(cliente).build())
                .profissional(Profissional.builder().id(6L).usuario(prof).build())
                .servico(Servico.builder().id(4L).nome("Corte").build())
                .dataHora(LocalDateTime.now().plusDays(1)).fimPrevisto(LocalDateTime.now().plusDays(1).plusMinutes(30))
                .status(StatusAgendamento.CONFIRMADO).build();
    }

    private BloqueioHorarioRequest atestado() {
        BloqueioHorarioRequest r = new BloqueioHorarioRequest();
        r.setDataInicio(LocalDateTime.now().plusDays(1).withHour(0).withMinute(0));
        r.setDataFim(LocalDateTime.now().plusDays(2).withHour(0).withMinute(0));
        r.setMotivo("Atestado");
        return r;
    }

    @Test
    @DisplayName("Sem agendamentos no período o bloqueio é criado direto")
    void semAfetados() {
        when(agendamentoRepository.findAfetadosNoPeriodo(eq(6L), any(), any(), any())).thenReturn(List.of());

        service.bloquear(6L, atestado(), null, admin);

        verify(bloqueioHorarioService).criar(eq(6L), any());
        verifyNoInteractions(agendamentoService);
    }

    @Test
    @DisplayName("Com agendamentos e sem escolha: 409 com a lista (e a transação desfaz o bloqueio)")
    void pedeEscolhaComALista() {
        when(agendamentoRepository.findAfetadosNoPeriodo(eq(6L), any(), any(), any()))
                .thenReturn(List.of(agendamento(1), agendamento(2)));

        assertThatThrownBy(() -> service.bloquear(6L, atestado(), null, admin))
                .isInstanceOfSatisfying(AgendamentosAfetadosException.class, e -> {
                    assertThat(e.getMessage()).contains("2 agendamento(s)");
                    assertThat(e.getAfetados()).extracting(a -> a.id() + ":" + a.clienteNome() + ":" + a.servicos())
                            .containsExactly("1:Cliente 1:[Corte]", "2:Cliente 2:[Corte]");
                });
        verifyNoInteractions(agendamentoService);
    }

    @Test
    @DisplayName("acao=cancelar cancela cada agendamento e avisa o cliente, sem expor o motivo interno")
    void cancelarEAvisar() {
        when(agendamentoRepository.findAfetadosDoProfissional(eq(6L), any()))
                .thenReturn(List.of(agendamento(1), agendamento(2)));

        service.desativarProfissional(6L, "cancelar", admin);

        verify(profissionalService).desativar(6L, "admin@teste.com");
        ArgumentCaptor<CancelamentoRequest> motivo = ArgumentCaptor.forClass(CancelamentoRequest.class);
        verify(agendamentoService).cancelar(eq(1L), motivo.capture(), eq(false), eq(false), eq(admin));
        verify(agendamentoService).cancelar(eq(2L), any(), eq(false), eq(false), eq(admin));
        assertThat(motivo.getValue().getMotivo()).contains("reagendar");
    }

    @Test
    @DisplayName("acao=manter segue sem cancelar nada")
    void manter() {
        when(agendamentoRepository.findAfetadosDoServico(eq(4L), any())).thenReturn(List.of(agendamento(1)));

        service.desativarServico(4L, "manter", admin);

        verify(servicoService).desativar(4L, "admin@teste.com");
        verifyNoInteractions(agendamentoService);
    }

    @Test
    @DisplayName("Ação desconhecida é recusada")
    void acaoInvalida() {
        when(agendamentoRepository.findAfetadosDoServico(eq(4L), any())).thenReturn(List.of(agendamento(1)));

        assertThatThrownBy(() -> service.desativarServico(4L, "apagar", admin))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("acao=cancelar ou acao=manter");
    }
}
