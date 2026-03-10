package com.belezza.api.controller;

import com.belezza.api.dto.post.PostCreateRequest;
import com.belezza.api.dto.post.PostResponse;
import com.belezza.api.dto.post.PostScheduleRequest;
import com.belezza.api.dto.post.PostUpdateRequest;
import com.belezza.api.entity.Post;
import com.belezza.api.entity.StatusPost;
import com.belezza.api.security.annotation.Authenticated;
import com.belezza.api.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for social media post management.
 * Handles post CRUD, publishing, scheduling, and metrics.
 */
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Posts", description = "Social media post management and publishing")
public class PostController {

    private final PostService postService;

    // ====================================
    // CRUD Operations
    // ====================================

    @PostMapping
    @Authenticated
    @Operation(
        summary = "Create post",
        description = "Create a new social media post as draft"
    )
    public ResponseEntity<PostResponse> createPost(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Valid @RequestBody PostCreateRequest request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        log.info("Create post for salon: {}", salonId);

        Long criadorId = extractUsuarioId(userDetails);

        PostService.PostCreateData data = new PostService.PostCreateData(
            request.getImagemUrl(),
            request.getImagemOriginalUrl(),
            request.getThumbnailUrl(),
            request.getLegenda(),
            request.getHashtags(),
            request.getPlataformas()
        );

        Post post = postService.createPost(salonId, criadorId, data);
        PostResponse response = PostResponse.fromEntity(post);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @Authenticated
    @Operation(
        summary = "Update post",
        description = "Update an existing post (only drafts or failed posts can be updated)"
    )
    public ResponseEntity<PostResponse> updatePost(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Post ID") @PathVariable Long id,
        @Valid @RequestBody PostUpdateRequest request
    ) {
        log.info("Update post: {} for salon: {}", id, salonId);

        PostService.PostUpdateData data = new PostService.PostUpdateData(
            request.getImagemUrl(),
            request.getThumbnailUrl(),
            request.getLegenda(),
            request.getHashtags(),
            request.getPlataformas()
        );

        Post post = postService.updatePost(salonId, id, data);
        PostResponse response = PostResponse.fromEntity(post);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @Authenticated
    @Operation(
        summary = "Get post",
        description = "Get post details by ID"
    )
    public ResponseEntity<PostResponse> getPost(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Post ID") @PathVariable Long id
    ) {
        log.info("Get post: {} for salon: {}", id, salonId);

        Post post = postService.getPost(salonId, id);
        PostResponse response = PostResponse.fromEntity(post);

        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Authenticated
    @Operation(
        summary = "List posts",
        description = "List all posts for a salon with pagination and optional status filter"
    )
    public ResponseEntity<Page<PostResponse>> listPosts(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Filter by status") @RequestParam(required = false) StatusPost status,
        @PageableDefault(size = 20, sort = "criadoEm") Pageable pageable
    ) {
        log.info("List posts for salon: {} with status: {}", salonId, status);

        Page<Post> posts = postService.listPosts(salonId, status, pageable);
        Page<PostResponse> response = posts.map(PostResponse::fromEntity);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Authenticated
    @Operation(
        summary = "Delete post",
        description = "Delete a post (only drafts, scheduled, or failed posts can be deleted)"
    )
    public ResponseEntity<Void> deletePost(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Post ID") @PathVariable Long id
    ) {
        log.info("Delete post: {} for salon: {}", id, salonId);

        postService.deletePost(salonId, id);

        return ResponseEntity.noContent().build();
    }

    // ====================================
    // 7.3 Publishing
    // ====================================

    @PostMapping("/{id}/publish")
    @Authenticated
    @Operation(
        summary = "Publish post",
        description = "Publish post immediately to all selected platforms. " +
                     "Post must be in DRAFT or FAILED status."
    )
    public ResponseEntity<PostResponse> publishPost(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Post ID") @PathVariable Long id
    ) {
        log.info("Publish post: {} for salon: {}", id, salonId);

        Post post = postService.publishPost(salonId, id);
        PostResponse response = PostResponse.fromEntity(post);

        return ResponseEntity.ok(response);
    }

    // ====================================
    // 7.4 Scheduling
    // ====================================

    @PostMapping("/{id}/schedule")
    @Authenticated
    @Operation(
        summary = "Schedule post",
        description = "Schedule post for future publishing. " +
                     "Post will be automatically published at the scheduled time."
    )
    public ResponseEntity<PostResponse> schedulePost(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Post ID") @PathVariable Long id,
        @Valid @RequestBody PostScheduleRequest request
    ) {
        log.info("Schedule post: {} for salon: {} at: {}", id, salonId, request.getAgendadoPara());

        Post post = postService.schedulePost(salonId, id, request.getAgendadoPara());
        PostResponse response = PostResponse.fromEntity(post);

        return ResponseEntity.ok(response);
    }

    // ====================================
    // 7.5 Metrics
    // ====================================

    @PostMapping("/{id}/sync-metrics")
    @Authenticated
    @Operation(
        summary = "Sync post metrics",
        description = "Sync engagement metrics (likes, comments, shares) from social platforms. " +
                     "Only works for published posts."
    )
    public ResponseEntity<PostResponse> syncMetrics(
        @Parameter(description = "Salon ID") @RequestParam Long salonId,
        @Parameter(description = "Post ID") @PathVariable Long id
    ) {
        log.info("Sync metrics for post: {} in salon: {}", id, salonId);

        Post post = postService.syncPostMetrics(salonId, id);
        PostResponse response = PostResponse.fromEntity(post);

        return ResponseEntity.ok(response);
    }

    // ====================================
    // Helper Methods
    // ====================================

    private Long extractUsuarioId(UserDetails userDetails) {
        // This would be extracted from your custom UserDetails implementation
        // For now, returning a placeholder
        // TODO: Implement proper user ID extraction
        return 1L;
    }
}
