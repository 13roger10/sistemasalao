package com.belezza.api.controller;

import com.belezza.api.dto.comissao.ConfirmarPagamentoRequest;
import com.belezza.api.dto.comissao.GerarPagamentoRequest;
import com.belezza.api.dto.comissao.PagamentoProfissionalResponse;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.service.PagamentoProfissionalService;
import com.belezza.api.service.TenantIsolationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PagamentoProfissionalController - isolamento entre estabelecimentos")
class PagamentoProfissionalControllerTest {

    @Mock private PagamentoProfissionalService service;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ProfissionalRepository profissionalRepository;
    @Spy private TenantIsolationService tenantIsolationService = new TenantIsolationService();

    @InjectMocks
    private PagamentoProfissionalController controller;

    private final UserDetails admin = new User("admin@a.com", "x", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    private final UserDetails prof = new User("prof@a.com", "x", List.of(new SimpleGrantedAuthority("ROLE_PROFISSIONAL")));

    @BeforeEach
    void setUp() {
        Salon salonA = Salon.builder().id(1L).build();
        Salon salonB = Salon.builder().id(2L).build();
        lenient().when(profissionalRepository.findById(10L)).thenReturn(Optional.of(Profissional.builder().id(10L).salon(salonB).build()));
        lenient().when(profissionalRepository.findById(6L)).thenReturn(Optional.of(Profissional.builder().id(6L).salon(salonA).build()));
        lenient().when(usuarioRepository.findByEmailAndAtivoTrue("prof@a.com")).thenReturn(Optional.of(Usuario.builder().id(20L).build()));
        lenient().when(profissionalRepository.findByUsuarioId(20L)).thenReturn(Optional.of(Profissional.builder().id(6L).salon(salonA).build()));
        lenient().when(service.buscarPorId(100L)).thenReturn(PagamentoProfissionalResponse.builder().id(100L).salonId(2L).profissionalId(10L).build());
        lenient().when(service.buscarPorId(200L)).thenReturn(PagamentoProfissionalResponse.builder().id(200L).salonId(1L).profissionalId(7L).build());
        TenantContext.setCurrentTenant(1L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Admin não opera pagamentos de outro salão")
    void adminOutroSalao() {
        assertThatThrownBy(() -> controller.gerarPagamento(2L, new GerarPagamentoRequest())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.listarPorSalon(2L, null, Pageable.unpaged())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.listarPorProfissional(10L, Pageable.unpaged(), admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.confirmarPagamento(100L, new ConfirmarPagamentoRequest(), admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.cancelarPagamento(100L, admin)).isInstanceOf(AccessDeniedException.class);
        verify(service, never()).gerarPagamento(any(), any());
        verify(service, never()).confirmarPagamento(any(), any());
        verify(service, never()).cancelarPagamento(any());
    }

    @Test
    @DisplayName("Admin cancela pagamento do próprio salão")
    void adminMesmoSalao() {
        controller.cancelarPagamento(200L, admin);
        verify(service).cancelarPagamento(200L);
    }

    @Test
    @DisplayName("Profissional não vê pagamento de colega do mesmo salão")
    void profissionalColega() {
        assertThatThrownBy(() -> controller.buscarPorId(200L, prof)).isInstanceOf(AccessDeniedException.class);
        controller.listarPorProfissional(6L, Pageable.unpaged(), prof);
        verify(service).listarPorProfissional(eq(6L), any());
    }
}
