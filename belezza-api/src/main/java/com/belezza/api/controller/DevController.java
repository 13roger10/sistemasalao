package com.belezza.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Development-only controller for utilities.
 */
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
// BUG-009: era "!prod" e ficava exposto em qualquer ambiente sem perfil (ex.: docker-compose)
@Profile({"dev", "local"})
public class DevController {

    private final PasswordEncoder passwordEncoder;

    @GetMapping("/hash")
    public Map<String, String> generateHash(@RequestParam String password) {
        String hash = passwordEncoder.encode(password);
        return Map.of(
            "password", password,
            "hash", hash
        );
    }
}
