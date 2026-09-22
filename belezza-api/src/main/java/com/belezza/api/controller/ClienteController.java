package com.belezza.api.controller;

import com.belezza.api.dto.cliente.ClienteHistoryResponse;
import com.belezza.api.dto.cliente.ClienteRequest;
import com.belezza.api.dto.cliente.ClienteResponse;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.ClienteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Clientes", description = "Gerenciamento de clientes do salão")
public class ClienteController {

    private final ClienteService clienteService;

    private boolean shouldRestrictSensitiveData(UserDetails userDetails) {
        if (userDetails == null) return true;
        boolean isAdmin = userDetails.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .anyMatch(auth -> auth.equals("ROLE_ADMIN"));
        return !isAdmin;
    }

    @PostMapping
    @Operation(summary = "Criar cliente", description = "Cria um novo cliente no salão. RECEPCIONISTA usa salonId do request.")
    public ResponseEntity<ClienteResponse> criar(
            @Valid @RequestBody ClienteRequest request,
            @AuthenticationPrincipal Usuario operador) {
        ClienteResponse response;
        if (operador.getRole() == Role.RECEPCIONISTA) {
            Long salonId = request.getSalonId();
            if (salonId == null) {
                return ResponseEntity.badRequest().build();
            }
            response = clienteService.criarComSalonId(request, salonId);
        } else {
            response = clienteService.criar(request, operador.getUsername());
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar cliente", description = "Busca um cliente por ID")
    public ResponseEntity<ClienteResponse> buscarPorId(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        ClienteResponse response = clienteService.buscarPorId(id, restrictData);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/salon/{salonId}/recalcular-estatisticas")
    @AdminOnly
    @Operation(summary = "Recalcular estatísticas", description = "Recalcula totalGasto/ticketMedio/visitas de todos os clientes a partir dos pagamentos reais")
    public ResponseEntity<Map<String, Object>> recalcularEstatisticas(@PathVariable Long salonId) {
        int atualizados = clienteService.recalcularEstatisticas(salonId);
        return ResponseEntity.ok(Map.of("clientesAtualizados", atualizados));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Histórico do cliente", description = "Retorna o histórico de atendimentos e gastos reais do cliente")
    public ResponseEntity<ClienteHistoryResponse> buscarHistorico(@PathVariable Long id) {
        ClienteHistoryResponse response = clienteService.buscarHistorico(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/salon/{salonId}")
    @Operation(summary = "Listar clientes do salão", description = "Lista todos os clientes ativos de um salão")
    public ResponseEntity<List<ClienteResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String loyaltyLevel,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean restrictData = shouldRestrictSensitiveData(userDetails);
        List<ClienteResponse> response = clienteService.listarPorSalon(salonId, search, status, loyaltyLevel, restrictData);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Atualizar cliente", description = "Atualiza os dados de um cliente")
    public ResponseEntity<ClienteResponse> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ClienteRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ClienteResponse response = clienteService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @AdminOnly
    @Operation(summary = "Excluir cliente", description = "Remove um cliente (soft delete)")
    public ResponseEntity<Map<String, String>> excluir(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        clienteService.excluir(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Cliente excluído com sucesso"));
    }

    @PatchMapping("/{id}/observacoes")
    @AdminOnly
    @Operation(summary = "Atualizar observações", description = "Atualiza observações de um cliente")
    public ResponseEntity<ClienteResponse> atualizarObservacoes(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        ClienteResponse response = clienteService.atualizarObservacoes(
                id, body.get("observacoes"), userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/bloquear")
    @AdminOnly
    @Operation(summary = "Bloquear cliente", description = "Bloqueia um cliente de fazer agendamentos")
    public ResponseEntity<Map<String, String>> bloquear(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        clienteService.bloquear(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Cliente bloqueado com sucesso"));
    }

    @PostMapping("/{id}/desbloquear")
    @AdminOnly
    @Operation(summary = "Desbloquear cliente", description = "Desbloqueia um cliente")
    public ResponseEntity<Map<String, String>> desbloquear(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        clienteService.desbloquear(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Cliente desbloqueado com sucesso"));
    }
}
