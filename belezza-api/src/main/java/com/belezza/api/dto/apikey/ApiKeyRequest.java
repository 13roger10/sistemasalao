package com.belezza.api.dto.apikey;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public record ApiKeyRequest(
    @NotBlank @Size(max = 100) String nome,
    List<String> escopos,        // ["read"] or ["read","write"] — defaults to ["read"]
    LocalDateTime expiraEm       // null = never expires
) {}
