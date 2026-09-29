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
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Já existe uma conta com este e-mail");
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
}
