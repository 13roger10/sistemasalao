package com.belezza.api.dto.post;

import com.belezza.api.entity.PlataformaSocial;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostUpdateRequest {

    private String imagemUrl;

    private String thumbnailUrl;

    @Size(max = 2200, message = "Caption must not exceed 2200 characters")
    private String legenda;

    private List<String> hashtags;

    private List<PlataformaSocial> plataformas;
}
