package com.belezza.api.scheduler;

import com.belezza.api.messaging.PostPublishGateway;
import com.belezza.api.service.PostService;
import com.belezza.api.service.SocialAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Scheduled job for processing social media posts.
 *
 * Dispatches publish jobs through {@link PostPublishGateway}:
 *   - In production (RabbitMQ enabled): posts are enqueued asynchronously.
 *   - In development (RabbitMQ disabled): posts are published inline.
 *
 * This job is only responsible for FINDING posts that are ready and
 * DISPATCHING them — actual publishing logic lives in PostService and
 * is invoked by PostPublishConsumer (or DirectPostPublishGateway).
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PublicacaoAgendadaJob {

    private final PostService postService;
    private final SocialAccountService socialAccountService;
    private final PostPublishGateway postPublishGateway;

    /**
     * Find scheduled posts that are ready to publish and dispatch them.
     * Runs every minute.
     */
    @Scheduled(cron = "0 * * * * *")
    public void processScheduledPosts() {
        log.debug("Checking for scheduled posts ready to publish");

        try {
            List<PostService.PostDispatchInfo> ready = postService.findReadyPosts();

            if (!ready.isEmpty()) {
                log.info("Dispatching {} scheduled post(s) for publishing", ready.size());
                ready.forEach(p -> {
                    try {
                        postPublishGateway.enqueue(p.postId(), p.salonId());
                    } catch (Exception e) {
                        log.error("Failed to dispatch post {} (salon {}): {}",
                            p.postId(), p.salonId(), e.getMessage(), e);
                    }
                });
            }
        } catch (Exception e) {
            log.error("Error querying scheduled posts: {}", e.getMessage(), e);
        }
    }

    /**
     * Find failed posts whose back-off window has elapsed and dispatch them for retry.
     * Runs every minute — the shortest back-off interval is 5 min.
     */
    @Scheduled(cron = "0 * * * * *")
    public void retryFailedPosts() {
        log.debug("Checking for retryable failed posts");

        try {
            List<PostService.PostDispatchInfo> retryable = postService.findRetryablePosts();

            if (!retryable.isEmpty()) {
                log.info("Dispatching {} failed post(s) for retry", retryable.size());
                retryable.forEach(p -> {
                    try {
                        postPublishGateway.enqueue(p.postId(), p.salonId());
                    } catch (Exception e) {
                        log.error("Failed to dispatch retry for post {} (salon {}): {}",
                            p.postId(), p.salonId(), e.getMessage(), e);
                    }
                });
            }
        } catch (Exception e) {
            log.error("Error querying retryable posts: {}", e.getMessage(), e);
        }
    }

    /**
     * Auto-refresh OAuth tokens expiring within 7 days.
     * Runs daily at 3 AM.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void autoRefreshTokens() {
        log.info("Running token auto-refresh job");

        try {
            socialAccountService.autoRefreshExpiringTokens();
        } catch (Exception e) {
            log.error("Error auto-refreshing tokens: {}", e.getMessage(), e);
        }
    }
}
