package com.belezza.api.scheduler;

import com.belezza.api.entity.Agendamento;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Servico;
import com.belezza.api.entity.StatusAgendamento;
import com.belezza.api.entity.TipoNotificacao;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.service.NotificacaoService;
import org.junit.jupiter.api.BeforeEach;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("NoShowScheduler - falta automática após 30 minutos")
class NoShowSchedulerTest {

    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private NotificacaoService notificacaoService;
    @InjectMocks private NoShowScheduler scheduler;

    private Salon salon;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        salon = Salon.builder().id(1L).maxNoShowsPermitidos(3).build();
        cliente = Cliente.builder().id(1L).salon(salon)
                .usuario(Usuario.builder().id(1L).nome("Maria").build()).build();
    }

    private Agendamento agendamento(StatusAgendamento status) {
        return Agendamento.builder()
                .id(10L).salon(salon).cliente(cliente)
                .profissional(Profissional.builder().id(1L).salon(salon).build())
                .servico(Servico.builder().id(1L).nome("Corte").build())
                .dataHora(LocalDateTime.now().minusMinutes(40))
                .status(status)
                .build();
    }

    @Test
    @DisplayName("Procura agendamentos com mais de 30 minutos de atraso, só das últimas 24 horas")
    void usaToleranciaDe30Minutos() {
        when(agendamentoRepository.findNoShowCandidates(any(), any())).thenReturn(List.of());
        LocalDateTime antes = LocalDateTime.now();

        scheduler.processarNoShows();

        ArgumentCaptor<LocalDateTime> desde = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> cutoff = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(agendamentoRepository).findNoShowCandidates(desde.capture(), cutoff.capture());
        assertThat(cutoff.getValue()).isAfterOrEqualTo(antes.minusMinutes(30)).isBefore(antes.minusMinutes(30).plusSeconds(5));
        assertThat(desde.getValue()).isAfterOrEqualTo(antes.minusHours(24)).isBefore(antes.minusHours(24).plusSeconds(5));
        verify(notificacaoService, never()).notificarEquipeMudancaStatusAgendamento(any(), any(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Pendente e confirmado viram não compareceu, contam a falta e avisam a equipe na hora")
    void marcaFaltaEAvisaEquipe() {
        Agendamento pendente = agendamento(StatusAgendamento.PENDENTE);
        Agendamento confirmado = agendamento(StatusAgendamento.CONFIRMADO);
        when(agendamentoRepository.findNoShowCandidates(any(), any())).thenReturn(List.of(pendente, confirmado));

        scheduler.processarNoShows();

        assertThat(pendente.getStatus()).isEqualTo(StatusAgendamento.NO_SHOW);
        assertThat(confirmado.getStatus()).isEqualTo(StatusAgendamento.NO_SHOW);
        assertThat(cliente.getNoShows()).isEqualTo(2);
        ArgumentCaptor<String> mensagem = ArgumentCaptor.forClass(String.class);
        // autor null: a notificação vai para recepção, profissional e admin
        verify(notificacaoService, times(2)).notificarEquipeMudancaStatusAgendamento(
                any(Agendamento.class), isNull(), eq(TipoNotificacao.AGENDAMENTO_CANCELADO),
                eq("Cliente Não Compareceu"), mensagem.capture());
        assertThat(mensagem.getValue())
                .contains("Maria não compareceu")
                .contains("(Corte)")
                .contains("Após 30 minutos")
                .contains("cancelado automaticamente");
    }

    @Test
    @DisplayName("Falta que atinge o limite bloqueia o cliente e a notificação avisa")
    void bloqueioNoLimite() {
        cliente.setNoShows(2);
        when(agendamentoRepository.findNoShowCandidates(any(), any())).thenReturn(List.of(agendamento(StatusAgendamento.CONFIRMADO)));

        scheduler.processarNoShows();

        assertThat(cliente.isBloqueado()).isTrue();
        ArgumentCaptor<String> mensagem = ArgumentCaptor.forClass(String.class);
        verify(notificacaoService).notificarEquipeMudancaStatusAgendamento(any(), isNull(), any(), anyString(), mensagem.capture());
        assertThat(mensagem.getValue()).contains("foi bloqueado");
    }

    @Test
    @DisplayName("Falha ao notificar não impede marcar a falta dos outros agendamentos")
    void falhaNaNotificacaoNaoInterrompe() {
        Agendamento a = agendamento(StatusAgendamento.CONFIRMADO);
        Agendamento b = agendamento(StatusAgendamento.PENDENTE);
        when(agendamentoRepository.findNoShowCandidates(any(), any())).thenReturn(List.of(a, b));
        doThrow(new RuntimeException("websocket fora")).when(notificacaoService)
                .notificarEquipeMudancaStatusAgendamento(any(), any(), any(), anyString(), anyString());

        scheduler.processarNoShows();

        assertThat(a.getStatus()).isEqualTo(StatusAgendamento.NO_SHOW);
        assertThat(b.getStatus()).isEqualTo(StatusAgendamento.NO_SHOW);
        verify(clienteRepository, times(2)).save(cliente);
    }
}
