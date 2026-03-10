package com.belezza.api.service;

import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.MetaGraphAPIService;
import com.belezza.api.repository.PostRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for managing social media posts.
 * Handles CRUD, publishing, scheduling, and metrics.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional
public class PostService {

    private final PostRepository postRepository;
    private final SalonRepository salonRepository;
    private final UsuarioRepository usuarioRepository;
    private final SocialAccountService socialAccountService;
    private final MetaGraphAPIService metaGraphAPIService;

    private static final int MAX_RETRY_ATTEMPTS = 3;

    // ====================================
    // CRUD Operations
    // ====================================

    /**
     * Create a new post (draft).
     */
    public Post createPost(Long salonId, Long criadorId, PostCreateData data) {
        Salon salon = getSalonById(salonId);
        Usuario criador = getUsuarioById(criadorId);

        // Validate plan limits
        validatePostLimits(salon);

        Post post = Post.builder()
            .salon(salon)
            .criador(criador)
            .imagemUrl(data.imagemUrl())
            .imagemOriginalUrl(data.imagemOriginalUrl())
            .thumbnailUrl(data.thumbnailUrl())
            .legenda(data.legenda())
            .hashtags(data.hashtags() != null ? new ArrayList<>(data.hashtags()) : new ArrayList<>())
            .plataformas(data.plataformas() != null ? new ArrayList<>(data.plataformas()) : new ArrayList<>())
            .status(StatusPost.RASCUNHO)
            .build();

        post = postRepository.save(post);

        log.info("Post created: {} for salon: {}", post.getId(), salonId);
        return post;
    }

    /**
     * Update existing post.
     */
    public Post updatePost(Long salonId, Long postId, PostUpdateData data) {
        Post post = getPostBySalonAndId(salonId, postId);

        // Can only update drafts or failed posts
        if (post.getStatus() != StatusPost.RASCUNHO && post.getStatus() != StatusPost.FALHOU) {
            throw new BusinessException("Cannot update post with status: " + post.getStatus());
        }

        if (data.imagemUrl() != null) {
            post.setImagemUrl(data.imagemUrl());
        }
        if (data.thumbnailUrl() != null) {
            post.setThumbnailUrl(data.thumbnailUrl());
        }
        if (data.legenda() != null) {
            post.setLegenda(data.legenda());
        }
        if (data.hashtags() != null) {
            post.setHashtags(new ArrayList<>(data.hashtags()));
        }
        if (data.plataformas() != null) {
            post.setPlataformas(new ArrayList<>(data.plataformas()));
        }

        // Reset status to draft if was failed
        if (post.getStatus() == StatusPost.FALHOU) {
            post.setStatus(StatusPost.RASCUNHO);
            post.setTentativasPublicacao(0);
            post.setPublishErrorMessage(null);
        }

        post = postRepository.save(post);

        log.info("Post updated: {}", postId);
        return post;
    }

    /**
     * Get post by ID.
     */
    @Transactional(readOnly = true)
    public Post getPost(Long salonId, Long postId) {
        return getPostBySalonAndId(salonId, postId);
    }

    /**
     * List posts by salon.
     */
    @Transactional(readOnly = true)
    public Page<Post> listPosts(Long salonId, StatusPost status, Pageable pageable) {
        Salon salon = getSalonById(salonId);

        if (status != null) {
            return postRepository.findBySalonAndStatus(salon, status, pageable);
        }

        return postRepository.findBySalon(salon, pageable);
    }

    /**
     * Delete post (soft delete by marking as draft).
     */
    public void deletePost(Long salonId, Long postId) {
        Post post = getPostBySalonAndId(salonId, postId);

        // Cannot delete published posts
        if (post.getStatus() == StatusPost.PUBLICADO || post.getStatus() == StatusPost.PUBLICANDO) {
            throw new BusinessException("Cannot delete published or publishing posts");
        }

        postRepository.delete(post);

        log.info("Post deleted: {}", postId);
    }

    // ====================================
    // 7.3 Publishing
    // ====================================

    /**
     * Publish post immediately to selected platforms.
     */
    public Post publishPost(Long salonId, Long postId) {
        Post post = getPostBySalonAndId(salonId, postId);

        // Validate post can be published
        validatePostForPublishing(post);

        // Update status
        post.setStatus(StatusPost.PUBLICANDO);
        post.setTentativasPublicacao(post.getTentativasPublicacao() + 1);
        postRepository.save(post);

        try {
            // Publish to each platform
            boolean allSuccess = true;
            StringBuilder errors = new StringBuilder();

            for (PlataformaSocial plataforma : post.getPlataformas()) {
                try {
                    publishToPlatform(post, plataforma);
                } catch (Exception e) {
                    allSuccess = false;
                    errors.append(plataforma).append(": ").append(e.getMessage()).append("; ");
                    log.error("Failed to publish to {}: {}", plataforma, e.getMessage());
                }
            }

            if (allSuccess) {
                post.setStatus(StatusPost.PUBLICADO);
                post.setPublicadoEm(LocalDateTime.now());
                post.setPublishErrorMessage(null);
                log.info("Post published successfully: {}", postId);
            } else {
                post.setStatus(StatusPost.FALHOU);
                post.setPublishErrorMessage(errors.toString());
                log.error("Post publishing failed: {}", postId);
            }

        } catch (Exception e) {
            post.setStatus(StatusPost.FALHOU);
            post.setPublishErrorMessage(e.getMessage());
            log.error("Error publishing post {}: {}", postId, e.getMessage(), e);
        }

        return postRepository.save(post);
    }

    /**
     * Publish to a specific platform.
     */
    private void publishToPlatform(Post post, PlataformaSocial plataforma) {
        // Get active account for platform
        ContaSocial conta = socialAccountService.getAccountByPlatform(
            post.getSalon().getId(),
            plataforma
        );

        // Build caption with hashtags
        String caption = buildCaption(post.getLegenda(), post.getHashtags());

        // Create publish request
        MetaGraphAPIService.PublishRequest request = new MetaGraphAPIService.PublishRequest(
            post.getImagemUrl(),
            caption
        );

        // Publish
        MetaGraphAPIService.PublishResponse response;

        if (plataforma == PlataformaSocial.INSTAGRAM) {
            response = metaGraphAPIService.publishToInstagram(
                conta.getAccessToken(),
                conta.getAccountId(),
                request
            );
        } else if (plataforma == PlataformaSocial.FACEBOOK) {
            response = metaGraphAPIService.publishToFacebook(
                conta.getAccessToken(),
                conta.getAccountId(),
                request
            );
        } else {
            throw new BusinessException("Publishing to " + plataforma + " not yet implemented");
        }

        if (!response.success()) {
            throw new BusinessException(response.errorMessage());
        }

        log.info("Published to {} successfully. Post ID: {}", plataforma, response.postId());
    }

    // ====================================
    // 7.4 Scheduling
    // ====================================

    /**
     * Schedule post for future publishing.
     */
    public Post schedulePost(Long salonId, Long postId, LocalDateTime scheduledTime) {
        Post post = getPostBySalonAndId(salonId, postId);

        // Validate post can be scheduled
        validatePostForPublishing(post);

        // Validate scheduled time is in the future
        if (scheduledTime.isBefore(LocalDateTime.now())) {
            throw new BusinessException("Scheduled time must be in the future");
        }

        post.setStatus(StatusPost.AGENDADO);
        post.setAgendadoPara(scheduledTime);
        post = postRepository.save(post);

        log.info("Post scheduled: {} for {}", postId, scheduledTime);
        return post;
    }

    /**
     * Process scheduled posts that are ready to publish.
     * Called by scheduler job.
     */
    public void processScheduledPosts() {
        List<Post> readyPosts = postRepository.findReadyToPublish(LocalDateTime.now());

        log.info("Processing {} scheduled posts", readyPosts.size());

        for (Post post : readyPosts) {
            try {
                publishPost(post.getSalon().getId(), post.getId());
            } catch (Exception e) {
                log.error("Error processing scheduled post {}: {}", post.getId(), e.getMessage());
                post.setStatus(StatusPost.FALHOU);
                post.setPublishErrorMessage(e.getMessage());
                postRepository.save(post);
            }
        }
    }

    /**
     * Retry failed posts.
     * Called by scheduler job.
     */
    public void retryFailedPosts() {
        List<Post> retryablePosts = postRepository.findRetryable();

        log.info("Retrying {} failed posts", retryablePosts.size());

        for (Post post : retryablePosts) {
            if (post.getTentativasPublicacao() < MAX_RETRY_ATTEMPTS) {
                try {
                    publishPost(post.getSalon().getId(), post.getId());
                } catch (Exception e) {
                    log.error("Retry failed for post {}: {}", post.getId(), e.getMessage());
                }
            }
        }
    }

    // ====================================
    // 7.5 Metrics Sync
    // ====================================

    /**
     * Sync metrics for a published post.
     */
    public Post syncPostMetrics(Long salonId, Long postId) {
        Post post = getPostBySalonAndId(salonId, postId);

        if (post.getStatus() != StatusPost.PUBLICADO) {
            throw new BusinessException("Can only sync metrics for published posts");
        }

        try {
            int totalLikes = 0;
            int totalComments = 0;
            int totalShares = 0;
            int totalReach = 0;

            for (PlataformaSocial plataforma : post.getPlataformas()) {
                try {
                    ContaSocial conta = socialAccountService.getAccountByPlatform(salonId, plataforma);

                    // Would need to store platform-specific post IDs
                    // For now, skip metrics sync for all platforms
                    if (plataforma == PlataformaSocial.INSTAGRAM ||
                        plataforma == PlataformaSocial.FACEBOOK ||
                        plataforma == PlataformaSocial.WHATSAPP_STATUS) {
                        continue;
                    }

                    // Future: Fetch metrics from Meta Graph API
                    // MetaGraphAPIService.PostMetrics metrics = metaGraphAPIService.getPostMetrics(...);
                    // totalLikes += metrics.likes();
                    // totalComments += metrics.comments();
                    // totalShares += metrics.shares();
                    // totalReach += metrics.reach();

                } catch (Exception e) {
                    log.warn("Failed to sync metrics from {}: {}", plataforma, e.getMessage());
                }
            }

            post.setCurtidas(totalLikes);
            post.setComentarios(totalComments);
            post.setCompartilhamentos(totalShares);
            post.setAlcance(totalReach);

            post = postRepository.save(post);

            log.info("Metrics synced for post: {}", postId);

        } catch (Exception e) {
            log.error("Error syncing metrics for post {}: {}", postId, e.getMessage());
        }

        return post;
    }

    // ====================================
    // Validation & Helper Methods
    // ====================================

    private void validatePostForPublishing(Post post) {
        if (post.getImagemUrl() == null || post.getImagemUrl().isBlank()) {
            throw new BusinessException("Post must have an image");
        }

        if (post.getPlataformas() == null || post.getPlataformas().isEmpty()) {
            throw new BusinessException("Post must have at least one target platform");
        }

        // Check if salon has active accounts for all platforms
        for (PlataformaSocial plataforma : post.getPlataformas()) {
            if (!socialAccountService.hasActiveAccount(post.getSalon().getId(), plataforma)) {
                throw new BusinessException("No active " + plataforma + " account connected");
            }
        }
    }

    private void validatePostLimits(Salon salon) {
        Plano plano = salon.getAdmin().getPlano();

        // Count posts in current month
        LocalDateTime inicioMes = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime fimMes = inicioMes.plusMonths(1).minusSeconds(1);

        long postsThisMonth = postRepository.countBySalonIdAndPeriod(salon.getId(), inicioMes, fimMes);

        long limit = switch (plano) {
            case FREE -> 5;
            case PRO -> 30;
            case PREMIUM -> Long.MAX_VALUE; // Unlimited
        };

        if (postsThisMonth >= limit) {
            throw new BusinessException("Post limit exceeded for plan: " + plano +
                ". Limit: " + (limit == Long.MAX_VALUE ? "unlimited" : limit));
        }
    }

    private String buildCaption(String legenda, List<String> hashtags) {
        StringBuilder caption = new StringBuilder();

        if (legenda != null && !legenda.isBlank()) {
            caption.append(legenda);
        }

        if (hashtags != null && !hashtags.isEmpty()) {
            if (caption.length() > 0) {
                caption.append("\n\n");
            }
            caption.append(String.join(" ", hashtags));
        }

        return caption.toString();
    }

    private Post getPostBySalonAndId(Long salonId, Long postId) {
        Salon salon = getSalonById(salonId);
        return postRepository.findByIdAndSalon(postId, salon)
            .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    }

    private Salon getSalonById(Long salonId) {
        return salonRepository.findById(salonId)
            .orElseThrow(() -> new ResourceNotFoundException("Salon not found"));
    }

    private Usuario getUsuarioById(Long usuarioId) {
        return usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    // ====================================
    // DTOs
    // ====================================

    public record PostCreateData(
        String imagemUrl,
        String imagemOriginalUrl,
        String thumbnailUrl,
        String legenda,
        List<String> hashtags,
        List<PlataformaSocial> plataformas
    ) {}

    public record PostUpdateData(
        String imagemUrl,
        String thumbnailUrl,
        String legenda,
        List<String> hashtags,
        List<PlataformaSocial> plataformas
    ) {}
}
