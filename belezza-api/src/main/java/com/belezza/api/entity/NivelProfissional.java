package com.belezza.api.entity;

/**
 * Professional experience level.
 */
public enum NivelProfissional {

    JUNIOR("Júnior", "Profissional iniciante, até 2 anos de experiência"),
    PLENO("Pleno", "Profissional experiente, 2-5 anos de experiência"),
    SENIOR("Sênior", "Profissional altamente experiente, mais de 5 anos"),
    ESPECIALISTA("Especialista", "Expert reconhecido na área"),
    MASTER("Master", "Referência no mercado, formador de outros profissionais");

    private final String descricao;
    private final String detalhes;

    NivelProfissional(String descricao, String detalhes) {
        this.descricao = descricao;
        this.detalhes = detalhes;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getDetalhes() {
        return detalhes;
    }
}
