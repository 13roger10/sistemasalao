package com.belezza.api.dto.backup;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackupResponse {

    private boolean success;
    private String message;
    private String filename;
    private String filepath;
    private long sizeBytes;
    private String sizeFormatted;
    private LocalDateTime createdAt;
    private long durationMs;
}
