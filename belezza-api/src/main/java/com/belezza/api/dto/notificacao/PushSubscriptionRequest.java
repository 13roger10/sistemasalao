package com.belezza.api.dto.notificacao;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushSubscriptionRequest {

    @NotBlank(message = "Endpoint é obrigatório")
    private String endpoint;

    @NotBlank(message = "P256dh key é obrigatória")
    private String p256dhKey;

    @NotBlank(message = "Auth key é obrigatória")
    private String authKey;

    private String userAgent;
    private String deviceType;
}
