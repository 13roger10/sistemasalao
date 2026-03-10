package com.belezza.api.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for paginated user list.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioPageResponse {

    private List<UsuarioListResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
}
