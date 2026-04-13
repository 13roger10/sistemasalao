package com.belezza.api.service;

import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.MetaGraphAPIService;
import com.belezza.api.integration.WhatsAppService;
import com.belezza.api.repository.PostRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.AesEncryptionService;
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
    private final AesEncryptionService aesEncryptionService;
    private final NotificacaoService notificacaoService;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final EquipeStudioService equipeStudioService;

    private static final int MAX_RETRY_ATTEMPTS = 3;

    // Back-off delays in minutes for each attempt index (0-based)
    // attempt 1 failed → wait  5 min before attempt 2
    // attempt 2 failed → wait 30 min before attempt 3
    // attempt 3 failed → definitive failure, no more retries
    private static final int[] BACKOFF_MINUTES = {5, 30, 120};

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
                post.setProximaTentativaEm(null);
                log.info("Post published successfully: {}", postId);
            } else {
                handlePublishFailure(post, errors.toString());
            }

        } catch (Exception e) {
            handlePublishFailure(post, e.getMessage());
            log.error("Error publishing post {}: {}", postId, e.getMessage(), e);
        }

        return postRepository.save(post);
    }

    /**
     * Publish to a specific platform.
     */
    private void publishToPlatform(Post post, PlataformaSocial plataforma) {
        Long salonId = post.getSalon().getId();

        // Retrieve account; decrypt token (it is AES-256-GCM encrypted at rest)
        ContaSocial conta = socialAccountService.getAccountByPlatform(salonId, plataforma);
        String plainToken = aesEncryptionService.decrypt(conta.getAccessToken());

        // Build caption with hashtags
        String caption = buildCaption(post.getLegenda(), post.getHashtags());

        MetaGraphAPIService.PublishRequest request = new MetaGraphAPIService.PublishRequest(
            post.getImagemUrl(),
            caption
        );

        MetaGraphAPIService.PublishResponse response;

        if (plataforma == PlataformaSocial.INSTAGRAM) {
            response = metaGraphAPIService.publishToInstagram(plainToken, conta.getAccountId(), request);
        } else if (plataforma == PlataformaSocial.FACEBOOK) {
            response = metaGraphAPIService.publishToFacebook(plainToken, conta.getAccountId(), request);
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
        List<Post> retryablePosts = postRepository.findRetryable(MAX_RETRY_ATTEMPTS, LocalDateTime.now());

        log.info("Retrying {} failed posts whose back-off window has elapsed", retryablePosts.size());

        for (Post post : retryablePosts) {
            try {
                publishPost(post.getSalon().getId(), post.getId());
            } catch (Exception e) {
                log.error("Retry failed for post {}: {}", post.getId(), e.getMessage());
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

    // ====================================
    // Back-off & Failure Handling
    // ====================================

    /**
     * Called whenever a publish attempt fails.
     * Schedules the next retry or marks the post as definitively failed.
     */
    private void handlePublishFailure(Post post, String errorMessage) {
        int attempts = post.getTentativasPublicacao(); // already incremented before publish attempt

        post.setStatus(StatusPost.FALHOU);
        post.setPublishErrorMessage(
            errorMessage != null && errorMessage.length() > 500
                ? errorMessage.substring(0, 497) + "..."
                : errorMessage
        );

        if (attempts < MAX_RETRY_ATTEMPTS) {
            // Schedule next retry using exponential back-off
            int delayMinutes = BACKOFF_MINUTES[attempts - 1]; // index: attempt 1→[0], 2→[1], 3→[2]
            post.setProximaTentativaEm(LocalDateTime.now().plusMinutes(delayMinutes));
            log.warn("Post {} failed (attempt {}/{}). Next retry in {} min at {}",
                post.getId(), attempts, MAX_RETRY_ATTEMPTS, delayMinutes, post.getProximaTentativaEm());
        } else {
            // All retries exhausted — mark as definitively failed and notify
            post.setProximaTentativaEm(null);
            log.error("Post {} failed permanently after {} attempts. Notifying owner.", post.getId(), attempts);
            notificarFalhaDefinitiva(post);
        }
    }

    /**
     * Sends in-app notification, email, and WhatsApp message to the post creator
     * when all retry attempts are exhausted.
     */
    private void notificarFalhaDefinitiva(Post post) {
        Usuario criador = post.getCriador();

        // 1. In-app notification
        try {
            String titulo = "Falha na publicacao do post";
            String mensagem = String.format(
                "Seu post #%d nao pôde ser publicado apos %d tentativas. Verifique a conexao das redes sociais.",
                post.getId(), MAX_RETRY_ATTEMPTS
            );
            String link = "/admin/social-studio";
            notificacaoService.criarNotificacao(criador, TipoNotificacao.POST_FALHOU, titulo, mensagem, link, null);
        } catch (Exception e) {
            log.error("Failed to create in-app notification for post failure {}: {}", post.getId(), e.getMessage());
        }

        // 2. Email notification
        try {
            emailService.sendPostFailureEmail(
                criador.getEmail(),
                criador.getNome(),
                post.getId().toString(),
                post.getPublishErrorMessage()
            );
        } catch (Exception e) {
            log.error("Failed to send failure email for post {}: {}", post.getId(), e.getMessage());
        }

        // 3. WhatsApp notification (only if phone number is available)
        try {
            String telefone = criador.getTelefone();
            if (telefone != null && !telefone.isBlank()) {
                String mensagemWpp = String.format(
                    "Belezza.ai: Seu post #%d nao pôde ser publicado apos %d tentativas. " +
                    "Acesse a plataforma para reagendar ou verificar a conexao das redes sociais.",
                    post.getId(), MAX_RETRY_ATTEMPTS
                );
                whatsAppService.enviarMensagemDireta(telefone, mensagemWpp);
            }
        } catch (Exception e) {
            log.error("Failed to send WhatsApp notification for post failure {}: {}", post.getId(), e.getMessage());
        }
    }

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

    /** Lightweight projection used by the scheduler to dispatch jobs. */
    public record PostDispatchInfo(Long postId, Long salonId) {}

    // ====================================
    // Scheduler Dispatch Helpers
    // ====================================

    /**
     * Returns posts that are scheduled and ready to publish now.
     * The scheduler uses this list to dispatch via {@code PostPublishGateway}.
     */
    @Transactional(readOnly = true)
    public List<PostDispatchInfo> findReadyPosts() {
        return postRepository.findReadyToPublish(LocalDateTime.now()).stream()
            .map(p -> new PostDispatchInfo(p.getId(), p.getSalon().getId()))
            .toList();
    }

    /**
     * Returns failed posts whose back-off window has elapsed and that still
     * have retry attempts remaining.
     * The scheduler uses this list to dispatch via {@code PostPublishGateway}.
     */
    @Transactional(readOnly = true)
    public List<PostDispatchInfo> findRetryablePosts() {
        return postRepository.findRetryable(MAX_RETRY_ATTEMPTS, LocalDateTime.now()).stream()
            .map(p -> new PostDispatchInfo(p.getId(), p.getSalon().getId()))
            .toList();
    }
}
