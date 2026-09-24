package com.belezza.api.service;

import com.belezza.api.dto.apikey.ApiKeyCreatedResponse;
import com.belezza.api.dto.apikey.ApiKeyRequest;
import com.belezza.api.dto.apikey.ApiKeyResponse;
import com.belezza.api.entity.ApiKey;
import com.belezza.api.entity.Salon;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ApiKeyRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApiKeyService {

    private static final String KEY_PREFIX = "bz_live_";
    private static final List<String> VALID_SCOPES = List.of("read", "write");

    private final ApiKeyRepository apiKeyRepository;
    private final SalonRepository salonRepository;

    // ── Public API lookup (called from ApiKeyAuthFilter) ─────────────────────

    @Transactional
    public Optional<ApiKey> findAndValidate(String rawKey) {
        String hash = sha256(rawKey);
        return apiKeyRepository.findByKeyHash(hash)
            .filter(ApiKey::isValid)
            .map(k -> {
                apiKeyRepository.updateUltimoUso(k.getId(), LocalDateTime.now());
                return k;
            });
    }

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    /**
     * SEC-005: garante que o ADMIN autenticado só gerencia API Keys do PRÓPRIO
     * estabelecimento. O salonId do JWT (TenantContext) precisa existir e coincidir
     * com o salonId do path. Sem isto, qualquer usuário autenticado listava/criava/
     * revogava chaves de qualquer salão apenas trocando o ID na URL.
     */
    private void assertTenant(Long salonId) {
        Long tenant = TenantContext.getCurrentTenant();
        if (tenant == null || !tenant.equals(salonId)) {
            throw new AccessDeniedException("Acesso negado: recurso pertence a outro estabelecimento");
        }
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> listar(Long salonId) {
        assertTenant(salonId);
        return apiKeyRepository.findBySalonIdOrderByCriadoEmDesc(salonId)
            .stream()
            .map(ApiKeyResponse::from)
            .toList();
    }

    @Transactional
    @SuppressWarnings("null")
    public ApiKeyCreatedResponse criar(Long salonId, ApiKeyRequest req) {
        assertTenant(salonId);
        Salon salon = salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salão não encontrado: " + salonId));

        List<String> escopos = resolveScopes(req.escopos());
        String rawKey = KEY_PREFIX + UUID.randomUUID().toString().replace("-", "");
        String prefix = rawKey.substring(0, Math.min(rawKey.length(), 16));
        String hash   = sha256(rawKey);

        ApiKey saved = apiKeyRepository.save(ApiKey.builder()
            .salon(salon)
            .nome(req.nome())
            .keyPrefix(prefix)
            .keyHash(hash)
            .escopos(String.join(",", escopos))
            .expiraEm(req.expiraEm())
            .build());

        log.info("API key criada: id={}, salonId={}, nome={}", saved.getId(), salonId, saved.getNome());

        return new ApiKeyCreatedResponse(
            saved.getId(),
            saved.getNome(),
            rawKey,
            saved.getKeyPrefix(),
            escopos,
            saved.getExpiraEm(),
            saved.getCriadoEm()
        );
    }

    @Transactional
    @SuppressWarnings("null")
    public void revogar(Long salonId, Long keyId) {
        assertTenant(salonId);
        ApiKey key = apiKeyRepository.findById(keyId)
            .filter(k -> k.getSalon().getId().equals(salonId))
            .orElseThrow(() -> new ResourceNotFoundException("API Key não encontrada: " + keyId));
        key.setAtivo(false);
        apiKeyRepository.save(key);
        log.info("API key revogada: id={}, salonId={}", keyId, salonId);
    }

    @Transactional
    @SuppressWarnings("null")
    public void excluir(Long salonId, Long keyId) {
        assertTenant(salonId);
        ApiKey key = apiKeyRepository.findById(keyId)
            .filter(k -> k.getSalon().getId().equals(salonId))
            .orElseThrow(() -> new ResourceNotFoundException("API Key não encontrada: " + keyId));
        apiKeyRepository.delete(key);
        log.info("API key excluída: id={}, salonId={}", keyId, salonId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private List<String> resolveScopes(List<String> requested) {
        if (requested == null || requested.isEmpty()) return List.of("read");
        return requested.stream()
            .filter(VALID_SCOPES::contains)
            .distinct()
            .toList();
    }

    public static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
