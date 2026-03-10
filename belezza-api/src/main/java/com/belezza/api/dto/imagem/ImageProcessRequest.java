package com.belezza.api.dto.imagem;

import com.belezza.api.entity.StyleType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageProcessRequest {

    @Min(1)
    @Max(100)
    private Integer blurIntensity;

    private StyleType style;

    @Min(2)
    @Max(4)
    private Integer upscaleFactor;
}
