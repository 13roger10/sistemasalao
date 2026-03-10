package com.belezza.api.dto.fidelidade;

import com.belezza.api.entity.FidelidadeCliente;
import com.belezza.api.entity.NivelFidelidade;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FidelidadeClienteResponse {

    private Long id;
    private Long clienteId;
    private String clienteNome;
    private String clienteEmail;
    private Long programaId;
    private String programaNome;
    private int visitasAtuais;
    private int visitasNecessarias;
    private int totalVisitas;
    private int totalResgates;
    private int creditosDisponiveis;
    private NivelFidelidade nivel;
    private String nivelDescricao;
    private int pontosNivel;
    private int pontosParaProximoNivel;
    private NivelFidelidade proximoNivel;
    private double progressoVisitas;
    private double progressoNivel;
    private boolean ativo;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public static FidelidadeClienteResponse fromEntity(FidelidadeCliente fc) {
        int visitasNecessarias = fc.getPrograma().getVisitasNecessarias();
        double progressoVisitas = (double) fc.getVisitasAtuais() / visitasNecessarias * 100;

        NivelFidelidade proximoNivel = null;
        int pontosParaProximoNivel = 0;
        double progressoNivel = 100;

        if (fc.getNivel() == NivelFidelidade.BRONZE) {
            proximoNivel = NivelFidelidade.PRATA;
            pontosParaProximoNivel = NivelFidelidade.PRATA.getPontosMinimos() - fc.getPontosNivel();
            progressoNivel = (double) fc.getPontosNivel() / NivelFidelidade.PRATA.getPontosMinimos() * 100;
        } else if (fc.getNivel() == NivelFidelidade.PRATA) {
            proximoNivel = NivelFidelidade.OURO;
            pontosParaProximoNivel = NivelFidelidade.OURO.getPontosMinimos() - fc.getPontosNivel();
            int pontosDesdeUltimoNivel = fc.getPontosNivel() - NivelFidelidade.PRATA.getPontosMinimos();
            int pontosTotaisParaOuro = NivelFidelidade.OURO.getPontosMinimos() - NivelFidelidade.PRATA.getPontosMinimos();
            progressoNivel = (double) pontosDesdeUltimoNivel / pontosTotaisParaOuro * 100;
        }

        String nivelDescricao = switch (fc.getNivel()) {
            case BRONZE -> "Bronze - Cliente iniciante";
            case PRATA -> "Prata - Cliente frequente";
            case OURO -> "Ouro - Cliente VIP";
        };

        return FidelidadeClienteResponse.builder()
                .id(fc.getId())
                .clienteId(fc.getCliente().getId())
                .clienteNome(fc.getCliente().getUsuario() != null ? fc.getCliente().getUsuario().getNome() : null)
                .clienteEmail(fc.getCliente().getUsuario() != null ? fc.getCliente().getUsuario().getEmail() : null)
                .programaId(fc.getPrograma().getId())
                .programaNome(fc.getPrograma().getNome())
                .visitasAtuais(fc.getVisitasAtuais())
                .visitasNecessarias(visitasNecessarias)
                .totalVisitas(fc.getTotalVisitas())
                .totalResgates(fc.getTotalResgates())
                .creditosDisponiveis(fc.getCreditosDisponiveis())
                .nivel(fc.getNivel())
                .nivelDescricao(nivelDescricao)
                .pontosNivel(fc.getPontosNivel())
                .pontosParaProximoNivel(pontosParaProximoNivel)
                .proximoNivel(proximoNivel)
                .progressoVisitas(Math.min(progressoVisitas, 100))
                .progressoNivel(Math.min(progressoNivel, 100))
                .ativo(fc.isAtivo())
                .criadoEm(fc.getCriadoEm())
                .atualizadoEm(fc.getAtualizadoEm())
                .build();
    }
}
