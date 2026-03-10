package com.belezza.api.controller;

import com.belezza.api.dto.notificacao.NotificacaoResponse;
import com.belezza.api.dto.notificacao.NotificacoesResumoResponse;
import com.belezza.api.dto.notificacao.PushSubscriptionRequest;
import com.belezza.api.service.NotificacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notificacoes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notificações", description = "Gerenciamento de notificações e push notifications")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;

    @GetMapping
    @Operation(summary = "Listar notificações", description = "Lista todas as notificações do usuário")
    public ResponseEntity<Page<NotificacaoResponse>> listar(
            @PageableDefault(size = 20) Pageable pageable,
            Authentication auth) {
        Page<NotificacaoResponse> notificacoes = notificacaoService.listarNotificacoes(auth.getName(), pageable);
        return ResponseEntity.ok(notificacoes);
    }

    @GetMapping("/resumo")
    @Operation(summary = "Resumo de notificações", description = "Retorna resumo com contagem de não lidas e últimas notificações")
    public ResponseEntity<NotificacoesResumoResponse> getResumo(Authentication auth) {
        NotificacoesResumoResponse resumo = notificacaoService.getResumo(auth.getName());
        return ResponseEntity.ok(resumo);
    }

    @PostMapping("/{id}/lida")
    @Operation(summary = "Marcar como lida", description = "Marca uma notificação como lida")
    public ResponseEntity<Void> marcarComoLida(
            @PathVariable Long id,
            Authentication auth) {
        notificacaoService.marcarComoLida(id, auth.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/lidas")
    @Operation(summary = "Marcar todas como lidas", description = "Marca todas as notificações como lidas")
    public ResponseEntity<Void> marcarTodasComoLidas(Authentication auth) {
        notificacaoService.marcarTodasComoLidas(auth.getName());
        return ResponseEntity.ok().build();
    }

    // ==================== PUSH SUBSCRIPTION ====================

    @PostMapping("/push/subscribe")
    @Operation(summary = "Registrar push subscription", description = "Registra um dispositivo para receber push notifications")
    public ResponseEntity<Void> subscribe(
            @Valid @RequestBody PushSubscriptionRequest request,
            Authentication auth) {
        notificacaoService.registrarSubscription(request, auth.getName());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/push/unsubscribe")
    @Operation(summary = "Remover push subscription", description = "Remove um dispositivo das push notifications")
    public ResponseEntity<Void> unsubscribe(
            @RequestParam String endpoint,
            Authentication auth) {
        notificacaoService.removerSubscription(endpoint, auth.getName());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/push/vapid-key")
    @Operation(summary = "Obter VAPID public key", description = "Retorna a chave pública VAPID para configurar push no frontend")
    public ResponseEntity<Map<String, String>> getVapidKey() {
        String key = notificacaoService.getVapidPublicKey();
        return ResponseEntity.ok(Map.of("publicKey", key != null ? key : ""));
    }
}
