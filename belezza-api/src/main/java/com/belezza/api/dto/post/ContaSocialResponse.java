package com.belezza.api.dto.post;

import com.belezza.api.entity.ContaSocial;
import com.belezza.api.entity.PlataformaSocial;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContaSocialResponse {

    private Long id;
    private Long salonId;
    private PlataformaSocial plataforma;
    private String accountId;
    private String accountName;
    private String accountImageUrl;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime tokenExpira;

    private boolean ativa;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime criadoEm;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime atualizadoEm;

    public static ContaSocialResponse fromEntity(ContaSocial conta) {
        return ContaSocialResponse.builder()
            .id(conta.getId())
            .salonId(conta.getSalon().getId())
            .plataforma(conta.getPlataforma())
            .accountId(conta.getAccountId())
            .accountName(conta.getAccountName())
            .accountImageUrl(conta.getAccountImageUrl())
            .tokenExpira(conta.getTokenExpira())
            .ativa(conta.isAtiva())
            .criadoEm(conta.getCriadoEm())
            .atualizadoEm(conta.getAtualizadoEm())
            .build();
    }
}
