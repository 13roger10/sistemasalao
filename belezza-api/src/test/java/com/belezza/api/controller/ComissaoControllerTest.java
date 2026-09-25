package com.belezza.api.controller;

import com.belezza.api.dto.comissao.ComissaoResponse;
import com.belezza.api.dto.comissao.ConfiguracaoComissaoRequest;
import com.belezza.api.entity.*;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.service.ComissaoService;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ComissaoController - isolamento entre estabelecimentos")
class ComissaoControllerTest {

    @Mock private ComissaoService comissaoService;
    @Spy private TenantIsolationService tenantIsolationService = new TenantIsolationService();
    @Mock private ProfissionalRepository profissionalRepository;

    @InjectMocks
    private ComissaoController controller;

    private final Usuario admin = Usuario.builder().id(1L).role(Role.ADMIN).build();
    private final Usuario usuarioProf = Usuario.builder().id(20L).role(Role.PROFISSIONAL).build();
    private final ConfiguracaoComissaoRequest config = ConfiguracaoComissaoRequest.builder()
            .tipoComissao(TipoComissao.PORCENTAGEM).valorComissao(new BigDecimal("99")).build();

    @BeforeEach
    void setUp() {
        Salon salonA = Salon.builder().id(1L).build();
        Salon salonB = Salon.builder().id(2L).build();
        lenient().when(profissionalRepository.findById(6L)).thenReturn(Optional.of(Profissional.builder().id(6L).salon(salonA).build()));
        lenient().when(profissionalRepository.findById(7L)).thenReturn(Optional.of(Profissional.builder().id(7L).salon(salonA).build()));
        lenient().when(profissionalRepository.findById(10L)).thenReturn(Optional.of(Profissional.builder().id(10L).salon(salonB).build()));
        lenient().when(profissionalRepository.findByUsuarioId(20L)).thenReturn(Optional.of(Profissional.builder().id(6L).salon(salonA).build()));
        TenantContext.setCurrentTenant(1L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Admin não lê nem configura comissão de profissional de outro salão")
    void adminOutroSalao() {
        assertThatThrownBy(() -> controller.listarPorProfissional(10L, null, Pageable.unpaged(), admin))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.totalPendentes(10L, admin)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.configurarComissao(10L, config, admin)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(comissaoService);
    }

    @Test
    @DisplayName("Admin lê e configura comissão de profissional do próprio salão")
    void adminMesmoSalao() {
        controller.listarPorProfissional(7L, null, Pageable.unpaged(), admin);
        controller.configurarComissao(7L, config, admin);

        verify(comissaoService).listarPorProfissional(eq(7L), any());
        verify(comissaoService).configurarComissaoProfissional(7L, config);
    }

    @Test
    @DisplayName("Profissional vê só as próprias comissões")
    void profissional() {
        controller.totalPendentes(6L, usuarioProf);
        assertThatThrownBy(() -> controller.totalPendentes(7L, usuarioProf)).isInstanceOf(AccessDeniedException.class);
        verify(comissaoService).totalComissoesPendentes(6L);
    }

    @Test
    @DisplayName("Comissão de outro salão por id é negada")
    void buscarPorIdOutroSalao() {
        when(comissaoService.buscarPorId(5L)).thenReturn(ComissaoResponse.builder().id(5L).salonId(2L).profissionalId(10L).build());
        assertThatThrownBy(() -> controller.buscarPorId(5L, admin)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Admin sem salão no token não acessa nada")
    void semTenant() {
        TenantContext.clear();
        assertThatThrownBy(() -> controller.listarPorSalon(1L, Pageable.unpaged())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.resumoPorSalon(1L, LocalDate.now(), LocalDate.now())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.configurarComissao(7L, config, admin)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(comissaoService);
    }
}
