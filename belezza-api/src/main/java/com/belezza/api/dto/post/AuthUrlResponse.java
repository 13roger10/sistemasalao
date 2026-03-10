package com.belezza.api.dto.post;

import com.belezza.api.entity.PlataformaSocial;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthUrlResponse {

    private PlataformaSocial plataforma;
    private String authUrl;
    private String message;
}
