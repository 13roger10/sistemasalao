package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.AgendamentoResponse;
import com.belezza.api.dto.agendamento.ReagendamentoRequest;
import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.cliente.ClienteResponse;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.security.TenantContext;
import com.belezza.api.service.AgendamentoService;
import com.belezza.api.service.ClienteService;
import com.belezza.api.service.PagamentoService;
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
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReceptionController - isolamento entre estabelecimentos")
class ReceptionControllerTest {

    @Mock private AgendamentoService agendamentoService;
    @Mock private ClienteService clienteService;
    @Mock private PagamentoService pagamentoService;
    @Spy private TenantIsolationService tenantIsolationService = new TenantIsolationService();

    @InjectMocks
    private ReceptionController controller;

    private final Usuario recepcionista = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).build();

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(1L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private ClienteRequest cliente(Long salonId) {
        return ClienteRequest.builder().name("Cliente").phone("11999990000").salonId(salonId).build();
    }

    @Test
    @DisplayName("Não lista nem cadastra clientes de outro salão")
    void clientesOutroSalao() {
        assertThatThrownBy(() -> controller.listarClientes(2L, null)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.criarCliente(cliente(2L))).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.listarAgendamentos(2L, null, recepcionista)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.listarPagamentos(2L, null, recepcionista)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(clienteService, agendamentoService, pagamentoService);
    }

    @Test
    @DisplayName("Cadastro sem salonId usa o salão de quem cadastra")
    void cadastroSemSalonId() {
        when(clienteService.criarComSalonId(any(), eq(1L))).thenReturn(new ClienteResponse());
        controller.criarCliente(cliente(null));
        verify(clienteService).criarComSalonId(any(), eq(1L));
    }

    @Test
    @DisplayName("Reagendamento pela recepção passa o operador para a verificação de salão")
    void reagendarPassaOperador() {
        ReagendamentoRequest request = ReagendamentoRequest.builder().novaDataHora(LocalDateTime.now().plusDays(1)).build();
        when(agendamentoService.reagendar(5L, request, false, false, recepcionista)).thenReturn(new AgendamentoResponse());
        controller.reagendarAgendamento(5L, request, recepcionista);
        verify(agendamentoService).reagendar(5L, request, false, false, recepcionista);
    }
}
