package com.belezza.api.entity;

/**
 * Técnica de coloração utilizada.
 */
public enum TecnicaColoracao {
    GLOBAL("Coloração Global", "Aplicação uniforme em todo o cabelo"),
    MECHAS("Mechas", "Descoloração em mechas selecionadas"),
    BALAYAGE("Balayage", "Técnica de mão livre com efeito natural"),
    OMBRE("Ombre", "Degradê de cor das raízes às pontas"),
    LUZES("Luzes", "Mechas finas com papel alumínio"),
    RETOQUE_RAIZ("Retoque de Raiz", "Aplicação apenas na raiz"),
    TONALIZACAO("Tonalização", "Coloração sem amônia para brilho"),
    REFLEXO("Reflexo", "Efeito de luz em pontos específicos"),
    CALIFORNIANAS("Californianas", "Mechas mais claras nas pontas"),
    MORENA_ILUMINADA("Morena Iluminada", "Mechas sutis em cabelos escuros"),
    PLATINADO("Platinado", "Descoloração total para loiro platinado"),
    VIVIDOS("Cores Fantasia", "Cores não naturais (roxo, azul, rosa, etc.)");

    private final String nome;
    private final String descricao;

    TecnicaColoracao(String nome, String descricao) {
        this.nome = nome;
        this.descricao = descricao;
    }

    public String getNome() {
        return nome;
    }

    public String getDescricao() {
        return descricao;
    }
}
