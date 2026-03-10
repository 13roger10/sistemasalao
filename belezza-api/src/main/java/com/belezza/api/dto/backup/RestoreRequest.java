package com.belezza.api.dto.backup;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestoreRequest {

    @NotBlank(message = "Nome do arquivo de backup e obrigatorio")
    private String filename;
}
