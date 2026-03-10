package com.belezza.api.service;

import com.belezza.api.dto.metricas.MetricasSocialResponse;
import com.belezza.api.dto.metricas.MetricasSocialResponse.EngajamentoDiario;
import com.belezza.api.dto.metricas.MetricasSocialResponse.MetricaPorPlataforma;
import com.belezza.api.dto.metricas.MetricasSocialResponse.TopPost;
import com.belezza.api.dto.metricas.PeriodoFilter;
import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.Post;
import com.belezza.api.entity.StatusPost;
import com.belezza.api.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for calculating social media engagement metrics.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MetricasSocialService {

    private final PostRepository postRepository;

    /**
     * Calculate comprehensive social media metrics for a salon in a given period.
     */
    public MetricasSocialResponse calcularMetricas(Long salonId, PeriodoFilter periodo) {
        log.debug("Calculating social metrics for salon: {} in period: {}", salonId, periodo);

        LocalDateTime inicio = periodo.getDataInicio().atStartOfDay();
        LocalDateTime fim = periodo.getDataFim().atTime(LocalTime.MAX);

        // Get all published posts in the period
        List<Post> posts = postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                salonId, StatusPost.PUBLICADO, inicio, fim);

        int postsPublicados = posts.size();

        // Calculate totals
        int totalCurtidas = posts.stream().mapToInt(Post::getCurtidas).sum();
        int totalComentarios = posts.stream().mapToInt(Post::getComentarios).sum();
        int totalCompartilhamentos = posts.stream().mapToInt(Post::getCompartilhamentos).sum();
        int alcanceTotal = posts.stream().mapToInt(Post::getAlcance).sum();

        // Calculate average engagement rate
        double engajamentoMedio = calcularEngajamentoMedio(posts);

        // Find best time and day
        String melhorHorario = encontrarMelhorHorario(posts);
        String melhorDia = encontrarMelhorDia(posts);

        // Calculate metrics by platform
        List<MetricaPorPlataforma> porPlataforma = calcularPorPlataforma(posts);

        // Get top posts
        List<TopPost> topPosts = calcularTopPosts(posts, 10);

        // Calculate daily evolution
        List<EngajamentoDiario> evolucaoDiaria = calcularEvolucaoDiaria(posts, periodo);

        // Calculate distributions
        Map<Integer, Integer> distribuicaoPorHora = calcularDistribuicaoPorHora(posts);
        Map<Integer, Integer> distribuicaoPorDia = calcularDistribuicaoPorDia(posts);

        return MetricasSocialResponse.builder()
                .periodo(periodo.getPeriodoIdentifier())
                .postsPublicados(postsPublicados)
                .totalCurtidas(totalCurtidas)
                .totalComentarios(totalComentarios)
                .totalCompartilhamentos(totalCompartilhamentos)
                .alcanceTotal(alcanceTotal)
                .engajamentoMedio(Math.round(engajamentoMedio * 100.0) / 100.0)
                .melhorHorario(melhorHorario)
                .melhorDia(melhorDia)
                .porPlataforma(porPlataforma)
                .topPosts(topPosts)
                .evolucaoDiaria(evolucaoDiaria)
                .distribuicaoPorHora(distribuicaoPorHora)
                .distribuicaoPorDia(distribuicaoPorDia)
                .build();
    }

    /**
     * Calculate average engagement rate.
     * Formula: (likes + comments + shares) / reach * 100
     */
    private double calcularEngajamentoMedio(List<Post> posts) {
        if (posts.isEmpty()) {
            return 0.0;
        }

        return posts.stream()
                .mapToDouble(post -> {
                    int alcance = post.getAlcance();
                    if (alcance == 0) {
                        return 0.0;
                    }

                    int engajamentos = post.getCurtidas() + post.getComentarios() + post.getCompartilhamentos();
                    return (engajamentos * 100.0) / alcance;
                })
                .average()
                .orElse(0.0);
    }

    /**
     * Find the best hour to post based on engagement.
     */
    private String encontrarMelhorHorario(List<Post> posts) {
        if (posts.isEmpty()) {
            return "N/A";
        }

        Map<Integer, List<Post>> postsByHour = posts.stream()
                .collect(Collectors.groupingBy(p -> p.getPublicadoEm().getHour()));

        // Calculate average engagement for each hour
        Map.Entry<Integer, Double> bestHour = postsByHour.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream()
                                .mapToDouble(this::calcularEngajamento)
                                .average()
                                .orElse(0.0)
                ))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);

        if (bestHour == null) {
            return "N/A";
        }

        return String.format("%02d:00", bestHour.getKey());
    }

    /**
     * Find the best day of the week to post.
     */
    private String encontrarMelhorDia(List<Post> posts) {
        if (posts.isEmpty()) {
            return "N/A";
        }

        Map<DayOfWeek, List<Post>> postsByDay = posts.stream()
                .collect(Collectors.groupingBy(p -> p.getPublicadoEm().getDayOfWeek()));

        // Calculate average engagement for each day
        Map.Entry<DayOfWeek, Double> bestDay = postsByDay.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> entry.getValue().stream()
                                .mapToDouble(this::calcularEngajamento)
                                .average()
                                .orElse(0.0)
                ))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);

        if (bestDay == null) {
            return "N/A";
        }

        return getDayNameInPortuguese(bestDay.getKey());
    }

    /**
     * Calculate engagement score for a post.
     */
    private double calcularEngajamento(Post post) {
        int alcance = post.getAlcance();
        if (alcance == 0) {
            return 0.0;
        }

        int engajamentos = post.getCurtidas() + post.getComentarios() + post.getCompartilhamentos();
        return (engajamentos * 100.0) / alcance;
    }

    /**
     * Calculate metrics by platform.
     */
    private List<MetricaPorPlataforma> calcularPorPlataforma(List<Post> posts) {
        // Group posts by platform
        // Note: A post can be published to multiple platforms
        Map<PlataformaSocial, List<Post>> postsByPlatform = new HashMap<>();

        for (Post post : posts) {
            for (PlataformaSocial plataforma : post.getPlataformas()) {
                postsByPlatform.computeIfAbsent(plataforma, k -> new ArrayList<>()).add(post);
            }
        }

        return postsByPlatform.entrySet().stream()
                .map(entry -> {
                    PlataformaSocial plataforma = entry.getKey();
                    List<Post> platformPosts = entry.getValue();

                    int postsPublicados = platformPosts.size();
                    int totalCurtidas = platformPosts.stream().mapToInt(Post::getCurtidas).sum();
                    int totalComentarios = platformPosts.stream().mapToInt(Post::getComentarios).sum();
                    int totalCompartilhamentos = platformPosts.stream().mapToInt(Post::getCompartilhamentos).sum();
                    int alcanceTotal = platformPosts.stream().mapToInt(Post::getAlcance).sum();
                    double engajamentoMedio = calcularEngajamentoMedio(platformPosts);

                    return MetricaPorPlataforma.builder()
                            .plataforma(plataforma.name())
                            .postsPublicados(postsPublicados)
                            .totalCurtidas(totalCurtidas)
                            .totalComentarios(totalComentarios)
                            .totalCompartilhamentos(totalCompartilhamentos)
                            .alcanceTotal(alcanceTotal)
                            .engajamentoMedio(Math.round(engajamentoMedio * 100.0) / 100.0)
                            .build();
                })
                .sorted(Comparator.comparing(MetricaPorPlataforma::getPostsPublicados).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Get top performing posts.
     */
    private List<TopPost> calcularTopPosts(List<Post> posts, int limit) {
        return posts.stream()
                .sorted((a, b) -> Double.compare(calcularEngajamento(b), calcularEngajamento(a)))
                .limit(limit)
                .map(post -> TopPost.builder()
                        .postId(post.getId())
                        .imagemUrl(post.getImagemUrl())
                        .legenda(truncateLegenda(post.getLegenda()))
                        .curtidas(post.getCurtidas())
                        .comentarios(post.getComentarios())
                        .compartilhamentos(post.getCompartilhamentos())
                        .alcance(post.getAlcance())
                        .engajamentoRate(Math.round(calcularEngajamento(post) * 100.0) / 100.0)
                        .publicadoEm(post.getPublicadoEm().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Calculate daily engagement evolution.
     */
    private List<EngajamentoDiario> calcularEvolucaoDiaria(List<Post> posts, PeriodoFilter periodo) {
        LocalDate inicio = periodo.getDataInicio();
        LocalDate fim = periodo.getDataFim();

        Map<LocalDate, List<Post>> postsByDate = posts.stream()
                .collect(Collectors.groupingBy(p -> p.getPublicadoEm().toLocalDate()));

        List<EngajamentoDiario> evolucao = new ArrayList<>();
        LocalDate current = inicio;

        while (!current.isAfter(fim)) {
            List<Post> dayPosts = postsByDate.getOrDefault(current, Collections.emptyList());

            int postsCount = dayPosts.size();
            int curtidas = dayPosts.stream().mapToInt(Post::getCurtidas).sum();
            int comentarios = dayPosts.stream().mapToInt(Post::getComentarios).sum();
            int compartilhamentos = dayPosts.stream().mapToInt(Post::getCompartilhamentos).sum();
            int alcance = dayPosts.stream().mapToInt(Post::getAlcance).sum();
            double engajamento = calcularEngajamentoMedio(dayPosts);

            evolucao.add(EngajamentoDiario.builder()
                    .data(current.toString())
                    .posts(postsCount)
                    .curtidas(curtidas)
                    .comentarios(comentarios)
                    .compartilhamentos(compartilhamentos)
                    .alcance(alcance)
                    .engajamentoRate(Math.round(engajamento * 100.0) / 100.0)
                    .build());

            current = current.plusDays(1);
        }

        return evolucao;
    }

    /**
     * Calculate distribution of posts by hour.
     */
    private Map<Integer, Integer> calcularDistribuicaoPorHora(List<Post> posts) {
        Map<Integer, Integer> distribuicao = new TreeMap<>();

        // Initialize all hours with 0
        for (int i = 0; i < 24; i++) {
            distribuicao.put(i, 0);
        }

        // Count posts by hour
        posts.forEach(post -> {
            int hour = post.getPublicadoEm().getHour();
            distribuicao.put(hour, distribuicao.get(hour) + 1);
        });

        return distribuicao;
    }

    /**
     * Calculate distribution of posts by day of week.
     */
    private Map<Integer, Integer> calcularDistribuicaoPorDia(List<Post> posts) {
        Map<Integer, Integer> distribuicao = new TreeMap<>();

        // Initialize all days with 0 (0=Sunday to 6=Saturday)
        for (int i = 0; i < 7; i++) {
            distribuicao.put(i, 0);
        }

        // Count posts by day
        posts.forEach(post -> {
            // Java DayOfWeek: MONDAY=1, SUNDAY=7
            // Convert to 0=Sunday, 6=Saturday
            int dayOfWeek = post.getPublicadoEm().getDayOfWeek().getValue();
            int day = dayOfWeek == 7 ? 0 : dayOfWeek;
            distribuicao.put(day, distribuicao.get(day) + 1);
        });

        return distribuicao;
    }

    /**
     * Get day name in Portuguese.
     */
    private String getDayNameInPortuguese(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "segunda-feira";
            case TUESDAY -> "terça-feira";
            case WEDNESDAY -> "quarta-feira";
            case THURSDAY -> "quinta-feira";
            case FRIDAY -> "sexta-feira";
            case SATURDAY -> "sábado";
            case SUNDAY -> "domingo";
        };
    }

    /**
     * Truncate legenda for display.
     */
    private String truncateLegenda(String legenda) {
        if (legenda == null) {
            return null;
        }

        if (legenda.length() <= 100) {
            return legenda;
        }

        return legenda.substring(0, 97) + "...";
    }
}
