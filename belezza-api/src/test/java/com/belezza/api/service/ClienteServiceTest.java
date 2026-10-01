package com.belezza.api.service;

import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.cliente.ClienteResponse;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.FidelidadeClienteRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ClienteService - edição pela equipe e busca por telefone (BUG-019)")
class ClienteServiceTest {

    @Mock private ClienteRepository clienteRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private FidelidadeClienteRepository fidelidadeRepository;
    @Mock private SalonService salonService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private PagamentoRepository pagamentoRepository;
    @InjectMocks private ClienteService clienteService;

    private Salon salon;
    private Usuario usuario;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        salon = Salon.builder().id(1L).build();
        usuario = Usuario.builder().id(5L).nome("Maria Souza").email("maria@teste.com")
                .telefone("+55 (11) 98765-4321").role(Role.CLIENTE).build();
        cliente = Cliente.builder().id(10L).salon(salon).usuario(usuario).whatsapp("21 99888-7766").build();
    }

    private ClienteRequest pedido(String nome, String telefone, String email) {
        ClienteRequest r = new ClienteRequest();
        r.setName(nome);
        r.setPhone(telefone);
        r.setEmail(email);
        return r;
    }

    @Nested
    @DisplayName("Editar")
    class Editar {

        @Test
        @DisplayName("Equipe do mesmo salão (admin ou recepção) edita sem depender do e-mail do admin")
        void editaPeloSalaoDeQuemEdita() {
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));
            when(clienteRepository.save(any(Cliente.class))).thenReturn(cliente);
            when(fidelidadeRepository.findByClienteIdAndAtivoTrue(10L)).thenReturn(List.of());

            ClienteResponse r = clienteService.atualizar(10L, pedido("Maria S. Lima", "11 91234-5678", null), 1L);

            assertThat(r.getName()).isEqualTo("Maria S. Lima");
            assertThat(usuario.getTelefone()).isEqualTo("11 91234-5678");
            verify(salonService, never()).getSalonByAdminEmail(any());
        }

        @Test
        @DisplayName("Cliente de outro salão é negado")
        void outroSalao() {
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));

            assertThatThrownBy(() -> clienteService.atualizar(10L, pedido("X", "11912345678", null), 2L))
                    .isInstanceOf(AccessDeniedException.class);
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        @DisplayName("E-mail de outra conta é recusado com mensagem, em vez de erro 500")
        void emailDeOutraConta() {
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));
            when(usuarioRepository.existsByEmail("joao@teste.com")).thenReturn(true);

            assertThatThrownBy(() -> clienteService.atualizar(10L, pedido("Maria", "11912345678", "joao@teste.com"), 1L))
                    .isInstanceOf(com.belezza.api.exception.DuplicateResourceException.class)
                    .hasMessageContaining("Já existe uma conta com este email");
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        @DisplayName("Manter o mesmo e-mail não é tratado como duplicado")
        void mesmoEmail() {
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));
            when(clienteRepository.save(any(Cliente.class))).thenReturn(cliente);
            when(fidelidadeRepository.findByClienteIdAndAtivoTrue(10L)).thenReturn(List.of());

            clienteService.atualizar(10L, pedido("Maria", "11912345678", "MARIA@teste.com"), 1L);

            verify(usuarioRepository, never()).existsByEmail(any());
        }
    }

    @Nested
    @DisplayName("Excluir e reativar (BUG-026)")
    class ExcluirReativar {

        @BeforeEach
        void salaoDoAdmin() {
            usuario.setAtivo(true);
        }

        @Test
        @DisplayName("Excluir desativa o cadastro e o login de quem só é cliente deste salão")
        void excluiDesativaLogin() {
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));
            when(salonService.getSalonByAdminEmail("admin@teste.com")).thenReturn(salon);
            when(clienteRepository.existsByUsuarioIdAndAtivoTrueAndIdNot(5L, 10L)).thenReturn(false);

            clienteService.excluir(10L, "admin@teste.com");

            assertThat(cliente.isAtivo()).isFalse();
            assertThat(usuario.isAtivo()).isFalse();
            verify(usuarioRepository).save(usuario);
        }

        @Test
        @DisplayName("Cliente ativo em outro salão continua entrando no app")
        void clienteDeOutroSalaoMantemLogin() {
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));
            when(salonService.getSalonByAdminEmail("admin@teste.com")).thenReturn(salon);
            when(clienteRepository.existsByUsuarioIdAndAtivoTrueAndIdNot(5L, 10L)).thenReturn(true);

            clienteService.excluir(10L, "admin@teste.com");

            assertThat(cliente.isAtivo()).isFalse();
            assertThat(usuario.isAtivo()).isTrue();
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        @DisplayName("Conta da equipe cadastrada como cliente não perde o login")
        void equipeMantemLogin() {
            usuario.setRole(Role.RECEPCIONISTA);
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));
            when(salonService.getSalonByAdminEmail("admin@teste.com")).thenReturn(salon);

            clienteService.excluir(10L, "admin@teste.com");

            assertThat(usuario.isAtivo()).isTrue();
        }

        @Test
        @DisplayName("Cliente excluído não agenda sozinho pelo app")
        void excluidoNaoAgenda() {
            cliente.setAtivo(false);
            when(usuarioRepository.findByEmailAndAtivoTrue("maria@teste.com")).thenReturn(Optional.of(usuario));
            when(salonService.getSalonEntity(1L)).thenReturn(salon);
            when(clienteRepository.findByUsuarioIdAndSalonId(5L, 1L)).thenReturn(Optional.of(cliente));

            assertThatThrownBy(() -> clienteService.getOrCreateCliente(1L, "maria@teste.com"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("cadastro neste salão foi desativado");
            verify(clienteRepository, never()).save(any());
        }

        @Test
        @DisplayName("Filtro \"Inativos\" traz os clientes excluídos")
        void filtroInativos() {
            cliente.setAtivo(false);
            when(clienteRepository.findBySalonIdAndAtivoFalse(1L)).thenReturn(List.of(cliente));

            List<ClienteResponse> r = clienteService.listarPorSalon(1L, null, "inactive", null, false);

            assertThat(r).extracting(ClienteResponse::getStatus).containsExactly("inactive");
        }

        @Test
        @DisplayName("Reativar devolve o cadastro e o login")
        void reativa() {
            cliente.setAtivo(false);
            usuario.setAtivo(false);
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));
            when(clienteRepository.save(any(Cliente.class))).thenReturn(cliente);
            when(fidelidadeRepository.findByClienteIdAndAtivoTrue(10L)).thenReturn(List.of());

            clienteService.reativar(10L, 1L);

            assertThat(cliente.isAtivo()).isTrue();
            assertThat(usuario.isAtivo()).isTrue();
        }

        @Test
        @DisplayName("Reativar cliente de outro salão é negado")
        void reativarOutroSalao() {
            cliente.setAtivo(false);
            when(clienteRepository.findById(10L)).thenReturn(Optional.of(cliente));

            assertThatThrownBy(() -> clienteService.reativar(10L, 2L)).isInstanceOf(AccessDeniedException.class);
        }
    }

    @Nested
    @DisplayName("Buscar por telefone")
    class Buscar {

        @BeforeEach
        void lista() {
            when(clienteRepository.findBySalonIdAndAtivoTrue(1L)).thenReturn(List.of(cliente));
        }

        @Test
        @DisplayName("Encontra pelo telefone digitado em qualquer formato")
        void formatosDiferentes() {
            assertThat(clienteService.listarPorSalon(1L, "11987654321", null, null, false)).hasSize(1);
            assertThat(clienteService.listarPorSalon(1L, "(11) 98765-4321", null, null, false)).hasSize(1);
            assertThat(clienteService.listarPorSalon(1L, "4321", null, null, false)).hasSize(1);
        }

        @Test
        @DisplayName("Encontra pelo WhatsApp")
        void porWhatsApp() {
            assertThat(clienteService.listarPorSalon(1L, "99888", null, null, false)).hasSize(1);
        }

        @Test
        @DisplayName("Nome sem acentos e em maiúsculas encontra o cliente acentuado (BUG-040)")
        void nomeSemAcentos() {
            cliente.getUsuario().setNome("José Ção");

            assertThat(clienteService.listarPorSalon(1L, "jose cao", null, null, false)).hasSize(1);
            assertThat(clienteService.listarPorSalon(1L, "JOSÉ", null, null, true)).hasSize(1);
            assertThat(clienteService.listarPorSalon(1L, "joana", null, null, false)).isEmpty();
        }

        @Test
        @DisplayName("Número que não bate não traz o cliente")
        void naoBate() {
            assertThat(clienteService.listarPorSalon(1L, "11900000000", null, null, false)).isEmpty();
        }

        @Test
        @DisplayName("Profissional (dados restritos) busca só pelo nome")
        void profissionalSoPorNome() {
            assertThat(clienteService.listarPorSalon(1L, "98765", null, null, true)).isEmpty();
            assertThat(clienteService.listarPorSalon(1L, "maria", null, null, true)).hasSize(1);
        }
    }

    @Nested
    @DisplayName("Várias unidades")
    class Unidades {

        @Test
        @DisplayName("Admin não cadastra cliente em outra unidade (nem no salão de outro dono)")
        void adminNaoCadastraEmOutraUnidade() {
            when(salonService.getSalonByAdminEmail("dono@teste.com")).thenReturn(Salon.builder().id(3L).build());
            ClienteRequest r = pedido("Paulo", "61 99432-9899", null);
            r.setSalonId(1L);

            assertThatThrownBy(() -> clienteService.criar(r, "dono@teste.com"))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("unidade em que você está trabalhando");
            verify(clienteRepository, never()).save(any());
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        @DisplayName("Salões do cliente: só cadastros e salões ativos, o mais recente primeiro")
        void saloesDoCliente() {
            Salon sede = Salon.builder().id(1L).nome("Sede").ativo(true).build();
            Salon filial = Salon.builder().id(3L).nome("Filial").ativo(true).build();
            Salon fechada = Salon.builder().id(4L).nome("Fechada").ativo(false).build();
            java.time.LocalDateTime agora = java.time.LocalDateTime.now();
            Cliente naSede = Cliente.builder().id(1L).salon(sede).usuario(usuario).ativo(true).criadoEm(agora.minusDays(2)).build();
            Cliente naFilial = Cliente.builder().id(2L).salon(filial).usuario(usuario).ativo(true).criadoEm(agora.minusDays(1)).build();
            Cliente excluido = Cliente.builder().id(3L).salon(sede).usuario(usuario).ativo(false).criadoEm(agora).build();
            Cliente naFechada = Cliente.builder().id(4L).salon(fechada).usuario(usuario).ativo(true).criadoEm(agora).build();
            when(clienteRepository.findByUsuarioId(5L)).thenReturn(List.of(naSede, excluido, naFechada, naFilial));

            assertThat(clienteService.saloesDoCliente(5L))
                    .extracting(m -> m.get("id"))
                    .containsExactly(3L, 1L);
        }
    }
}
