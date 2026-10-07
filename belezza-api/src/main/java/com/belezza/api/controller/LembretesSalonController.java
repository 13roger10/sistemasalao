package com.belezza.api.controller;

import com.belezza.api.entity.ConfiguracaoLembretesSalon;
import com.belezza.api.repository.ConfiguracaoLembretesSalonRepository;
import com.belezza.api.security.TenantContext;
import com.belezza.api.security.annotation.AdminOnly;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * Lembretes automáticos por WhatsApp do salão do token (BUG-026: a tela chamava esta rota, que não
 * existia, e mostrava tudo ligado sem gravar nada). O {@code LembreteAgendamentoJob} respeita
 * estas opções.
 */
@RestController
@RequestMapping("/api/salon/reminders/settings")
@RequiredArgsConstructor
@Validated
@AdminOnly
@Tag(name = "Lembretes", description = "Lembretes automáticos de agendamento")
public class LembretesSalonController {

    private final ConfiguracaoLembretesSalonRepository repository;

    public record ConfiguracaoLembretes(@NotNull Boolean enabled, @NotNull Boolean dayBefore,
                                        @NotNull Boolean hoursBefore) {
        static ConfiguracaoLembretes de(ConfiguracaoLembretesSalon c) {
            return new ConfiguracaoLembretes(c.isAtivo(), c.isLembrete24h(), c.isLembrete2h());
        }
    }

    @GetMapping
    @Operation(summary = "Configuração dos lembretes do salão")
    public ResponseEntity<ConfiguracaoLembretes> obter() {
        Long salonId = salaoDoToken();
        return ResponseEntity.ok(ConfiguracaoLembretes.de(
                repository.findById(salonId).orElseGet(() -> ConfiguracaoLembretesSalon.padrao(salonId))));
    }

    @PutMapping
    @Transactional
    @Operation(summary = "Salvar a configuração dos lembretes do salão")
    public ResponseEntity<ConfiguracaoLembretes> salvar(@RequestBody @Validated ConfiguracaoLembretes request) {
        Long salonId = salaoDoToken();
        ConfiguracaoLembretesSalon config = repository.findById(salonId)
                .orElseGet(() -> ConfiguracaoLembretesSalon.padrao(salonId));
        config.setAtivo(request.enabled());
        config.setLembrete24h(request.dayBefore());
        config.setLembrete2h(request.hoursBefore());
        return ResponseEntity.ok(ConfiguracaoLembretes.de(repository.save(config)));
    }

    private static Long salaoDoToken() {
        Long salonId = TenantContext.getCurrentTenant();
        if (salonId == null) {
            throw new AccessDeniedException("Acesso negado: usuário sem estabelecimento vinculado");
        }
        return salonId;
    }
}
