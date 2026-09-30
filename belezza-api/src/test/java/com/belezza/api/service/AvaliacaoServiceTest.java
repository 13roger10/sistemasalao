package com.belezza.api.service;

import com.belezza.api.dto.avaliacao.AvaliacaoEdicaoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.AvaliacaoRepository;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Edição da própria avaliação (BUG-041)")
class AvaliacaoServiceTest {

    @Mock private AvaliacaoRepository avaliacaoRepository;
    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private TenantIsolationService tenantIsolationService;
    @Mock private NotificacaoService notificacaoService;

    @InjectMocks
    private AvaliacaoService avaliacaoService;

    private Usuario autor;
    private Avaliacao avaliacao;

    @BeforeEach
    void setUp() {
        autor = Usuario.builder().id(30L).role(Role.CLIENTE).build();
        Agendamento agendamento = Agendamento.builder().id(5L)
                .cliente(Cliente.builder().id(3L).usuario(autor).build()).build();
        Profissional profissional = Profissional.builder().id(6L)
                .usuario(Usuario.builder().id(20L).nome("Funcionário").build()).build();
        avaliacao = Avaliacao.builder().id(9L).agendamento(agendamento).profissional(profissional)
                .salon(Salon.builder().id(1L).build()).nota(2).comentario("demorou").build();
        ReflectionTestUtils.setField(avaliacao, "criadoEm", LocalDateTime.now().minusDays(2));
        lenient().when(avaliacaoRepository.findById(9L)).thenReturn(Optional.of(avaliacao));
        lenient().when(avaliacaoRepository.save(any(Avaliacao.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("O autor corrige nota e comentário dentro de 7 dias")
    void autorDentroDoPrazo() {
        avaliacaoService.editar(9L, new AvaliacaoEdicaoRequest(5, "no fim ficou ótimo"), autor);

        assertThat(avaliacao.getNota()).isEqualTo(5);
        assertThat(avaliacao.getComentario()).isEqualTo("no fim ficou ótimo");
    }

    @Test
    @DisplayName("Depois de 7 dias a edição é recusada")
    void prazoVencido() {
        ReflectionTestUtils.setField(avaliacao, "criadoEm", LocalDateTime.now().minusDays(8));

        assertThatThrownBy(() -> avaliacaoService.editar(9L, new AvaliacaoEdicaoRequest(5, null), autor))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("7 dias");
        verify(avaliacaoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Outro cliente não edita a avaliação")
    void outroCliente() {
        Usuario outro = Usuario.builder().id(31L).role(Role.CLIENTE).build();

        assertThatThrownBy(() -> avaliacaoService.editar(9L, new AvaliacaoEdicaoRequest(1, "x"), outro))
                .isInstanceOf(AccessDeniedException.class);
        verify(avaliacaoRepository, never()).save(any());
    }
}
