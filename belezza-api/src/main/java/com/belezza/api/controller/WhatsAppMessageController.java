package com.belezza.api.controller;

import com.belezza.api.dto.whatsapp.WhatsAppMessageResponse;
import com.belezza.api.dto.whatsapp.WhatsAppSendRequest;
import com.belezza.api.entity.WhatsAppMessage;
import com.belezza.api.entity.WhatsAppMessageStatus;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.WhatsAppMessageRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.security.annotation.ProfissionalOrAdmin;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for WhatsApp message management and statistics.
 */
@RestController
@RequestMapping("/api/whatsapp/messages")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "WhatsApp Messages", description = "Gerenciamento de mensagens WhatsApp")
public class WhatsAppMessageController {

    private final WhatsAppMessageRepository messageRepository;
    private final WhatsAppService whatsAppService;

    /**
     * SEC-011: isolamento entre estabelecimentos. Estes endpoints faziam consultas por
     * salonId/telefone/agendamento/id sem validar o tenant, permitindo que a equipe de um
     * salão lesse o histórico de mensagens (PII) de outro salão. Usamos o salonId do JWT
     * (TenantContext) como fonte de verdade.
     */
    private void assertTenant(Long salonId) {
        Long tenant = TenantContext.getCurrentTenant();
        if (tenant == null || salonId == null || !tenant.equals(salonId)) {
            throw new AccessDeniedException("Acesso negado: recurso pertence a outro estabelecimento");
        }
    }

    /** Verdadeiro quando a mensagem pertence ao estabelecimento do solicitante (JWT). */
    private boolean noTenantAtual(WhatsAppMessage m) {
        Long tenant = TenantContext.getCurrentTenant();
        return tenant != null && m.getSalon() != null && tenant.equals(m.getSalon().getId());
    }

    @GetMapping("/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar mensagens por salão", description = "Lista todas as mensagens WhatsApp de um salão com filtro opcional por status")
    public ResponseEntity<Page<WhatsAppMessageResponse>> listarPorSalon(
            @PathVariable Long salonId,
            @RequestParam(required = false) WhatsAppMessageStatus status,
            @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable) {
        assertTenant(salonId);

        Page<WhatsAppMessage> messages;
        if (status != null) {
            messages = messageRepository.findBySalonIdAndStatus(salonId, status, pageable);
        } else {
            messages = messageRepository.findBySalonIdAndStatus(salonId, null, pageable);
        }

        return ResponseEntity.ok(messages.map(WhatsAppMessageResponse::fromEntity));
    }

    @GetMapping("/agendamento/{agendamentoId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar mensagens por agendamento", description = "Lista todas as mensagens enviadas para um agendamento específico")
    public ResponseEntity<List<WhatsAppMessageResponse>> listarPorAgendamento(@PathVariable Long agendamentoId) {
        // SEC-011: só retorna mensagens do próprio estabelecimento.
        List<WhatsAppMessage> messages = messageRepository.findByAgendamentoIdOrderByCriadoEmDesc(agendamentoId);
        return ResponseEntity.ok(messages.stream()
                .filter(this::noTenantAtual)
                .map(WhatsAppMessageResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/telefone/{telefone}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar mensagens por telefone", description = "Lista todas as mensagens enviadas para um número de telefone")
    public ResponseEntity<List<WhatsAppMessageResponse>> listarPorTelefone(@PathVariable String telefone) {
        // SEC-011: um telefone pode existir em vários salões — retorna só o do solicitante.
        List<WhatsAppMessage> messages = messageRepository.findByTelefoneOrderByCriadoEmDesc(telefone);
        return ResponseEntity.ok(messages.stream()
                .filter(this::noTenantAtual)
                .map(WhatsAppMessageResponse::fromEntity)
                .collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @ProfissionalOrAdmin
    @Operation(summary = "Buscar mensagem por ID", description = "Busca uma mensagem específica por ID")
    @SuppressWarnings("null")
    public ResponseEntity<WhatsAppMessageResponse> buscarPorId(@PathVariable Long id) {
        return messageRepository.findById(id)
                // SEC-011: só expõe a mensagem se pertencer ao estabelecimento do solicitante.
                .filter(this::noTenantAtual)
                .map(WhatsAppMessageResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/send")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROFISSIONAL', 'RECEPCIONISTA')")
    @Operation(summary = "Enviar mensagem", description = "Envia uma mensagem WhatsApp direta para um número")
    public ResponseEntity<Map<String, String>> enviarMensagem(@Valid @RequestBody WhatsAppSendRequest request) {
        log.info("Enviando mensagem WhatsApp para {}", request.getTelefone());

        String messageId = whatsAppService.enviarMensagemDireta(request.getTelefone(), request.getMensagem());

        if (messageId != null) {
            return ResponseEntity.ok(Map.of(
                "message", "Mensagem enviada com sucesso",
                "messageId", messageId
            ));
        } else {
            return ResponseEntity.internalServerError().body(Map.of(
                "message", "Falha ao enviar mensagem"
            ));
        }
    }

    @GetMapping("/stats/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Estatísticas de mensagens", description = "Retorna estatísticas de mensagens WhatsApp de um salão")
    public ResponseEntity<Map<String, Object>> estatisticas(
            @PathVariable Long salonId,
            @RequestParam(defaultValue = "7") int dias) {
        assertTenant(salonId); // SEC-011

        LocalDateTime start = LocalDateTime.now().minusDays(dias);
        LocalDateTime end = LocalDateTime.now();

        long sent = messageRepository.countBySalonAndStatusBetween(salonId, WhatsAppMessageStatus.SENT, start, end);
        long delivered = messageRepository.countBySalonAndStatusBetween(salonId, WhatsAppMessageStatus.DELIVERED, start, end);
        long read = messageRepository.countBySalonAndStatusBetween(salonId, WhatsAppMessageStatus.READ, start, end);
        long failed = messageRepository.countBySalonAndStatusBetween(salonId, WhatsAppMessageStatus.FAILED, start, end);

        long total = sent + delivered + read + failed;
        double deliveryRate = total > 0 ? (double) (delivered + read) / total * 100 : 0;
        double readRate = (delivered + read) > 0 ? (double) read / (delivered + read) * 100 : 0;

        return ResponseEntity.ok(Map.of(
            "periodo", dias + " dias",
            "totalEnviadas", total,
            "enviadas", sent,
            "entregues", delivered,
            "lidas", read,
            "falhas", failed,
            "taxaEntrega", String.format("%.1f%%", deliveryRate),
            "taxaLeitura", String.format("%.1f%%", readRate)
        ));
    }

    @GetMapping("/failed/salon/{salonId}")
    @ProfissionalOrAdmin
    @Operation(summary = "Listar mensagens com falha", description = "Lista mensagens com falha que podem ser reenviadas")
    public ResponseEntity<List<WhatsAppMessageResponse>> listarFalhas(@PathVariable Long salonId) {
        assertTenant(salonId); // SEC-011
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<WhatsAppMessage> messages = messageRepository.findRetryableFailed(since);

        // Filter by salon
        List<WhatsAppMessageResponse> filtered = messages.stream()
                .filter(m -> m.getSalon() != null && m.getSalon().getId().equals(salonId))
                .map(WhatsAppMessageResponse::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(filtered);
    }
}
