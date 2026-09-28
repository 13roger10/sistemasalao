package com.belezza.api.service;

import com.belezza.api.dto.comissao.GerarPagamentoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.ComissaoRepository;
import com.belezza.api.repository.PagamentoProfissionalRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PagamentoProfissionalService - geração de repasse")
class PagamentoProfissionalServiceTest {

    @Mock private PagamentoProfissionalRepository pagamentoProfissionalRepository;
    @Mock private ComissaoRepository comissaoRepository;
    @Mock private ProfissionalRepository profissionalRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private NotificacaoService notificacaoService;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PagamentoProfissionalService service;

    private final LocalDate hoje = LocalDate.now();

    private GerarPagamentoRequest request() {
        return GerarPagamentoRequest.builder().profissionalId(6L).periodoInicio(hoje).periodoFim(hoje).build();
    }

    @Test
    @DisplayName("Repasse só inclui comissões que ainda não estão em outro repasse")
    void soComissoesForaDeOutroRepasse() {
        Salon salon = Salon.builder().id(1L).build();
        Profissional prof = Profissional.builder().id(6L).salon(salon)
                .usuario(Usuario.builder().id(20L).build()).build();
        Comissao livre = Comissao.builder().id(1L).status(StatusComissao.CALCULADA)
                .valorServico(new BigDecimal("50.00")).valorComissao(new BigDecimal("20.00")).build();
        when(pagamentoProfissionalRepository.findByProfissionalIdAndPeriodOverlap(eq(6L), any(), any())).thenReturn(List.of());
        when(profissionalRepository.findById(6L)).thenReturn(Optional.of(prof));
        when(comissaoRepository.findDisponiveisParaRepasse(eq(6L), any(), any())).thenReturn(List.of(livre));
        when(pagamentoProfissionalRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.gerarPagamento(1L, request());

        verify(comissaoRepository, never()).findByProfissionalIdAndStatusAndPeriod(any(), any(), any(), any());
        verify(pagamentoProfissionalRepository).save(argThat(p ->
                p.getTotalServicos() == 1 && p.getValorTotalComissoes().compareTo(new BigDecimal("20.00")) == 0));
        assertThat(livre.getPagamentoProfissional()).isNotNull();
    }

    @Test
    @DisplayName("Sem comissões livres no período, o repasse não é gerado")
    void semComissoesLivres() {
        Salon salon = Salon.builder().id(1L).build();
        when(pagamentoProfissionalRepository.findByProfissionalIdAndPeriodOverlap(eq(6L), any(), any())).thenReturn(List.of());
        when(profissionalRepository.findById(6L)).thenReturn(Optional.of(Profissional.builder().id(6L).salon(salon).build()));
        when(comissaoRepository.findDisponiveisParaRepasse(eq(6L), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> service.gerarPagamento(1L, request()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Nao ha comissoes pendentes");
        verify(pagamentoProfissionalRepository, never()).save(any());
    }
}
