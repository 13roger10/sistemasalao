package com.belezza.api.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Health check controller for basic API status.
 */
@RestController
@RequestMapping("/api/public")
@Tag(name = "Health", description = "Health check endpoints")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Check API health", description = "Returns basic health status of the API")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "timestamp", LocalDateTime.now(),
            "service", "belezza-api",
            "version", "1.0.0"
        ));
    }

    @GetMapping("/ping")
    @Operation(summary = "Ping the API", description = "Simple ping endpoint")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}
