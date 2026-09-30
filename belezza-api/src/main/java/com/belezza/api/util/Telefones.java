package com.belezza.api.util;

/**
 * Telefone brasileiro: DDD + número (10 ou 11 dígitos), com ou sem o 55 na frente. O formato
 * digitado ("(11) 96203-5710", "11962035710", "+55 11 ...") não importa para comparar — antes
 * "(11) 96…" não era reconhecido como o mesmo telefone de "1196…" (BUG-031).
 */
public final class Telefones {

    private Telefones() {
    }

    /** Só os dígitos, sem o código do país: "(11) 96203-5710" e "+55 11 96203-5710" → "11962035710". */
    public static String digitos(String telefone) {
        if (telefone == null) {
            return null;
        }
        String d = telefone.replaceAll("\\D", "");
        if (d.startsWith("55") && (d.length() == 12 || d.length() == 13)) {
            d = d.substring(2);
        }
        return d;
    }

    /** Aceita só dígitos e sinais de formatação, com 10 ou 11 dígitos (fora o 55). */
    public static boolean valido(String telefone) {
        if (telefone == null || !telefone.matches("^\\+?[\\d\\s().-]+$")) {
            return false;
        }
        int n = digitos(telefone).length();
        return n == 10 || n == 11;
    }
}
