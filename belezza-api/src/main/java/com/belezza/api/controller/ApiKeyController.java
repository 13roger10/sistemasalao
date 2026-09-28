package com.belezza.api.controller;

import com.belezza.api.dto.apikey.ApiKeyCreatedResponse;
import com.belezza.api.dto.apikey.ApiKeyRequest;
import com.belezza.api.dto.apikey.ApiKeyResponse;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.ApiKeyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin endpoints for managing API Keys.
 * Requires ROLE_ADMIN or authenticated salon owner.
 */
@RestController
@RequestMapping("/api/salons/{salonId}/api-keys")
@RequiredArgsConstructor
@Tag(name = "API Keys", description = "Gerenciamento de chaves de API para integrações")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    @GetMapping
    @AdminOnly
    @Operation(summary = "Listar API Keys", description = "Lista todas as API Keys do salão")
    public ResponseEntity<List<ApiKeyResponse>> listar(@PathVariable Long salonId) {
        return ResponseEntity.ok(apiKeyService.listar(salonId));
    }

    @PostMapping
    @AdminOnly
    @Operation(
        summary = "Criar API Key",
        description = "Gera uma nova API Key. O valor completo é retornado apenas nesta resposta."
    )
    public ResponseEntity<ApiKeyCreatedResponse> criar(
            @PathVariable Long salonId,
            @Valid @RequestBody ApiKeyRequest request) {
        ApiKeyCreatedResponse created = apiKeyService.criar(salonId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{keyId}/revogar")
    @AdminOnly
    @Operation(summary = "Revogar API Key", description = "Desativa a API Key sem excluí-la")
    public ResponseEntity<Void> revogar(
            @PathVariable Long salonId,
            @PathVariable Long keyId) {
        apiKeyService.revogar(salonId, keyId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{keyId}")
    @AdminOnly
    @Operation(summary = "Excluir API Key", description = "Remove permanentemente a API Key")
    public ResponseEntity<Void> excluir(
            @PathVariable Long salonId,
            @PathVariable Long keyId) {
        apiKeyService.excluir(salonId, keyId);
        return ResponseEntity.noContent().build();
    }
}
