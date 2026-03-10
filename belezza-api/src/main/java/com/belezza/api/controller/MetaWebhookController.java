package com.belezza.api.controller;

import com.belezza.api.entity.Post;
import com.belezza.api.entity.StatusPost;
import com.belezza.api.repository.PostRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * Webhook controller for Meta Graph API callbacks.
 * Handles verification and event notifications from Instagram/Facebook.
 */
@RestController
@RequestMapping("/api/webhooks/meta")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Meta Graph API webhook endpoints")
public class MetaWebhookController {

    private final PostRepository postRepository;

    @Value("${meta.webhook.verify-token:belezza_webhook_verify_token}")
    private String verifyToken;

    /**
     * Webhook verification endpoint.
     * Meta will call this endpoint to verify the webhook URL during setup.
     */
    @GetMapping
    @Operation(
        summary = "Webhook verification",
        description = "Meta webhook verification endpoint. " +
                     "Validates the verify token and returns the challenge."
    )
    public ResponseEntity<?> verifyWebhook(
        @RequestParam("hub.mode") String mode,
        @RequestParam("hub.challenge") String challenge,
        @RequestParam("hub.verify_token") String token
    ) {
        log.info("Webhook verification request. Mode: {}, Token: {}", mode, token);

        // Verify mode and token
        if ("subscribe".equals(mode) && verifyToken.equals(token)) {
            log.info("Webhook verified successfully");
            // Return challenge as plain text
            return ResponseEntity.ok(challenge);
        }

        log.warn("Webhook verification failed. Invalid token or mode");
        return ResponseEntity.status(403).body("Verification failed");
    }

    /**
     * Webhook events endpoint.
     * Receives notifications from Meta about post updates, metrics, etc.
     */
    @PostMapping
    @Operation(
        summary = "Receive webhook events",
        description = "Receives event notifications from Meta (Instagram/Facebook). " +
                     "Processes post updates, metrics changes, and other events."
    )
    public ResponseEntity<String> handleWebhook(@RequestBody Map<String, Object> payload) {
        log.info("Webhook event received: {}", payload);

        try {
            // Parse webhook payload
            String object = (String) payload.get("object");

            if ("instagram".equals(object) || "page".equals(object)) {
                // Process entries
                if (payload.containsKey("entry")) {
                    java.util.List<Map<String, Object>> entries =
                        (java.util.List<Map<String, Object>>) payload.get("entry");

                    for (Map<String, Object> entry : entries) {
                        processEntry(entry);
                    }
                }
            }

            // Always return 200 OK to acknowledge receipt
            return ResponseEntity.ok("EVENT_RECEIVED");

        } catch (Exception e) {
            log.error("Error processing webhook: {}", e.getMessage(), e);
            // Still return 200 to avoid retries
            return ResponseEntity.ok("EVENT_RECEIVED");
        }
    }

    /**
     * Process a single webhook entry.
     */
    private void processEntry(Map<String, Object> entry) {
        try {
            String id = (String) entry.get("id");
            Long time = (Long) entry.get("time");

            log.debug("Processing entry: {} at {}", id, time);

            // Process changes
            if (entry.containsKey("changes")) {
                java.util.List<Map<String, Object>> changes =
                    (java.util.List<Map<String, Object>>) entry.get("changes");

                for (Map<String, Object> change : changes) {
                    processChange(change);
                }
            }

        } catch (Exception e) {
            log.error("Error processing entry: {}", e.getMessage(), e);
        }
    }

    /**
     * Process a single change event.
     */
    private void processChange(Map<String, Object> change) {
        try {
            String field = (String) change.get("field");
            Map<String, Object> value = (Map<String, Object>) change.get("value");

            log.debug("Processing change - Field: {}, Value: {}", field, value);

            switch (field) {
                case "comments":
                    handleCommentEvent(value);
                    break;

                case "likes":
                    handleLikeEvent(value);
                    break;

                case "shares":
                    handleShareEvent(value);
                    break;

                case "reactions":
                    handleReactionEvent(value);
                    break;

                case "feed":
                    handleFeedEvent(value);
                    break;

                default:
                    log.debug("Unhandled field type: {}", field);
            }

        } catch (Exception e) {
            log.error("Error processing change: {}", e.getMessage(), e);
        }
    }

    /**
     * Handle comment events.
     */
    private void handleCommentEvent(Map<String, Object> value) {
        log.info("Comment event received: {}", value);

        String postId = extractPostId(value);
        if (postId != null) {
            updatePostMetric(postId, "comentarios", 1);
        }
    }

    /**
     * Handle like events.
     */
    private void handleLikeEvent(Map<String, Object> value) {
        log.info("Like event received: {}", value);

        String postId = extractPostId(value);
        if (postId != null) {
            updatePostMetric(postId, "curtidas", 1);
        }
    }

    /**
     * Handle share events.
     */
    private void handleShareEvent(Map<String, Object> value) {
        log.info("Share event received: {}", value);

        String postId = extractPostId(value);
        if (postId != null) {
            updatePostMetric(postId, "compartilhamentos", 1);
        }
    }

    /**
     * Handle reaction events.
     */
    private void handleReactionEvent(Map<String, Object> value) {
        log.info("Reaction event received: {}", value);

        String postId = extractPostId(value);
        if (postId != null) {
            updatePostMetric(postId, "curtidas", 1);
        }
    }

    /**
     * Handle feed events (post published, deleted, etc).
     */
    private void handleFeedEvent(Map<String, Object> value) {
        log.info("Feed event received: {}", value);

        String verb = (String) value.get("verb");
        String postId = extractPostId(value);

        if (postId == null) {
            return;
        }

        if ("add".equals(verb)) {
            log.info("Post published confirmation for: {}", postId);
        } else if ("remove".equals(verb) || "delete".equals(verb)) {
            log.info("Post removed: {}", postId);
        }
    }

    /**
     * Extract post ID from webhook value.
     */
    private String extractPostId(Map<String, Object> value) {
        // Try different field names used by Meta
        if (value.containsKey("media_id")) {
            return (String) value.get("media_id");
        }
        if (value.containsKey("post_id")) {
            return (String) value.get("post_id");
        }
        if (value.containsKey("id")) {
            return (String) value.get("id");
        }
        return null;
    }

    /**
     * Update post metric by incrementing the counter.
     */
    private void updatePostMetric(String externalPostId, String metricType, int increment) {
        try {
            // Note: We would need to store externalPostId in Post entity to map properly
            // For now, log the update request
            log.info("Metric update requested - Post: {}, Type: {}, Increment: {}",
                externalPostId, metricType, increment);

            // Future enhancement: Add external_post_id column to posts table
            // and query by that to update metrics

        } catch (Exception e) {
            log.error("Error updating post metric: {}", e.getMessage());
        }
    }
}
