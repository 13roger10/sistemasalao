package com.belezza.api.controller;

import com.belezza.api.entity.Salon;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.SalonRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Vitrine pública do salão, para a página /book/{salonId} (BUG-014: antes a página mostrava
 * nome, serviços e profissionais fictícios). Só os dados que o salão já divulga — os mesmos do
 * GET /api/v1/salons/{id}/info da API pública — e só de salão ativo.
 */
@RestController
@RequestMapping("/api/public/salons")
@RequiredArgsConstructor
@Tag(name = "Salão (público)", description = "Dados públicos do salão")
public class PublicSalonController {

    private final SalonRepository salonRepository;

    @GetMapping("/{salonId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Vitrine do salão", description = "Nome, endereço, telefone e logo de um salão ativo")
    public ResponseEntity<Map<String, Object>> vitrine(@PathVariable Long salonId) {
        Salon salon = salonRepository.findByIdAndAtivoTrue(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));
        Map<String, Object> dados = new LinkedHashMap<>();
        dados.put("id", salon.getId());
        dados.put("nome", salon.getNome());
        dados.put("descricao", salon.getDescricao());
        dados.put("endereco", salon.getEndereco());
        dados.put("cidade", salon.getCidade());
        dados.put("estado", salon.getEstado());
        dados.put("telefone", salon.getTelefone());
        dados.put("logoUrl", salon.getLogoUrl());
        return ResponseEntity.ok(dados);
    }
}
