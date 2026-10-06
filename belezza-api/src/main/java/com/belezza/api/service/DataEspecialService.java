package com.belezza.api.service;

import com.belezza.api.entity.DataEspecialSalon;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.DataEspecialSalonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Feriados e datas especiais do salão (BUG-008: antes não eram gravados e a agenda os ignorava).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataEspecialService {

    private static final Set<String> TIPOS_ESPECIAIS = Set.of("closed", "special_hours", "extended");

    private final DataEspecialSalonRepository repository;

    /**
     * Como o salão funciona neste dia, quando há feriado ou data especial.
     *
     * @param fechado salão fechado o dia todo
     * @param inicio  horário do dia (quando não fechado)
     * @param fim     horário do dia (quando não fechado)
     * @param nome    nome do feriado/data, para a mensagem
     */
    public record Excecao(boolean fechado, LocalTime inicio, LocalTime fim, String nome) {}

    /**
     * Exceção do dia, se houver. Precedência: data exata antes de feriado recorrente, e data
     * especial antes de feriado. Feriado aberto sem horário próprio não muda nada.
     */
    @Transactional(readOnly = true)
    public Optional<Excecao> excecaoDoDia(Long salonId, LocalDate dia) {
        if (salonId == null || dia == null) {
            return Optional.empty();
        }
        return repository.candidatasDoDia(salonId, dia).stream()
                .filter(d -> d.valeEm(dia))
                .min(Comparator.comparing((DataEspecialSalon d) -> d.getData().equals(dia) ? 0 : 1)
                        .thenComparing(d -> DataEspecialSalon.ESPECIAL.equals(d.getCategoria()) ? 0 : 1))
                .flatMap(d -> {
                    if (d.fechaODia()) {
                        return Optional.of(new Excecao(true, null, null, d.getNome()));
                    }
                    if (d.getHoraInicio() != null && d.getHoraFim() != null) {
                        return Optional.of(new Excecao(false, d.getHoraInicio(), d.getHoraFim(), d.getNome()));
                    }
                    return Optional.empty();
                });
    }

    @Transactional(readOnly = true)
    public List<DataEspecialSalon> listar(Long salonId, String categoria) {
        return repository.findBySalonIdAndCategoriaOrderByDataAsc(salonId, categoria);
    }

    @Transactional
    public DataEspecialSalon salvarFeriado(Long salonId, Long id, String data, String nome, Boolean aberto,
                                          String inicio, String fim, Boolean recorrente) {
        DataEspecialSalon d = id != null ? buscar(salonId, id, DataEspecialSalon.FERIADO)
                : DataEspecialSalon.builder().salonId(salonId).categoria(DataEspecialSalon.FERIADO).build();
        if (id == null || data != null) d.setData(data(data));
        if (id == null || nome != null) d.setNome(nome(nome));
        if (aberto != null) d.setAberto(aberto);
        if (recorrente != null) d.setRecorrente(recorrente);
        if (d.isAberto()) {
            horario(d, inicio, fim, false);
        } else {
            d.setHoraInicio(null);
            d.setHoraFim(null);
        }
        return repository.save(d);
    }

    @Transactional
    public DataEspecialSalon salvarDataEspecial(Long salonId, String data, String nome, String tipo,
                                               String inicio, String fim) {
        if (tipo == null || !TIPOS_ESPECIAIS.contains(tipo)) {
            throw new BusinessException("Tipo inválido: use closed, special_hours ou extended");
        }
        DataEspecialSalon d = DataEspecialSalon.builder()
                .salonId(salonId)
                .categoria(DataEspecialSalon.ESPECIAL)
                .data(data(data))
                .nome(nome(nome))
                .tipo(tipo)
                .aberto(!"closed".equals(tipo))
                .build();
        if (!"closed".equals(tipo)) {
            horario(d, inicio, fim, true);
        }
        return repository.save(d);
    }

    @Transactional
    public void excluir(Long salonId, Long id, String categoria) {
        repository.delete(buscar(salonId, id, categoria));
    }

    private DataEspecialSalon buscar(Long salonId, Long id, String categoria) {
        return repository.findByIdAndSalonIdAndCategoria(id, salonId, categoria)
                .orElseThrow(() -> new ResourceNotFoundException(
                        DataEspecialSalon.FERIADO.equals(categoria) ? "Feriado" : "Data especial", id));
    }

    private static LocalDate data(String texto) {
        if (texto == null || texto.isBlank()) {
            throw new BusinessException("Informe a data (AAAA-MM-DD)");
        }
        try {
            return LocalDate.parse(texto.length() > 10 ? texto.substring(0, 10) : texto);
        } catch (DateTimeParseException e) {
            throw new BusinessException("Data inválida: " + texto);
        }
    }

    private static String nome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw new BusinessException("Informe o nome");
        }
        if (nome.length() > 100) {
            throw new BusinessException("O nome deve ter no máximo 100 caracteres");
        }
        return nome.trim();
    }

    private static void horario(DataEspecialSalon d, String inicio, String fim, boolean obrigatorio) {
        if ((inicio == null || inicio.isBlank()) && (fim == null || fim.isBlank())) {
            if (obrigatorio) {
                throw new BusinessException("Informe o horário de início e de fim");
            }
            d.setHoraInicio(null);
            d.setHoraFim(null);
            return;
        }
        try {
            LocalTime i = LocalTime.parse(inicio);
            LocalTime f = LocalTime.parse(fim);
            if (!i.isBefore(f)) {
                throw new BusinessException("O horário de início deve ser antes do fim");
            }
            d.setHoraInicio(i);
            d.setHoraFim(f);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new BusinessException("Horário inválido: use HH:mm");
        }
    }
}
