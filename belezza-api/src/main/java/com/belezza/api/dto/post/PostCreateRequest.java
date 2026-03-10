package com.belezza.api.dto.post;

import com.belezza.api.entity.PlataformaSocial;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
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
public class PostCreateRequest {

    @NotBlank(message = "Image URL is required")
    private String imagemUrl;

    private String imagemOriginalUrl;

    private String thumbnailUrl;

    @Size(max = 2200, message = "Caption must not exceed 2200 characters")
    private String legenda;

    private List<String> hashtags;

    @NotEmpty(message = "At least one platform must be selected")
    private List<PlataformaSocial> plataformas;
}
