package com.belezza.api.service;

import com.belezza.api.dto.user.CreateUsuarioRequest;
import com.belezza.api.dto.user.UpdateMeuPerfilRequest;
import com.belezza.api.dto.user.UpdateUsuarioRequest;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.entity.*;
import com.belezza.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UsuarioService - isolamento entre estabelecimentos")
class UsuarioServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ProfissionalRepository profissionalRepository;
    @Mock private SalonRepository salonRepository;
    @Mock private SalonService salonService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private FidelidadeClienteRepository fidelidadeClienteRepository;
    @Mock private NotificacaoRepository notificacaoRepository;
    @Mock private PushSubscriptionRepository pushSubscriptionRepository;
    @Mock private BackupCodeRepository backupCodeRepository;
    @Mock private LoginAttemptService loginAttemptService;
    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private CaixaRepository caixaRepository;
    @Mock private MovimentacaoCaixaRepository movimentacaoCaixaRepository;

    @InjectMocks
    private UsuarioService usuarioService;

    private static final String EMAIL_ADMIN_A = "admin.a@teste.com";

    private Usuario adminA;
    private Salon salonA;
    private Salon salonB;
    private Usuario recepA;
    private Usuario recepB;

    @BeforeEach
    void setUp() {
        adminA = Usuario.builder().id(1L).email(EMAIL_ADMIN_A).nome("Admin A").role(Role.ADMIN).ativo(true).build();
        salonA = Salon.builder().id(1L).admin(adminA).build();
        salonB = Salon.builder().id(2L).build();
        recepA = Usuario.builder().id(14L).nome("Recep A").role(Role.RECEPCIONISTA).salon(salonA).ativo(true).build();
        recepB = Usuario.builder().id(41L).nome("Recep B").role(Role.RECEPCIONISTA).salon(salonB).ativo(true).build();

        lenient().when(usuarioRepository.findByEmailAndAtivoTrue(EMAIL_ADMIN_A)).thenReturn(Optional.of(adminA));
        lenient().when(salonService.unidadeAtualDoAdmin(adminA)).thenReturn(Optional.of(salonA));
        lenient().when(usuarioRepository.findById(14L)).thenReturn(Optional.of(recepA));
        lenient().when(usuarioRepository.findById(41L)).thenReturn(Optional.of(recepB));
        lenient().when(clienteRepository.findByUsuarioId(any())).thenReturn(List.of());
        lenient().when(profissionalRepository.findByUsuarioId(any())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("Listagem do admin é restrita ao próprio salão")
    void listarRestritoAoSalao() {
        Page<Usuario> pagina = new PageImpl<>(List.of(adminA, recepA));
        when(usuarioRepository.searchVinculadosAoSalao(eq(1L), eq(""), any(Pageable.class))).thenReturn(pagina);

        var response = usuarioService.listar(EMAIL_ADMIN_A, null, null, 0, 10);

        assertThat(response.getContent()).hasSize(2);
        verify(usuarioRepository, never()).findAllByOrderByCriadoEmDesc(any());
        verify(usuarioRepository, never()).searchByNomeOrEmail(any(), any());
    }

    @Test
    @DisplayName("Admin sem salão não lista ninguém")
    void listarAdminSemSalao() {
        when(salonService.unidadeAtualDoAdmin(adminA)).thenReturn(Optional.empty());

        var response = usuarioService.listar(EMAIL_ADMIN_A, null, "x", 0, 10);

        assertThat(response.getContent()).isEmpty();
        verify(usuarioRepository, never()).searchVinculadosAoSalao(any(), any(), any());
    }

    @Test
    @DisplayName("Não cria usuário com salonId de outro salão")
    void criarEmOutroSalao() {
        CreateUsuarioRequest request = CreateUsuarioRequest.builder()
                .nome("Infiltrado").email("infiltrado@teste.com").password("Senha@123")
                .role(Role.PROFISSIONAL).salonId(2L).build();

        assertThatThrownBy(() -> usuarioService.criar(request, EMAIL_ADMIN_A))
                .isInstanceOf(AccessDeniedException.class);

        verify(usuarioRepository, never()).save(any());
        verify(profissionalRepository, never()).save(any());
    }

    @Test
    @DisplayName("Profissional criado sem salonId é vinculado ao salão do admin")
    void criarProfissionalNoProprioSalao() {
        CreateUsuarioRequest request = CreateUsuarioRequest.builder()
                .nome("Novo Prof").email("novo.prof@teste.com").password("Senha@123")
                .role(Role.PROFISSIONAL).build();
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setId(99L);
            return u;
        });
        when(salonRepository.findById(1L)).thenReturn(Optional.of(salonA));
        when(profissionalRepository.save(any(Profissional.class))).thenAnswer(inv -> inv.getArgument(0));

        usuarioService.criar(request, EMAIL_ADMIN_A);

        verify(profissionalRepository).save(argThat(p -> p.getSalon().getId().equals(1L)));
    }

    @Test
    @DisplayName("Cliente criado em Usuários ganha cadastro de cliente no salão do admin")
    void criarClienteNoProprioSalao() {
        CreateUsuarioRequest request = CreateUsuarioRequest.builder()
                .nome("Cliente Novo").email("cliente.novo@teste.com").password("Senha@123")
                .role(Role.CLIENTE).build();
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        when(salonRepository.findById(1L)).thenReturn(Optional.of(salonA));

        usuarioService.criar(request, EMAIL_ADMIN_A);

        verify(clienteRepository).save(argThat(c -> c.getSalon().getId().equals(1L)
                && c.getUsuario().getEmail().equals("cliente.novo@teste.com")));
    }

    @Test
    @DisplayName("Não lê usuário de outro salão")
    void buscarDeOutroSalao() {
        assertThatThrownBy(() -> usuarioService.buscarPorId(41L, EMAIL_ADMIN_A))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Lê usuário do próprio salão")
    void buscarDoProprioSalao() {
        assertThat(usuarioService.buscarPorId(14L, EMAIL_ADMIN_A).getId()).isEqualTo(14L);
    }

    @Test
    @DisplayName("Não desativa nem reativa usuário de outro salão")
    void desativarReativarOutroSalao() {
        assertThatThrownBy(() -> usuarioService.desativar(41L, EMAIL_ADMIN_A))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> usuarioService.reativar(41L, EMAIL_ADMIN_A))
                .isInstanceOf(AccessDeniedException.class);

        assertThat(recepB.isAtivo()).isTrue();
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Desativa usuário do próprio salão")
    void desativarProprioSalao() {
        usuarioService.desativar(14L, EMAIL_ADMIN_A);

        assertThat(recepA.isAtivo()).isFalse();
    }

    @Test
    @DisplayName("Não edita usuário de outro salão")
    void atualizarOutroSalao() {
        UpdateUsuarioRequest request = UpdateUsuarioRequest.builder().nome("Hack").password("Hackeada@1").build();

        assertThatThrownBy(() -> usuarioService.atualizar(41L, request, EMAIL_ADMIN_A))
                .isInstanceOf(AccessDeniedException.class);
        verify(usuarioRepository, never()).save(any());
    }

    // ===== BUG-030: trocar a própria senha exige a senha atual =====

    private Usuario prof() {
        Usuario prof = Usuario.builder().id(20L).email("prof@teste.com").password("hash-atual")
                .role(Role.PROFISSIONAL).salon(salonA).ativo(true).build();
        lenient().when(usuarioRepository.findByEmailAndAtivoTrue("prof@teste.com")).thenReturn(Optional.of(prof));
        lenient().when(usuarioRepository.findById(20L)).thenReturn(Optional.of(prof));
        lenient().when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        return prof;
    }

    @Test
    @DisplayName("Perfil: trocar a senha sem a senha atual é recusado")
    void perfilSemSenhaAtual() {
        Usuario prof = prof();
        UpdateMeuPerfilRequest req = UpdateMeuPerfilRequest.builder().password("NovaSenha1").build();

        assertThatThrownBy(() -> usuarioService.atualizarMeuPerfil("prof@teste.com", req))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Informe a senha atual");
        assertThat(prof.getPassword()).isEqualTo("hash-atual");
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Perfil: senha atual errada é recusada e conta como tentativa errada")
    void perfilSenhaAtualErrada() {
        Usuario prof = prof();
        when(passwordEncoder.matches("Errada123", "hash-atual")).thenReturn(false);
        UpdateMeuPerfilRequest req = UpdateMeuPerfilRequest.builder().senhaAtual("Errada123").password("NovaSenha1").build();

        assertThatThrownBy(() -> usuarioService.atualizarMeuPerfil("prof@teste.com", req))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Senha atual incorreta");
        verify(loginAttemptService).registrarFalha("prof@teste.com");
        assertThat(prof.getPassword()).isEqualTo("hash-atual");
    }

    @Test
    @DisplayName("Perfil: com a senha atual certa, troca a senha")
    void perfilTrocaComSenhaAtual() {
        Usuario prof = prof();
        when(passwordEncoder.matches("Atual1234", "hash-atual")).thenReturn(true);
        when(passwordEncoder.encode("NovaSenha1")).thenReturn("hash-nova");
        UpdateMeuPerfilRequest req = UpdateMeuPerfilRequest.builder().senhaAtual("Atual1234").password("NovaSenha1").build();

        usuarioService.atualizarMeuPerfil("prof@teste.com", req);

        assertThat(prof.getPassword()).isEqualTo("hash-nova");
    }

    @Test
    @DisplayName("Editar a própria conta por /usuarios/{id} também exige a senha atual")
    void edicaoPropriaExigeSenhaAtual() {
        prof();
        UpdateUsuarioRequest req = UpdateUsuarioRequest.builder().password("NovaSenha1").build();

        assertThatThrownBy(() -> usuarioService.atualizar(20L, req, "prof@teste.com"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Informe a senha atual");
    }

    @Test
    @DisplayName("Admin redefinindo a senha de um funcionário não precisa da senha dele")
    void adminRedefineSenhaDeFuncionario() {
        when(passwordEncoder.encode("NovaSenha1")).thenReturn("hash-nova");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));
        UpdateUsuarioRequest req = UpdateUsuarioRequest.builder().password("NovaSenha1").build();

        usuarioService.atualizar(14L, req, EMAIL_ADMIN_A);

        assertThat(recepA.getPassword()).isEqualTo("hash-nova");
        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    @DisplayName("Profissional não lê os dados pessoais de um colega nem de clientes")
    void profissionalNaoLeOutrosUsuarios() {
        Usuario prof = Usuario.builder().id(20L).email("prof@teste.com").role(Role.PROFISSIONAL).salon(salonA).ativo(true).build();
        Usuario colega = Usuario.builder().id(21L).email("colega@teste.com").role(Role.PROFISSIONAL).salon(salonA).ativo(true).build();
        Usuario cliente = Usuario.builder().id(22L).email("cli@teste.com").role(Role.CLIENTE).ativo(true).build();
        when(usuarioRepository.findByEmailAndAtivoTrue("prof@teste.com")).thenReturn(Optional.of(prof));
        when(usuarioRepository.findById(21L)).thenReturn(Optional.of(colega));
        when(usuarioRepository.findById(22L)).thenReturn(Optional.of(cliente));
        when(usuarioRepository.findById(20L)).thenReturn(Optional.of(prof));

        assertThatThrownBy(() -> usuarioService.buscarPorId(21L, "prof@teste.com"))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> usuarioService.buscarPorId(22L, "prof@teste.com"))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(usuarioService.buscarPorId(20L, "prof@teste.com").getId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("Listagem do profissional traz só o próprio cadastro")
    void listarProfissionalSoOProprio() {
        Usuario prof = Usuario.builder().id(20L).email("prof@teste.com").role(Role.PROFISSIONAL).salon(salonA).ativo(true).build();
        when(usuarioRepository.findByEmailAndAtivoTrue("prof@teste.com")).thenReturn(Optional.of(prof));

        var response = usuarioService.listar("prof@teste.com", null, null, 0, 10);
        var clientes = usuarioService.listar("prof@teste.com", Role.CLIENTE, null, 0, 10);

        assertThat(response.getContent()).extracting("id").containsExactly(20L);
        assertThat(clientes.getContent()).isEmpty();
        verify(usuarioRepository, never()).findBySalonId(any(), any());
        verify(usuarioRepository, never()).findBySalonIdAndRole(any(), any(), any());
    }

    @Test
    @DisplayName("Não move usuário do próprio salão para outro salão via salonId")
    void atualizarMoverParaOutroSalao() {
        UpdateUsuarioRequest request = UpdateUsuarioRequest.builder().salonId(2L).build();

        assertThatThrownBy(() -> usuarioService.atualizar(14L, request, EMAIL_ADMIN_A))
                .isInstanceOf(AccessDeniedException.class);
        verify(usuarioRepository, never()).save(any());
    }

    @Nested
    @DisplayName("Exclusão permanente com histórico financeiro (BUG-027)")
    class ExclusaoComHistoricoFinanceiro {

        private void semAgendamentos() {
            when(agendamentoRepository.countEnvolvendoUsuario(14L)).thenReturn(0L);
        }

        @Test
        @DisplayName("Quem registrou pagamento não é excluído")
        void registrouPagamento() {
            semAgendamentos();
            when(pagamentoRepository.existsByRegistradoPorId(14L)).thenReturn(true);

            assertThatThrownBy(() -> usuarioService.excluirPermanentemente(14L, EMAIL_ADMIN_A))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("pagamentos ou movimentações de caixa");
            verify(usuarioRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Quem abriu ou fechou caixa não é excluído")
        void operouCaixa() {
            semAgendamentos();
            when(caixaRepository.existsByAbertoPorIdOrFechadoPorId(14L, 14L)).thenReturn(true);

            assertThatThrownBy(() -> usuarioService.excluirPermanentemente(14L, EMAIL_ADMIN_A))
                    .isInstanceOf(BusinessException.class);
            verify(usuarioRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Quem lançou sangria, despesa ou estorno não é excluído")
        void lancouMovimentacao() {
            semAgendamentos();
            when(movimentacaoCaixaRepository.existsByRegistradoPorId(14L)).thenReturn(true);

            assertThatThrownBy(() -> usuarioService.excluirPermanentemente(14L, EMAIL_ADMIN_A))
                    .isInstanceOf(BusinessException.class);
            verify(usuarioRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Sem nenhum histórico continua podendo ser excluído")
        void semHistorico() {
            semAgendamentos();

            usuarioService.excluirPermanentemente(14L, EMAIL_ADMIN_A);

            verify(usuarioRepository).delete(recepA);
        }
    }

    @Nested
    @DisplayName("Troca de papel pelo admin (BUG-028)")
    class TrocaDePapel {

        private Usuario profUser;
        private Profissional prof;

        @BeforeEach
        void profissionalDoSalaoA() {
            profUser = Usuario.builder().id(20L).nome("Prof A").role(Role.PROFISSIONAL).ativo(true).build();
            prof = Profissional.builder().id(8L).usuario(profUser).salon(salonA).ativo(true).build();
            lenient().when(usuarioRepository.findById(20L)).thenReturn(Optional.of(profUser));
            lenient().when(profissionalRepository.findByUsuarioId(20L)).thenReturn(Optional.of(prof));
            lenient().when(salonRepository.findById(1L)).thenReturn(Optional.of(salonA));
            lenient().when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        }

        @Test
        @DisplayName("Profissional vira recepcionista: cadastro de profissional desativado e recepcionista no salão")
        void profissionalParaRecepcionista() {
            when(agendamentoRepository.countPendentesDoProfissional(eq(8L), any())).thenReturn(0L);

            usuarioService.atualizar(20L, UpdateUsuarioRequest.builder().role(Role.RECEPCIONISTA).build(), EMAIL_ADMIN_A);

            assertThat(profUser.getRole()).isEqualTo(Role.RECEPCIONISTA);
            assertThat(profUser.getSalon()).isEqualTo(salonA);
            assertThat(prof.isAtivo()).isFalse();
            verify(profissionalRepository).save(prof);
        }

        @Test
        @DisplayName("Com atendimentos agendados a troca é recusada e nada muda")
        void recusaComAtendimentosAgendados() {
            when(agendamentoRepository.countPendentesDoProfissional(eq(8L), any())).thenReturn(3L);

            assertThatThrownBy(() -> usuarioService.atualizar(20L,
                    UpdateUsuarioRequest.builder().role(Role.RECEPCIONISTA).build(), EMAIL_ADMIN_A))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("3 atendimento(s) agendado(s)");
            assertThat(profUser.getRole()).isEqualTo(Role.PROFISSIONAL);
            assertThat(prof.isAtivo()).isTrue();
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        @DisplayName("Volta a ser profissional: reativa o cadastro antigo em vez de criar outro")
        void voltaASerProfissional() {
            profUser.setRole(Role.RECEPCIONISTA);
            profUser.setSalon(salonA);
            prof.setAtivo(false);

            usuarioService.atualizar(20L, UpdateUsuarioRequest.builder().role(Role.PROFISSIONAL).build(), EMAIL_ADMIN_A);

            assertThat(profUser.getRole()).isEqualTo(Role.PROFISSIONAL);
            assertThat(prof.isAtivo()).isTrue();
            verify(profissionalRepository).save(prof);
            verify(profissionalRepository, never()).save(argThat(p -> p != prof));
        }
    }

    @Nested
    @DisplayName("Telefone do próprio perfil (BUG-031)")
    class TelefoneDoPerfil {

        @BeforeEach
        void recepcionistaLogada() {
            recepA.setEmail("recep.a@teste.com");
            recepA.setTelefone("11962035710");
            lenient().when(usuarioRepository.findByEmailAndAtivoTrue("recep.a@teste.com")).thenReturn(Optional.of(recepA));
            lenient().when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
        }

        @Test
        @DisplayName("Telefone de outra conta é recusado")
        void telefoneDeOutraConta() {
            when(usuarioRepository.telefoneEmUso("(11) 90000-1111", 14L)).thenReturn(true);

            assertThatThrownBy(() -> usuarioService.atualizarMeuPerfil("recep.a@teste.com",
                    UpdateMeuPerfilRequest.builder().telefone("(11) 90000-1111").build()))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("outra conta");
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        @DisplayName("O mesmo número com outra formatação é aceito sem conferir outras contas")
        void mesmoNumeroOutraFormatacao() {
            usuarioService.atualizarMeuPerfil("recep.a@teste.com",
                    UpdateMeuPerfilRequest.builder().telefone("(11) 96203-5710").build());

            assertThat(recepA.getTelefone()).isEqualTo("(11) 96203-5710");
            verify(usuarioRepository, never()).telefoneEmUso(any(), any());
        }
    }
}
