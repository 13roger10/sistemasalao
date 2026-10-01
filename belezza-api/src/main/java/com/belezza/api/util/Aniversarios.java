package com.belezza.api.util;

import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneId;

/** Regras de aniversário (data do salão: America/Sao_Paulo). */
public final class Aniversarios {

    public static final ZoneId FUSO_DO_SALAO = ZoneId.of("America/Sao_Paulo");

    private Aniversarios() {}

    public static LocalDate hoje() {
        return LocalDate.now(FUSO_DO_SALAO);
    }

    /** Faz aniversário hoje? Quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos. */
    public static boolean ehHoje(LocalDate nascimento, LocalDate hoje) {
        if (nascimento == null) {
            return false;
        }
        if (nascimento.getMonth() == hoje.getMonth() && nascimento.getDayOfMonth() == hoje.getDayOfMonth()) {
            return true;
        }
        return nascimento.getMonth() == Month.FEBRUARY && nascimento.getDayOfMonth() == 29
                && !hoje.isLeapYear() && hoje.getMonth() == Month.FEBRUARY && hoje.getDayOfMonth() == 28;
    }

    /** Idade que a pessoa completa no aniversário deste ano. */
    public static int idadeQueCompleta(LocalDate nascimento, LocalDate hoje) {
        return hoje.getYear() - nascimento.getYear();
    }
}
