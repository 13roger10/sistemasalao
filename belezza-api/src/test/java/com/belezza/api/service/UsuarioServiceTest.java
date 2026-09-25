package com.belezza.api.service;

import com.belezza.api.dto.user.CreateUsuarioRequest;
import com.belezza.api.dto.user.UpdateUsuarioRequest;
import com.belezza.api.entity.*;
import com.belezza.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private FidelidadeClienteRepository fidelidadeClienteRepository;
    @Mock private NotificacaoRepository notificacaoRepository;
    @Mock private PushSubscriptionRepository pushSubscriptionRepository;
    @Mock private BackupCodeRepository backupCodeRepository;

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
        lenient().when(salonRepository.findByAdminId(1L)).thenReturn(Optional.of(salonA));
        lenient().when(salonRepository.findByAdminId(14L)).thenReturn(Optional.empty());
        lenient().when(salonRepository.findByAdminId(41L)).thenReturn(Optional.empty());
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
        when(salonRepository.findByAdminId(1L)).thenReturn(Optional.empty());

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

    @Test
    @DisplayName("Não move usuário do próprio salão para outro salão via salonId")
    void atualizarMoverParaOutroSalao() {
        UpdateUsuarioRequest request = UpdateUsuarioRequest.builder().salonId(2L).build();

        assertThatThrownBy(() -> usuarioService.atualizar(14L, request, EMAIL_ADMIN_A))
                .isInstanceOf(AccessDeniedException.class);
        verify(usuarioRepository, never()).save(any());
    }
}
