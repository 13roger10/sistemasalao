package com.belezza.api.service;

import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.integration.MetaGraphAPIService;
import com.belezza.api.repository.PostRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PostService Tests")
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private SalonRepository salonRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private SocialAccountService socialAccountService;

    @Mock
    private MetaGraphAPIService metaGraphAPIService;

    @InjectMocks
    private PostService postService;

    private Salon salon;
    private Usuario usuario;
    private Post post;
    private ContaSocial contaSocial;

    @BeforeEach
    void setUp() {
        usuario = Usuario.builder()
                .id(1L)
                .email("admin@test.com")
                .nome("Admin Teste")
                .role(Role.ADMIN)
                .plano(Plano.PRO)
                .ativo(true)
                .build();

        salon = Salon.builder()
                .id(1L)
                .nome("Salão Teste")
                .admin(usuario)
                .build();

        post = Post.builder()
                .id(1L)
                .salon(salon)
                .criador(usuario)
                .imagemUrl("https://example.com/image.jpg")
                .imagemOriginalUrl("https://example.com/original.jpg")
                .thumbnailUrl("https://example.com/thumb.jpg")
                .legenda("Teste de legenda")
                .hashtags(List.of("#beleza", "#salao"))
                .plataformas(List.of(PlataformaSocial.INSTAGRAM))
                .status(StatusPost.RASCUNHO)
                .build();

        contaSocial = ContaSocial.builder()
                .id(1L)
                .salon(salon)
                .plataforma(PlataformaSocial.INSTAGRAM)
                .accountId("123456789")
                .accessToken("token-123")
                .ativa(true)
                .build();
    }

    @Nested
    @DisplayName("Create Post Tests")
    class CreatePostTests {

        @Test
        @DisplayName("Should create post successfully")
        void shouldCreatePostSuccessfully() {
            // Given
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(usuarioRepository.findById(1L)).thenReturn(Optional.of(usuario));
            when(postRepository.countBySalonIdAndPeriod(anyLong(), any(), any())).thenReturn(0L);
            when(postRepository.save(any(Post.class))).thenReturn(post);

            PostService.PostCreateData data = new PostService.PostCreateData(
                "https://example.com/image.jpg",
                "https://example.com/original.jpg",
                "https://example.com/thumb.jpg",
                "Teste de legenda",
                List.of("#beleza"),
                List.of(PlataformaSocial.INSTAGRAM)
            );

            // When
            Post result = postService.createPost(1L, 1L, data);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(StatusPost.RASCUNHO);
            verify(postRepository).save(any(Post.class));
        }

        @Test
        @DisplayName("Should throw exception when salon not found")
        void shouldThrowExceptionWhenSalonNotFound() {
            // Given
            when(salonRepository.findById(999L)).thenReturn(Optional.empty());

            PostService.PostCreateData data = new PostService.PostCreateData(
                "https://example.com/image.jpg", null, null, "Legenda", null, null
            );

            // When/Then
            assertThatThrownBy(() -> postService.createPost(999L, 1L, data))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Update Post Tests")
    class UpdatePostTests {

        @Test
        @DisplayName("Should update draft post successfully")
        void shouldUpdateDraftPostSuccessfully() {
            // Given
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(postRepository.save(any(Post.class))).thenReturn(post);

            PostService.PostUpdateData data = new PostService.PostUpdateData(
                null, null, "Nova legenda", null, null
            );

            // When
            Post result = postService.updatePost(1L, 1L, data);

            // Then
            assertThat(result).isNotNull();
            verify(postRepository).save(any(Post.class));
        }

        @Test
        @DisplayName("Should throw exception when updating published post")
        void shouldThrowExceptionWhenUpdatingPublishedPost() {
            // Given
            post.setStatus(StatusPost.PUBLICADO);
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));

            PostService.PostUpdateData data = new PostService.PostUpdateData(
                null, null, "Nova legenda", null, null
            );

            // When/Then
            assertThatThrownBy(() -> postService.updatePost(1L, 1L, data))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot update post");
        }

        @Test
        @DisplayName("Should reset failed post to draft on update")
        void shouldResetFailedPostToDraftOnUpdate() {
            // Given
            post.setStatus(StatusPost.FALHOU);
            post.setTentativasPublicacao(2);
            post.setPublishErrorMessage("Error");
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

            PostService.PostUpdateData data = new PostService.PostUpdateData(
                null, null, "Nova legenda", null, null
            );

            // When
            Post result = postService.updatePost(1L, 1L, data);

            // Then
            assertThat(result.getStatus()).isEqualTo(StatusPost.RASCUNHO);
            assertThat(result.getTentativasPublicacao()).isEqualTo(0);
            assertThat(result.getPublishErrorMessage()).isNull();
        }
    }

    @Nested
    @DisplayName("Get and List Posts Tests")
    class GetListPostsTests {

        @Test
        @DisplayName("Should get post by salon and ID")
        void shouldGetPostBySalonAndId() {
            // Given
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));

            // When
            Post result = postService.getPost(1L, 1L);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Should list posts by salon")
        void shouldListPostsBySalon() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Post> page = new PageImpl<>(List.of(post));
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findBySalon(salon, pageable)).thenReturn(page);

            // When
            Page<Post> result = postService.listPosts(1L, null, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(postRepository).findBySalon(salon, pageable);
        }

        @Test
        @DisplayName("Should list posts by salon and status")
        void shouldListPostsBySalonAndStatus() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Post> page = new PageImpl<>(List.of(post));
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findBySalonAndStatus(salon, StatusPost.RASCUNHO, pageable)).thenReturn(page);

            // When
            Page<Post> result = postService.listPosts(1L, StatusPost.RASCUNHO, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            verify(postRepository).findBySalonAndStatus(salon, StatusPost.RASCUNHO, pageable);
        }
    }

    @Nested
    @DisplayName("Delete Post Tests")
    class DeletePostTests {

        @Test
        @DisplayName("Should delete draft post")
        void shouldDeleteDraftPost() {
            // Given
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));

            // When
            postService.deletePost(1L, 1L);

            // Then
            verify(postRepository).delete(post);
        }

        @Test
        @DisplayName("Should throw exception when deleting published post")
        void shouldThrowExceptionWhenDeletingPublishedPost() {
            // Given
            post.setStatus(StatusPost.PUBLICADO);
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));

            // When/Then
            assertThatThrownBy(() -> postService.deletePost(1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot delete");
        }
    }

    @Nested
    @DisplayName("Publish Post Tests")
    class PublishPostTests {

        @Test
        @DisplayName("Should publish post successfully")
        void shouldPublishPostSuccessfully() {
            // Given
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(socialAccountService.hasActiveAccount(1L, PlataformaSocial.INSTAGRAM)).thenReturn(true);
            when(socialAccountService.getAccountByPlatform(1L, PlataformaSocial.INSTAGRAM)).thenReturn(contaSocial);
            when(metaGraphAPIService.publishToInstagram(anyString(), anyString(), any()))
                    .thenReturn(new MetaGraphAPIService.PublishResponse(true, "post-123", null));
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            Post result = postService.publishPost(1L, 1L);

            // Then
            assertThat(result.getStatus()).isEqualTo(StatusPost.PUBLICADO);
            assertThat(result.getPublicadoEm()).isNotNull();
            verify(metaGraphAPIService).publishToInstagram(anyString(), anyString(), any());
        }

        @Test
        @DisplayName("Should throw exception when no image")
        void shouldThrowExceptionWhenNoImage() {
            // Given
            post.setImagemUrl(null);
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));

            // When/Then
            assertThatThrownBy(() -> postService.publishPost(1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("must have an image");
        }

        @Test
        @DisplayName("Should throw exception when no platforms selected")
        void shouldThrowExceptionWhenNoPlatforms() {
            // Given
            post.setPlataformas(List.of());
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));

            // When/Then
            assertThatThrownBy(() -> postService.publishPost(1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("at least one target platform");
        }

        @Test
        @DisplayName("Should throw exception when no active account")
        void shouldThrowExceptionWhenNoActiveAccount() {
            // Given
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(socialAccountService.hasActiveAccount(1L, PlataformaSocial.INSTAGRAM)).thenReturn(false);

            // When/Then
            assertThatThrownBy(() -> postService.publishPost(1L, 1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("No active");
        }

        @Test
        @DisplayName("Should mark post as failed on publish error")
        void shouldMarkPostAsFailedOnPublishError() {
            // Given
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(socialAccountService.hasActiveAccount(1L, PlataformaSocial.INSTAGRAM)).thenReturn(true);
            when(socialAccountService.getAccountByPlatform(1L, PlataformaSocial.INSTAGRAM)).thenReturn(contaSocial);
            when(metaGraphAPIService.publishToInstagram(anyString(), anyString(), any()))
                    .thenReturn(new MetaGraphAPIService.PublishResponse(false, null, "API Error"));
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            Post result = postService.publishPost(1L, 1L);

            // Then
            assertThat(result.getStatus()).isEqualTo(StatusPost.FALHOU);
            assertThat(result.getPublishErrorMessage()).isNotNull();
        }
    }

    @Nested
    @DisplayName("Schedule Post Tests")
    class SchedulePostTests {

        @Test
        @DisplayName("Should schedule post successfully")
        void shouldSchedulePostSuccessfully() {
            // Given
            LocalDateTime scheduledTime = LocalDateTime.now().plusDays(1);
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(socialAccountService.hasActiveAccount(1L, PlataformaSocial.INSTAGRAM)).thenReturn(true);
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            Post result = postService.schedulePost(1L, 1L, scheduledTime);

            // Then
            assertThat(result.getStatus()).isEqualTo(StatusPost.AGENDADO);
            assertThat(result.getAgendadoPara()).isEqualTo(scheduledTime);
        }

        @Test
        @DisplayName("Should throw exception when scheduling in the past")
        void shouldThrowExceptionWhenSchedulingInPast() {
            // Given
            LocalDateTime pastTime = LocalDateTime.now().minusDays(1);
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(socialAccountService.hasActiveAccount(1L, PlataformaSocial.INSTAGRAM)).thenReturn(true);

            // When/Then
            assertThatThrownBy(() -> postService.schedulePost(1L, 1L, pastTime))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("in the future");
        }
    }

    @Nested
    @DisplayName("Process Scheduled Posts Tests")
    class ProcessScheduledPostsTests {

        @Test
        @DisplayName("Should process scheduled posts ready to publish")
        void shouldProcessScheduledPosts() {
            // Given
            post.setStatus(StatusPost.AGENDADO);
            post.setAgendadoPara(LocalDateTime.now().minusMinutes(1));
            when(postRepository.findReadyToPublish(any())).thenReturn(List.of(post));
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(socialAccountService.hasActiveAccount(1L, PlataformaSocial.INSTAGRAM)).thenReturn(true);
            when(socialAccountService.getAccountByPlatform(1L, PlataformaSocial.INSTAGRAM)).thenReturn(contaSocial);
            when(metaGraphAPIService.publishToInstagram(anyString(), anyString(), any()))
                    .thenReturn(new MetaGraphAPIService.PublishResponse(true, "post-123", null));
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            postService.processScheduledPosts();

            // Then
            verify(postRepository).findReadyToPublish(any());
            verify(metaGraphAPIService).publishToInstagram(anyString(), anyString(), any());
        }
    }

    @Nested
    @DisplayName("Retry Failed Posts Tests")
    class RetryFailedPostsTests {

        @Test
        @DisplayName("Should retry failed posts")
        void shouldRetryFailedPosts() {
            // Given
            post.setStatus(StatusPost.FALHOU);
            post.setTentativasPublicacao(1);
            when(postRepository.findRetryable()).thenReturn(List.of(post));
            when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
            when(postRepository.findByIdAndSalon(1L, salon)).thenReturn(Optional.of(post));
            when(socialAccountService.hasActiveAccount(1L, PlataformaSocial.INSTAGRAM)).thenReturn(true);
            when(socialAccountService.getAccountByPlatform(1L, PlataformaSocial.INSTAGRAM)).thenReturn(contaSocial);
            when(metaGraphAPIService.publishToInstagram(anyString(), anyString(), any()))
                    .thenReturn(new MetaGraphAPIService.PublishResponse(true, "post-123", null));
            when(postRepository.save(any(Post.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // When
            postService.retryFailedPosts();

            // Then
            verify(postRepository).findRetryable();
        }

        @Test
        @DisplayName("Should not retry posts at max attempts")
        void shouldNotRetryPostsAtMaxAttempts() {
            // Given
            post.setStatus(StatusPost.FALHOU);
            post.setTentativasPublicacao(3); // MAX_RETRY_ATTEMPTS
            when(postRepository.findRetryable()).thenReturn(List.of(post));

            // When
            postService.retryFailedPosts();

            // Then
            verify(postRepository).findRetryable();
            verify(salonRepository, never()).findById(anyLong());
        }
    }
}
