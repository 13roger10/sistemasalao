package com.belezza.api.entity;

/**
 * Categories/types of professionals working at beauty salons.
 */
public enum CategoriaProfissional {

    PROPRIETARIO("Proprietário/Gestor", "Dono ou gerente do salão com acesso administrativo completo"),
    GERENTE("Gerente", "Responsável pela gestão operacional do salão"),
    RECEPCIONISTA("Recepcionista", "Responsável pelo atendimento e agendamentos"),
    CABELEIREIRO("Cabeleireiro(a)", "Profissional de corte, escova e tratamentos capilares"),
    COLORISTA("Colorista", "Especialista em coloração, mechas e correção de cor"),
    MANICURE_PEDICURE("Manicure/Pedicure", "Profissional de cuidados com unhas das mãos e pés"),
    NAIL_DESIGNER("Nail Designer", "Especialista em alongamento e nail art"),
    MAQUIADOR("Maquiador(a)", "Profissional de maquiagem social e artística"),
    DESIGNER_SOBRANCELHAS("Designer de Sobrancelhas", "Especialista em design, henna e micropigmentação"),
    LASH_DESIGNER("Lash Designer", "Especialista em extensão de cílios e lash lifting"),
    ESTETICISTA("Esteticista", "Profissional de tratamentos faciais e corporais"),
    BARBEIRO("Barbeiro", "Especialista em cortes e tratamentos masculinos"),
    AUXILIAR("Auxiliar de Salão", "Apoio em lavagem, organização e limpeza"),
    OUTRO("Outro", "Outra categoria não listada");

    private final String descricao;
    private final String detalhes;

    CategoriaProfissional(String descricao, String detalhes) {
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
