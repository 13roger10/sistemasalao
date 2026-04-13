package com.belezza.api.dto.apikey;

import com.belezza.api.entity.ApiKey;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Safe representation of an API Key — never exposes the full raw key or hash.
 */
public record ApiKeyResponse(
    Long id,
    String nome,
    String keyPrefix,      // e.g. "bz_live_a" — safe to display
    List<String> escopos,
    boolean ativo,
    LocalDateTime ultimoUsoEm,
    LocalDateTime expiraEm,
    LocalDateTime criadoEm
) {
    public static ApiKeyResponse from(ApiKey k) {
        return new ApiKeyResponse(
            k.getId(),
            k.getNome(),
            k.getKeyPrefix() + "••••••••••••••••••••••",
            k.escoposList(),
            Boolean.TRUE.equals(k.getAtivo()),
            k.getUltimoUsoEm(),
            k.getExpiraEm(),
            k.getCriadoEm()
        );
    }
}
