package com.belezza.api.scheduler;

import com.belezza.api.entity.*;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ConfiguracaoLembretesSalonRepository;
import com.belezza.api.service.NotificacaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("LembreteAgendamentoJob - configuração por salão (BUG-026)")
class LembreteAgendamentoJobTest {

    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private WhatsAppService whatsAppService;
    @Mock private NotificacaoService notificacaoService;
    @Mock private ConfiguracaoLembretesSalonRepository configuracaoRepository;

    @InjectMocks private LembreteAgendamentoJob job;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(job, "lembretesEnabled", true);
        ReflectionTestUtils.setField(job, "frontendUrl", "http://localhost:3000");
    }

    private Agendamento agendamentoDoSalao(long salonId) {
        Usuario usuario = Usuario.builder().id(9L).nome("Ana").telefone("11999990000").build();
        return Agendamento.builder()
                .id(100L + salonId)
                .salon(Salon.builder().id(salonId).endereco("Rua A").build())
                .cliente(Cliente.builder().id(5L).usuario(usuario).build())
                .dataHora(LocalDateTime.now().plusHours(24))
                .build();
    }

    @Test
    @DisplayName("Salão que desligou os lembretes não recebe o de 24 h; o salão sem configuração recebe")
    void respeitaSalaoDesligado() {
        Agendamento desligado = agendamentoDoSalao(1L);
        Agendamento padrao = agendamentoDoSalao(2L);
        when(agendamentoRepository.findNeedingReminder24h(any(), any())).thenReturn(List.of(desligado, padrao));
        when(configuracaoRepository.findById(1L)).thenReturn(Optional.of(
                ConfiguracaoLembretesSalon.builder().salonId(1L).ativo(false).build()));
        when(configuracaoRepository.findById(2L)).thenReturn(Optional.empty());

        job.enviarLembretes24h();

        verify(whatsAppService, times(1)).enviarLembrete24h(anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
        assertThat(desligado.isLembreteEnviado24h()).isFalse();
        assertThat(padrao.isLembreteEnviado24h()).isTrue();
    }

    @Test
    @DisplayName("Lembrete de 2 h desligado não sai, mesmo com os lembretes ligados")
    void respeitaLembrete2hDesligado() {
        Agendamento agendamento = agendamentoDoSalao(1L);
        when(agendamentoRepository.findNeedingReminder2h(any(), any())).thenReturn(List.of(agendamento));
        when(configuracaoRepository.findById(1L)).thenReturn(Optional.of(
                ConfiguracaoLembretesSalon.builder().salonId(1L).lembrete2h(false).build()));

        job.enviarLembretes2h();

        verifyNoInteractions(whatsAppService);
        verify(agendamentoRepository, never()).save(any());
    }
}
