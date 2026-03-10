package com.belezza.api.service;

import com.belezza.api.dto.metricas.MetricasSocialResponse;
import com.belezza.api.dto.metricas.MetricasSocialResponse.EngajamentoDiario;
import com.belezza.api.dto.metricas.MetricasSocialResponse.MetricaPorPlataforma;
import com.belezza.api.dto.metricas.MetricasSocialResponse.TopPost;
import com.belezza.api.dto.metricas.PeriodoFilter;
import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.Post;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.StatusPost;
import com.belezza.api.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for MetricasSocialService.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MetricasSocialService Unit Tests")
class MetricasSocialServiceTest {

    @Mock
    private PostRepository postRepository;

    @InjectMocks
    private MetricasSocialService service;

    private PeriodoFilter periodo;
    private Long salonId;
    private Salon salon;

    @BeforeEach
    void setUp() {
        salonId = 1L;
        periodo = PeriodoFilter.builder()
                .dataInicio(LocalDate.of(2024, 1, 1))
                .dataFim(LocalDate.of(2024, 1, 31))
                .build();

        salon = Salon.builder()
                .id(salonId)
                .nome("Beleza Salon")
                .build();
    }

    @Test
    @DisplayName("Should calculate social metrics successfully")
    void shouldCalculateSocialMetricsSuccessfully() {
        // Given
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 10, 10, 0), 100, 10, 5, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 11, 14, 0), 150, 15, 8, 1500,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 12, 18, 0), 200, 20, 10, 2000,
                        Arrays.asList(PlataformaSocial.FACEBOOK))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getPostsPublicados()).isEqualTo(3);
        assertThat(response.getTotalCurtidas()).isEqualTo(450);
        assertThat(response.getTotalComentarios()).isEqualTo(45);
        assertThat(response.getTotalCompartilhamentos()).isEqualTo(23);
        assertThat(response.getAlcanceTotal()).isEqualTo(4500);
        assertThat(response.getPeriodo()).contains("2024-01");

        verify(postRepository).findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("Should calculate average engagement rate correctly")
    void shouldCalculateAverageEngagementRateCorrectly() {
        // Given
        // Post 1: (100 + 10 + 5) / 1000 * 100 = 11.5%
        // Post 2: (150 + 15 + 8) / 1500 * 100 = 11.53%
        // Average: ~11.52%
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 10, 10, 0), 100, 10, 5, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 11, 14, 0), 150, 15, 8, 1500,
                        Arrays.asList(PlataformaSocial.INSTAGRAM))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getEngajamentoMedio()).isGreaterThan(11.0);
        assertThat(response.getEngajamentoMedio()).isLessThan(12.0);
    }

    @Test
    @DisplayName("Should find best time to post")
    void shouldFindBestTimeToPost() {
        // Given
        // Posts at 10h: avg engagement 10%
        // Posts at 14h: avg engagement 15% (best)
        // Posts at 18h: avg engagement 12%
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 10, 10, 0), 100, 10, 5, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 11, 14, 0), 150, 15, 8, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 12, 18, 0), 120, 12, 6, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getMelhorHorario()).isEqualTo("14:00");
    }

    @Test
    @DisplayName("Should find best day to post")
    void shouldFindBestDayToPost() {
        // Given
        // Monday: 10%
        // Wednesday: 15% (best)
        // Friday: 12%
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 1, 10, 0), 100, 10, 5, 1000,  // Monday
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 3, 10, 0), 150, 15, 8, 1000,  // Wednesday
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 5, 10, 0), 120, 12, 6, 1000,  // Friday
                        Arrays.asList(PlataformaSocial.INSTAGRAM))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getMelhorDia()).isEqualTo("quarta-feira");
    }

    @Test
    @DisplayName("Should calculate metrics by platform")
    void shouldCalculateMetricsByPlatform() {
        // Given
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 10, 10, 0), 100, 10, 5, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 11, 14, 0), 150, 15, 8, 1500,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 12, 18, 0), 200, 20, 10, 2000,
                        Arrays.asList(PlataformaSocial.FACEBOOK))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getPorPlataforma()).hasSize(2);

        MetricaPorPlataforma instagramMetrics = response.getPorPlataforma().stream()
                .filter(p -> p.getPlataforma().equals("INSTAGRAM"))
                .findFirst()
                .orElseThrow();

        assertThat(instagramMetrics.getPostsPublicados()).isEqualTo(2);
        assertThat(instagramMetrics.getTotalCurtidas()).isEqualTo(250);
        assertThat(instagramMetrics.getTotalComentarios()).isEqualTo(25);
        assertThat(instagramMetrics.getTotalCompartilhamentos()).isEqualTo(13);
        assertThat(instagramMetrics.getAlcanceTotal()).isEqualTo(2500);

        MetricaPorPlataforma facebookMetrics = response.getPorPlataforma().stream()
                .filter(p -> p.getPlataforma().equals("FACEBOOK"))
                .findFirst()
                .orElseThrow();

        assertThat(facebookMetrics.getPostsPublicados()).isEqualTo(1);
        assertThat(facebookMetrics.getTotalCurtidas()).isEqualTo(200);
        assertThat(facebookMetrics.getAlcanceTotal()).isEqualTo(2000);
    }

    @Test
    @DisplayName("Should calculate top posts")
    void shouldCalculateTopPosts() {
        // Given
        // Post 1: 11.5% engagement
        // Post 2: 11.53% engagement
        // Post 3: 11.5% engagement
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 10, 10, 0), 100, 10, 5, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 11, 14, 0), 150, 15, 8, 1500,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 12, 18, 0), 115, 11, 6, 1000,
                        Arrays.asList(PlataformaSocial.FACEBOOK))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getTopPosts()).hasSize(3);

        TopPost topPost = response.getTopPosts().get(0);
        assertThat(topPost.getPostId()).isEqualTo(3L); // Should be post 3 with highest engagement rate
        assertThat(topPost.getCurtidas()).isEqualTo(115);
        assertThat(topPost.getEngajamentoRate()).isGreaterThan(11.0);
    }

    @Test
    @DisplayName("Should calculate daily evolution")
    void shouldCalculateDailyEvolution() {
        // Given
        PeriodoFilter shortPeriod = PeriodoFilter.builder()
                .dataInicio(LocalDate.of(2024, 1, 1))
                .dataFim(LocalDate.of(2024, 1, 3))
                .build();

        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 1, 10, 0), 100, 10, 5, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 2, 10, 0), 150, 15, 8, 1500,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 2, 14, 0), 200, 20, 10, 2000,
                        Arrays.asList(PlataformaSocial.FACEBOOK))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, shortPeriod);

        // Then
        assertThat(response.getEvolucaoDiaria()).hasSize(3);

        EngajamentoDiario day1 = response.getEvolucaoDiaria().get(0);
        assertThat(day1.getData()).isEqualTo("2024-01-01");
        assertThat(day1.getPosts()).isEqualTo(1);
        assertThat(day1.getCurtidas()).isEqualTo(100);
        assertThat(day1.getAlcance()).isEqualTo(1000);

        EngajamentoDiario day2 = response.getEvolucaoDiaria().get(1);
        assertThat(day2.getData()).isEqualTo("2024-01-02");
        assertThat(day2.getPosts()).isEqualTo(2);
        assertThat(day2.getCurtidas()).isEqualTo(350);
        assertThat(day2.getAlcance()).isEqualTo(3500);

        EngajamentoDiario day3 = response.getEvolucaoDiaria().get(2);
        assertThat(day3.getData()).isEqualTo("2024-01-03");
        assertThat(day3.getPosts()).isEqualTo(0);
        assertThat(day3.getCurtidas()).isEqualTo(0);
    }

    @Test
    @DisplayName("Should calculate distribution by hour")
    void shouldCalculateDistributionByHour() {
        // Given
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 10, 10, 0), 100, 10, 5, 1000,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 11, 10, 0), 150, 15, 8, 1500,
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 12, 14, 0), 200, 20, 10, 2000,
                        Arrays.asList(PlataformaSocial.FACEBOOK))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        Map<Integer, Integer> distribuicao = response.getDistribuicaoPorHora();
        assertThat(distribuicao).hasSize(24);
        assertThat(distribuicao.get(10)).isEqualTo(2); // 2 posts at 10h
        assertThat(distribuicao.get(14)).isEqualTo(1); // 1 post at 14h
        assertThat(distribuicao.get(0)).isEqualTo(0);  // 0 posts at midnight
    }

    @Test
    @DisplayName("Should calculate distribution by day of week")
    void shouldCalculateDistributionByDayOfWeek() {
        // Given
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 1, 10, 0), 100, 10, 5, 1000,  // Monday
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(2L, LocalDateTime.of(2024, 1, 8, 10, 0), 150, 15, 8, 1500,  // Monday
                        Arrays.asList(PlataformaSocial.INSTAGRAM)),
                createPost(3L, LocalDateTime.of(2024, 1, 3, 10, 0), 200, 20, 10, 2000, // Wednesday
                        Arrays.asList(PlataformaSocial.FACEBOOK))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        Map<Integer, Integer> distribuicao = response.getDistribuicaoPorDia();
        assertThat(distribuicao).hasSize(7);
        assertThat(distribuicao.get(1)).isEqualTo(2); // 2 posts on Monday (1=Monday)
        assertThat(distribuicao.get(3)).isEqualTo(1); // 1 post on Wednesday
        assertThat(distribuicao.get(0)).isEqualTo(0); // 0 posts on Sunday
    }

    @Test
    @DisplayName("Should handle empty results")
    void shouldHandleEmptyResults() {
        // Given
        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getPostsPublicados()).isEqualTo(0);
        assertThat(response.getTotalCurtidas()).isEqualTo(0);
        assertThat(response.getTotalComentarios()).isEqualTo(0);
        assertThat(response.getTotalCompartilhamentos()).isEqualTo(0);
        assertThat(response.getAlcanceTotal()).isEqualTo(0);
        assertThat(response.getEngajamentoMedio()).isEqualTo(0.0);
        assertThat(response.getMelhorHorario()).isEqualTo("N/A");
        assertThat(response.getMelhorDia()).isEqualTo("N/A");
        assertThat(response.getPorPlataforma()).isEmpty();
        assertThat(response.getTopPosts()).isEmpty();
        assertThat(response.getEvolucaoDiaria()).hasSize(31); // January has 31 days
        assertThat(response.getDistribuicaoPorHora()).hasSize(24);
        assertThat(response.getDistribuicaoPorDia()).hasSize(7);
    }

    @Test
    @DisplayName("Should handle posts with zero reach")
    void shouldHandlePostsWithZeroReach() {
        // Given
        List<Post> posts = Arrays.asList(
                createPost(1L, LocalDateTime.of(2024, 1, 10, 10, 0), 100, 10, 5, 0,
                        Arrays.asList(PlataformaSocial.INSTAGRAM))
        );

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(posts);

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getEngajamentoMedio()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("Should truncate long captions in top posts")
    void shouldTruncateLongCaptionsInTopPosts() {
        // Given
        String longCaption = "A".repeat(150);
        Post post = createPostWithCaption(1L, LocalDateTime.of(2024, 1, 10, 10, 0),
                100, 10, 5, 1000, Arrays.asList(PlataformaSocial.INSTAGRAM), longCaption);

        when(postRepository.findBySalonIdAndStatusAndPublicadoEmBetween(
                eq(salonId), eq(StatusPost.PUBLICADO), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(Arrays.asList(post));

        // When
        MetricasSocialResponse response = service.calcularMetricas(salonId, periodo);

        // Then
        assertThat(response.getTopPosts()).hasSize(1);
        assertThat(response.getTopPosts().get(0).getLegenda()).hasSize(100);
        assertThat(response.getTopPosts().get(0).getLegenda()).endsWith("...");
    }

    // Helper methods

    private Post createPost(Long id, LocalDateTime publicadoEm, int curtidas, int comentarios,
                          int compartilhamentos, int alcance, List<PlataformaSocial> plataformas) {
        return createPostWithCaption(id, publicadoEm, curtidas, comentarios, compartilhamentos,
                alcance, plataformas, "Test post caption");
    }

    private Post createPostWithCaption(Long id, LocalDateTime publicadoEm, int curtidas, int comentarios,
                                      int compartilhamentos, int alcance, List<PlataformaSocial> plataformas,
                                      String legenda) {
        return Post.builder()
                .id(id)
                .salon(salon)
                .imagemUrl("https://example.com/image.jpg")
                .legenda(legenda)
                .status(StatusPost.PUBLICADO)
                .publicadoEm(publicadoEm)
                .curtidas(curtidas)
                .comentarios(comentarios)
                .compartilhamentos(compartilhamentos)
                .alcance(alcance)
                .plataformas(plataformas)
                .build();
    }
}
