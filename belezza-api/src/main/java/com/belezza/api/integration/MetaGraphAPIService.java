package com.belezza.api.integration;

import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.exception.BusinessException;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for Meta Graph API integration (Instagram & Facebook).
 * Handles OAuth, media upload, and post publishing.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MetaGraphAPIService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${meta.api.base-url:https://graph.facebook.com}")
    private String baseUrl;

    @Value("${meta.api.version:v19.0}")
    private String apiVersion;

    @Value("${meta.app.id:}")
    private String appId;

    @Value("${meta.app.secret:}")
    private String appSecret;

    @Value("${meta.oauth.redirect-uri:http://localhost:3000/callback}")
    private String redirectUri;

    private static final String OAUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
    private static final String TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";

    // ====================================
    // 7.1 OAuth Flow
    // ====================================

    /**
     * Generate OAuth authorization URL for Instagram.
     */
    public String getInstagramAuthUrl(String state) {
        return UriComponentsBuilder.fromHttpUrl(OAUTH_URL)
            .queryParam("client_id", appId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("state", state)
            .queryParam("scope", "instagram_basic,instagram_content_publish,pages_read_engagement")
            .queryParam("response_type", "code")
            .build()
            .toUriString();
    }

    /**
     * Generate OAuth authorization URL for Facebook.
     */
    public String getFacebookAuthUrl(String state) {
        return UriComponentsBuilder.fromHttpUrl(OAUTH_URL)
            .queryParam("client_id", appId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("state", state)
            .queryParam("scope", "pages_manage_posts,pages_read_engagement,pages_show_list")
            .queryParam("response_type", "code")
            .build()
            .toUriString();
    }

    /**
     * Exchange authorization code for access token.
     */
    public TokenResponse exchangeCodeForToken(String code) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(TOKEN_URL)
                .queryParam("client_id", appId)
                .queryParam("client_secret", appSecret)
                .queryParam("redirect_uri", redirectUri)
                .queryParam("code", code)
                .build()
                .toUriString();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                String accessToken = (String) body.get("access_token");
                Integer expiresIn = (Integer) body.get("expires_in");

                // Get long-lived token
                TokenResponse longLivedToken = exchangeForLongLivedToken(accessToken);

                log.info("Token exchange successful. Expires in: {} seconds", expiresIn);
                return longLivedToken;
            }

            throw new BusinessException("Failed to exchange code for token");

        } catch (RestClientException e) {
            log.error("Error exchanging code for token: {}", e.getMessage(), e);
            throw new BusinessException("Failed to exchange authorization code: " + e.getMessage());
        }
    }

    /**
     * Exchange short-lived token for long-lived token (60 days).
     */
    public TokenResponse exchangeForLongLivedToken(String shortLivedToken) {
        try {
            String url = buildApiUrl("/oauth/access_token");

            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(url)
                .queryParam("grant_type", "fb_exchange_token")
                .queryParam("client_id", appId)
                .queryParam("client_secret", appSecret)
                .queryParam("fb_exchange_token", shortLivedToken);

            ResponseEntity<Map> response = restTemplate.getForEntity(builder.toUriString(), Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                return TokenResponse.builder()
                    .accessToken((String) body.get("access_token"))
                    .tokenType((String) body.get("token_type"))
                    .expiresIn((Integer) body.get("expires_in"))
                    .build();
            }

            throw new BusinessException("Failed to get long-lived token");

        } catch (RestClientException e) {
            log.error("Error getting long-lived token: {}", e.getMessage(), e);
            throw new BusinessException("Failed to get long-lived token: " + e.getMessage());
        }
    }

    /**
     * Refresh access token.
     */
    public TokenResponse refreshToken(String currentToken) {
        // For Meta, we exchange the current token for a new long-lived token
        return exchangeForLongLivedToken(currentToken);
    }

    /**
     * Get account info (Instagram Business Account or Facebook Page).
     */
    public AccountInfo getAccountInfo(String accessToken, PlataformaSocial plataforma) {
        try {
            String url;

            if (plataforma == PlataformaSocial.INSTAGRAM) {
                // Get Instagram Business Account
                url = buildApiUrl("/me/accounts");
                url = UriComponentsBuilder.fromHttpUrl(url)
                    .queryParam("access_token", accessToken)
                    .queryParam("fields", "instagram_business_account{id,username,profile_picture_url}")
                    .build()
                    .toUriString();
            } else {
                // Get Facebook Page
                url = buildApiUrl("/me/accounts");
                url = UriComponentsBuilder.fromHttpUrl(url)
                    .queryParam("access_token", accessToken)
                    .queryParam("fields", "id,name,picture")
                    .build()
                    .toUriString();
            }

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                // Parse first account from data array
                if (body.containsKey("data") && body.get("data") instanceof java.util.List) {
                    java.util.List<Map<String, Object>> accounts = (java.util.List<Map<String, Object>>) body.get("data");

                    if (!accounts.isEmpty()) {
                        Map<String, Object> account = accounts.get(0);

                        if (plataforma == PlataformaSocial.INSTAGRAM && account.containsKey("instagram_business_account")) {
                            Map<String, Object> igAccount = (Map<String, Object>) account.get("instagram_business_account");
                            return AccountInfo.builder()
                                .accountId((String) igAccount.get("id"))
                                .accountName((String) igAccount.get("username"))
                                .accountImageUrl((String) igAccount.get("profile_picture_url"))
                                .build();
                        } else if (plataforma == PlataformaSocial.FACEBOOK) {
                            Map<String, Object> picture = (Map<String, Object>) account.get("picture");
                            Map<String, Object> pictureData = (Map<String, Object>) picture.get("data");

                            return AccountInfo.builder()
                                .accountId((String) account.get("id"))
                                .accountName((String) account.get("name"))
                                .accountImageUrl((String) pictureData.get("url"))
                                .build();
                        }
                    }
                }
            }

            throw new BusinessException("No account found for platform: " + plataforma);

        } catch (RestClientException e) {
            log.error("Error getting account info: {}", e.getMessage(), e);
            throw new BusinessException("Failed to get account info: " + e.getMessage());
        }
    }

    // ====================================
    // 7.3 Publishing
    // ====================================

    /**
     * Publish post to Instagram.
     */
    public PublishResponse publishToInstagram(String accessToken, String accountId, PublishRequest request) {
        try {
            log.info("Publishing to Instagram account: {}", accountId);

            // Step 1: Create media container
            String containerUrl = buildApiUrl("/" + accountId + "/media");

            Map<String, Object> containerParams = new HashMap<>();
            containerParams.put("image_url", request.imageUrl());
            containerParams.put("caption", request.caption());
            containerParams.put("access_token", accessToken);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> containerEntity = new HttpEntity<>(containerParams, headers);
            ResponseEntity<Map> containerResponse = restTemplate.postForEntity(containerUrl, containerEntity, Map.class);

            if (!containerResponse.getStatusCode().is2xxSuccessful() || containerResponse.getBody() == null) {
                throw new BusinessException("Failed to create Instagram media container");
            }

            String creationId = (String) containerResponse.getBody().get("id");

            // Step 2: Publish the media container
            String publishUrl = buildApiUrl("/" + accountId + "/media_publish");

            Map<String, Object> publishParams = new HashMap<>();
            publishParams.put("creation_id", creationId);
            publishParams.put("access_token", accessToken);

            HttpEntity<Map<String, Object>> publishEntity = new HttpEntity<>(publishParams, headers);
            ResponseEntity<Map> publishResponse = restTemplate.postForEntity(publishUrl, publishEntity, Map.class);

            if (publishResponse.getStatusCode().is2xxSuccessful() && publishResponse.getBody() != null) {
                String postId = (String) publishResponse.getBody().get("id");

                log.info("Instagram post published successfully. Post ID: {}", postId);

                return PublishResponse.builder()
                    .postId(postId)
                    .success(true)
                    .build();
            }

            throw new BusinessException("Failed to publish Instagram media");

        } catch (RestClientException e) {
            log.error("Error publishing to Instagram: {}", e.getMessage(), e);
            return PublishResponse.builder()
                .success(false)
                .errorMessage("Failed to publish to Instagram: " + e.getMessage())
                .build();
        }
    }

    /**
     * Publish post to Facebook Page.
     */
    public PublishResponse publishToFacebook(String accessToken, String pageId, PublishRequest request) {
        try {
            log.info("Publishing to Facebook page: {}", pageId);

            String url = buildApiUrl("/" + pageId + "/photos");

            Map<String, Object> params = new HashMap<>();
            params.put("url", request.imageUrl());
            params.put("caption", request.caption());
            params.put("access_token", accessToken);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(params, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String postId = (String) response.getBody().get("id");

                log.info("Facebook post published successfully. Post ID: {}", postId);

                return PublishResponse.builder()
                    .postId(postId)
                    .success(true)
                    .build();
            }

            throw new BusinessException("Failed to publish to Facebook");

        } catch (RestClientException e) {
            log.error("Error publishing to Facebook: {}", e.getMessage(), e);
            return PublishResponse.builder()
                .success(false)
                .errorMessage("Failed to publish to Facebook: " + e.getMessage())
                .build();
        }
    }

    // ====================================
    // 7.5 Metrics
    // ====================================

    /**
     * Get post insights/metrics from Instagram.
     */
    public PostMetrics getInstagramPostMetrics(String accessToken, String postId) {
        try {
            String url = buildApiUrl("/" + postId);
            url = UriComponentsBuilder.fromHttpUrl(url)
                .queryParam("fields", "like_count,comments_count,media_url,timestamp")
                .queryParam("access_token", accessToken)
                .build()
                .toUriString();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                return PostMetrics.builder()
                    .likes((Integer) body.getOrDefault("like_count", 0))
                    .comments((Integer) body.getOrDefault("comments_count", 0))
                    .shares(0) // Instagram API doesn't provide shares
                    .reach(0) // Requires additional API call to insights
                    .build();
            }

            return PostMetrics.builder().build();

        } catch (RestClientException e) {
            log.error("Error getting Instagram metrics: {}", e.getMessage(), e);
            return PostMetrics.builder().build();
        }
    }

    /**
     * Get post insights/metrics from Facebook.
     */
    public PostMetrics getFacebookPostMetrics(String accessToken, String postId) {
        try {
            String url = buildApiUrl("/" + postId);
            url = UriComponentsBuilder.fromHttpUrl(url)
                .queryParam("fields", "likes.summary(true),comments.summary(true),shares")
                .queryParam("access_token", accessToken)
                .build()
                .toUriString();

            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();

                int likes = 0;
                if (body.containsKey("likes")) {
                    Map<String, Object> likesData = (Map<String, Object>) body.get("likes");
                    Map<String, Object> summary = (Map<String, Object>) likesData.get("summary");
                    likes = (Integer) summary.getOrDefault("total_count", 0);
                }

                int comments = 0;
                if (body.containsKey("comments")) {
                    Map<String, Object> commentsData = (Map<String, Object>) body.get("comments");
                    Map<String, Object> summary = (Map<String, Object>) commentsData.get("summary");
                    comments = (Integer) summary.getOrDefault("total_count", 0);
                }

                int shares = 0;
                if (body.containsKey("shares")) {
                    Map<String, Object> sharesData = (Map<String, Object>) body.get("shares");
                    shares = (Integer) sharesData.getOrDefault("count", 0);
                }

                return PostMetrics.builder()
                    .likes(likes)
                    .comments(comments)
                    .shares(shares)
                    .reach(0) // Requires additional API call to insights
                    .build();
            }

            return PostMetrics.builder().build();

        } catch (RestClientException e) {
            log.error("Error getting Facebook metrics: {}", e.getMessage(), e);
            return PostMetrics.builder().build();
        }
    }

    // ====================================
    // Helper Methods
    // ====================================

    private String buildApiUrl(String path) {
        return baseUrl + "/" + apiVersion + path;
    }

    // ====================================
    // DTOs
    // ====================================

    public record TokenResponse(
        String accessToken,
        String tokenType,
        Integer expiresIn
    ) {
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private String accessToken;
            private String tokenType;
            private Integer expiresIn;

            public Builder accessToken(String accessToken) {
                this.accessToken = accessToken;
                return this;
            }

            public Builder tokenType(String tokenType) {
                this.tokenType = tokenType;
                return this;
            }

            public Builder expiresIn(Integer expiresIn) {
                this.expiresIn = expiresIn;
                return this;
            }

            public TokenResponse build() {
                return new TokenResponse(accessToken, tokenType, expiresIn);
            }
        }
    }

    public record AccountInfo(
        String accountId,
        String accountName,
        String accountImageUrl
    ) {
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private String accountId;
            private String accountName;
            private String accountImageUrl;

            public Builder accountId(String accountId) {
                this.accountId = accountId;
                return this;
            }

            public Builder accountName(String accountName) {
                this.accountName = accountName;
                return this;
            }

            public Builder accountImageUrl(String accountImageUrl) {
                this.accountImageUrl = accountImageUrl;
                return this;
            }

            public AccountInfo build() {
                return new AccountInfo(accountId, accountName, accountImageUrl);
            }
        }
    }

    public record PublishRequest(
        String imageUrl,
        String caption
    ) {}

    public record PublishResponse(
        boolean success,
        String postId,
        String errorMessage
    ) {
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private boolean success;
            private String postId;
            private String errorMessage;

            public Builder success(boolean success) {
                this.success = success;
                return this;
            }

            public Builder postId(String postId) {
                this.postId = postId;
                return this;
            }

            public Builder errorMessage(String errorMessage) {
                this.errorMessage = errorMessage;
                return this;
            }

            public PublishResponse build() {
                return new PublishResponse(success, postId, errorMessage);
            }
        }
    }

    public record PostMetrics(
        int likes,
        int comments,
        int shares,
        int reach
    ) {
        public static Builder builder() {
            return new Builder();
        }

        public static class Builder {
            private int likes;
            private int comments;
            private int shares;
            private int reach;

            public Builder likes(int likes) {
                this.likes = likes;
                return this;
            }

            public Builder comments(int comments) {
                this.comments = comments;
                return this;
            }

            public Builder shares(int shares) {
                this.shares = shares;
                return this;
            }

            public Builder reach(int reach) {
                this.reach = reach;
                return this;
            }

            public PostMetrics build() {
                return new PostMetrics(likes, comments, shares, reach);
            }
        }
    }
}
