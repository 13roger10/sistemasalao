package com.belezza.api.util;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Comparação de textos para busca: sem acentos, sem diferença de maiúsculas e com espaços
 * simples — "jose cao" encontra "José  Ção" (BUG-040).
 */
public final class Textos {

    private Textos() {
    }

    /** "  José   Ção " → "jose cao". Nulo vira texto vazio. */
    public static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
    }

    /** {@code texto} contém {@code busca}, ignorando acentos, maiúsculas e espaços repetidos. */
    public static boolean contem(String texto, String busca) {
        return texto != null && normalizar(texto).contains(normalizar(busca));
    }
}
