package com.belezza.api.scheduler;

import com.belezza.api.service.PostService;
import com.belezza.api.service.SocialAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job for processing social media posts.
 * Handles:
 * - Publishing scheduled posts
 * - Retrying failed posts
 * - Auto-refreshing expiring tokens
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class PublicacaoAgendadaJob {

    private final PostService postService;
    private final SocialAccountService socialAccountService;

    /**
     * Process scheduled posts that are ready to publish.
     * Runs every minute.
     */
    @Scheduled(cron = "0 * * * * *") // Every minute at :00 seconds
    public void processScheduledPosts() {
        log.debug("Running scheduled posts job");

        try {
            postService.processScheduledPosts();
        } catch (Exception e) {
            log.error("Error processing scheduled posts: {}", e.getMessage(), e);
        }
    }

    /**
     * Retry failed posts.
     * Runs every 15 minutes.
     */
    @Scheduled(cron = "0 */15 * * * *") // Every 15 minutes
    public void retryFailedPosts() {
        log.debug("Running failed posts retry job");

        try {
            postService.retryFailedPosts();
        } catch (Exception e) {
            log.error("Error retrying failed posts: {}", e.getMessage(), e);
        }
    }

    /**
     * Auto-refresh expiring access tokens.
     * Runs daily at 3 AM.
     */
    @Scheduled(cron = "0 0 3 * * *") // Daily at 3:00 AM
    public void autoRefreshTokens() {
        log.info("Running token auto-refresh job");

        try {
            socialAccountService.autoRefreshExpiringTokens();
        } catch (Exception e) {
            log.error("Error auto-refreshing tokens: {}", e.getMessage(), e);
        }
    }
}
