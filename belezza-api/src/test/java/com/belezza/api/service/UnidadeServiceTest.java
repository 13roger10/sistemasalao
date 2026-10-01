package com.belezza.api.service;

import com.belezza.api.dto.salon.UnidadeRequest;
import com.belezza.api.dto.salon.UnidadeResponse;
import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioFuncionamentoSalon;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.TipoComissao;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.HorarioFuncionamentoSalonRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.ServicoRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Várias unidades por administrador")
class UnidadeServiceTest {

    private static final String EMAIL = "dono@teste.com";

    @Mock private SalonRepository salonRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ProfissionalRepository profissionalRepository;
    @Mock private HorarioFuncionamentoSalonRepository horarioRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private ServicoRepository servicoRepository;
    @Mock private PagamentoRepository pagamentoRepository;

    private SalonService salonService;
    private UnidadeService unidadeService;

    private Usuario dono;
    private Salon sede;
    private Salon filial;

    @BeforeEach
    void setUp() {
        salonService = new SalonService(salonRepository, usuarioRepository, profissionalRepository);
        unidadeService = new UnidadeService(salonRepository, usuarioRepository, salonService, horarioRepository,
                profissionalRepository, clienteRepository, servicoRepository, pagamentoRepository);

        dono = Usuario.builder().id(1L).email(EMAIL).role(Role.ADMIN).ativo(true).build();
        sede = Salon.builder().id(10L).nome("Sede").admin(dono).ativo(true)
                .horarioAbertura(LocalTime.of(8, 0)).horarioFechamento(LocalTime.of(19, 0))
                .intervaloAgendamentoMinutos(45).tipoComissaoPadrao(TipoComissao.FIXO)
                .valorComissaoPadrao(BigDecimal.valueOf(25)).build();
        filial = Salon.builder().id(20L).nome("Filial").admin(dono).ativo(true)
                .horarioAbertura(LocalTime.of(9, 0)).horarioFechamento(LocalTime.of(18, 0)).build();

        lenient().when(usuarioRepository.findByEmailAndAtivoTrue(EMAIL)).thenReturn(Optional.of(dono));
        lenient().when(salonRepository.findByIdAndAdminId(10L, 1L)).thenReturn(Optional.of(sede));
        lenient().when(salonRepository.findByIdAndAdminId(20L, 1L)).thenReturn(Optional.of(filial));
        lenient().when(salonRepository.findFirstByAdminIdAndAtivoTrueOrderByIdAsc(1L)).thenReturn(Optional.of(sede));
        lenient().when(salonRepository.findFirstByAdminIdOrderByIdAsc(1L)).thenReturn(Optional.of(sede));
    }

    @AfterEach
    void limparTenant() {
        TenantContext.clear();
    }

    @Nested
    @DisplayName("Unidade atual do admin")
    class UnidadeAtual {

        @Test
        @DisplayName("Vale a unidade do token quando é do admin")
        void unidadeDoToken() {
            TenantContext.setCurrentTenant(20L);

            assertThat(salonService.getSalonByAdminEmail(EMAIL)).isSameAs(filial);
        }

        @Test
        @DisplayName("Token com salão de outro dono é ignorado")
        void tokenDeOutroDono() {
            TenantContext.setCurrentTenant(99L);
            when(salonRepository.findByIdAndAdminId(99L, 1L)).thenReturn(Optional.empty());

            assertThat(salonService.getSalonByAdminEmail(EMAIL)).isSameAs(sede);
        }

        @Test
        @DisplayName("Sem token: a última unidade escolhida, senão a sede")
        void unidadeEscolhida() {
            assertThat(salonService.getSalonByAdminEmail(EMAIL)).isSameAs(sede);

            dono.setUnidadeAtiva(filial);
            assertThat(salonService.getSalonByAdminEmail(EMAIL)).isSameAs(filial);
        }

        @Test
        @DisplayName("Unidade escolhida e depois desativada volta para a sede")
        void escolhidaDesativada() {
            filial.setAtivo(false);
            dono.setUnidadeAtiva(filial);

            assertThat(salonService.getSalonByAdminEmail(EMAIL)).isSameAs(sede);
        }
    }

    @Nested
    @DisplayName("Cadastro de unidades")
    class Cadastro {

        @Test
        @DisplayName("Nova unidade copia regras, comissão e horários da unidade atual")
        void criaComRegrasDaAtual() {
            when(salonRepository.save(any(Salon.class))).thenAnswer(inv -> {
                Salon s = inv.getArgument(0);
                s.setId(30L);
                return s;
            });
            when(horarioRepository.findBySalonId(10L)).thenReturn(List.of(HorarioFuncionamentoSalon.builder()
                    .salon(sede).diaSemana(DiaSemana.SABADO).horaInicio(LocalTime.of(8, 0))
                    .horaFim(LocalTime.of(14, 0)).ativo(true).build()));

            UnidadeResponse nova = unidadeService.criar(UnidadeRequest.builder()
                    .nome("  Barbearia Centro ").cidade("Campinas").estado("sp").telefone(" ").build(), EMAIL);

            ArgumentCaptor<Salon> salvo = ArgumentCaptor.forClass(Salon.class);
            verify(salonRepository).save(salvo.capture());
            assertThat(salvo.getValue().getAdmin()).isSameAs(dono);
            assertThat(salvo.getValue().getHorarioAbertura()).isEqualTo(LocalTime.of(8, 0));
            assertThat(salvo.getValue().getIntervaloAgendamentoMinutos()).isEqualTo(45);
            assertThat(salvo.getValue().getTipoComissaoPadrao()).isEqualTo(TipoComissao.FIXO);
            assertThat(nova.nome()).isEqualTo("Barbearia Centro");
            assertThat(nova.estado()).isEqualTo("SP");
            assertThat(nova.telefone()).isNull();

            ArgumentCaptor<HorarioFuncionamentoSalon> horario = ArgumentCaptor.forClass(HorarioFuncionamentoSalon.class);
            verify(horarioRepository).save(horario.capture());
            assertThat(horario.getValue().getSalon().getId()).isEqualTo(30L);
            assertThat(horario.getValue().getHoraFim()).isEqualTo(LocalTime.of(14, 0));
        }

        @Test
        @DisplayName("Lista só as unidades do admin, marcando sede e atual")
        void lista() {
            TenantContext.setCurrentTenant(20L);
            when(salonRepository.findByAdminIdOrderByIdAsc(1L)).thenReturn(List.of(sede, filial));

            List<UnidadeResponse> unidades = unidadeService.listar(EMAIL);

            assertThat(unidades).extracting(UnidadeResponse::id).containsExactly(10L, 20L);
            assertThat(unidades.get(0).sede()).isTrue();
            assertThat(unidades.get(0).atual()).isFalse();
            assertThat(unidades.get(1).atual()).isTrue();
        }

        @Test
        @DisplayName("Não altera unidade de outro dono")
        void unidadeDeOutroDono() {
            when(salonRepository.findByIdAndAdminId(99L, 1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> unidadeService.atualizar(99L, UnidadeRequest.builder().nome("X").build(), EMAIL))
                    .isInstanceOf(ResourceNotFoundException.class);
            assertThatThrownBy(() -> unidadeService.desativar(99L, EMAIL))
                    .isInstanceOf(ResourceNotFoundException.class);
            verify(salonRepository, never()).save(any());
        }

        @Test
        @DisplayName("Não desativa a unidade em uso; desativa outra")
        void desativar() {
            TenantContext.setCurrentTenant(10L);

            assertThatThrownBy(() -> unidadeService.desativar(10L, EMAIL))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Entre em outra unidade");

            UnidadeResponse resposta = unidadeService.desativar(20L, EMAIL);
            assertThat(resposta.ativo()).isFalse();
            assertThat(filial.isAtivo()).isFalse();
        }

        @Test
        @DisplayName("Quem não é admin não gerencia unidades")
        void naoAdmin() {
            dono.setRole(Role.RECEPCIONISTA);

            assertThatThrownBy(() -> unidadeService.listar(EMAIL)).isInstanceOf(AccessDeniedException.class);
        }
    }
}
