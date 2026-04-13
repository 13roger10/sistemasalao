package com.belezza.api.dto.apikey;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Returned ONCE on creation — contains the full raw key.
 * The caller must copy it; it will never be retrievable again.
 */
public record ApiKeyCreatedResponse(
    Long id,
    String nome,
    String rawKey,         // Full key shown exactly once: "bz_live_<uuid>"
    String keyPrefix,
    List<String> escopos,
    LocalDateTime expiraEm,
    LocalDateTime criadoEm
) {}
