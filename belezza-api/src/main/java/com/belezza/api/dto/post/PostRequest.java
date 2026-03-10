package com.belezza.api.dto.post;

import com.belezza.api.entity.PlataformaSocial;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostRequest {

    private String legenda;

    @Size(max = 30, message = "Máximo de 30 hashtags")
    private List<String> hashtags;

    private List<PlataformaSocial> plataformas;

    private LocalDateTime agendadoPara;
}
