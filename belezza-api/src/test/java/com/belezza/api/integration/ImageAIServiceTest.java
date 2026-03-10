package com.belezza.api.integration;

import com.belezza.api.entity.StyleType;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
@DisplayName("ImageAIService Tests")
class ImageAIServiceTest {

    private ImageAIService imageAIService;
    private ObjectMapper objectMapper;
    private MockWebServer mockWebServer;

    @BeforeEach
    void setUp() throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.start();

        objectMapper = new ObjectMapper();
        imageAIService = new ImageAIService(objectMapper);

        // Set values via reflection since they're @Value injected
        ReflectionTestUtils.setField(imageAIService, "apiToken", "test-token");
        ReflectionTestUtils.setField(imageAIService, "apiUrl", mockWebServer.url("/v1").toString());
        ReflectionTestUtils.setField(imageAIService, "enhanceModel", "enhance-model-version");
        ReflectionTestUtils.setField(imageAIService, "removeBgModel", "remove-bg-model-version");
        ReflectionTestUtils.setField(imageAIService, "upscaleModel", "upscale-model-version");
    }

    @AfterEach
    void tearDown() throws IOException {
        mockWebServer.shutdown();
    }

    @Nested
    @DisplayName("API Token Validation Tests")
    class ApiTokenValidationTests {

        @Test
        @DisplayName("Should throw exception when API token is empty")
        void shouldThrowExceptionWhenApiTokenEmpty() {
            // Given
            ReflectionTestUtils.setField(imageAIService, "apiToken", "");

            // When/Then
            assertThatThrownBy(() -> imageAIService.enhance("https://example.com/image.jpg"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("API token not configured");
        }

        @Test
        @DisplayName("Should throw exception when API token is null")
        void shouldThrowExceptionWhenApiTokenNull() {
            // Given
            ReflectionTestUtils.setField(imageAIService, "apiToken", null);

            // When/Then
            assertThatThrownBy(() -> imageAIService.enhance("https://example.com/image.jpg"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("API token not configured");
        }
    }

    @Nested
    @DisplayName("Enhance Image Tests")
    class EnhanceImageTests {

        @Test
        @DisplayName("Should enhance image successfully")
        void shouldEnhanceImageSuccessfully() {
            // Given
            String predictionId = "pred-123";
            String outputUrl = "https://replicate.delivery/enhanced-image.jpg";

            // Mock initial prediction response
            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "%s",
                        "status": "succeeded",
                        "output": "%s"
                    }
                    """.formatted(predictionId, outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.enhance("https://example.com/image.jpg");

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }

        @Test
        @DisplayName("Should poll until prediction completes")
        void shouldPollUntilPredictionCompletes() {
            // Given
            String predictionId = "pred-123";
            String outputUrl = "https://replicate.delivery/enhanced-image.jpg";

            // Mock initial prediction response (processing)
            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "%s",
                        "status": "processing"
                    }
                    """.formatted(predictionId))
                .addHeader("Content-Type", "application/json"));

            // Mock polling response (succeeded)
            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "%s",
                        "status": "succeeded",
                        "output": "%s"
                    }
                    """.formatted(predictionId, outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.enhance("https://example.com/image.jpg");

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }

        @Test
        @DisplayName("Should throw exception when prediction fails")
        void shouldThrowExceptionWhenPredictionFails() {
            // Given
            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "pred-123",
                        "status": "failed",
                        "error": "Model error"
                    }
                    """)
                .addHeader("Content-Type", "application/json"));

            // When/Then
            assertThatThrownBy(() -> imageAIService.enhance("https://example.com/image.jpg"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("AI prediction failed");
        }
    }

    @Nested
    @DisplayName("Remove Background Tests")
    class RemoveBackgroundTests {

        @Test
        @DisplayName("Should remove background successfully")
        void shouldRemoveBackgroundSuccessfully() {
            // Given
            String outputUrl = "https://replicate.delivery/no-bg-image.png";

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "pred-456",
                        "status": "succeeded",
                        "output": "%s"
                    }
                    """.formatted(outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.removeBackground("https://example.com/image.jpg");

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }
    }

    @Nested
    @DisplayName("Blur Background Tests")
    class BlurBackgroundTests {

        @Test
        @DisplayName("Should blur background (via remove background)")
        void shouldBlurBackground() {
            // Given
            String outputUrl = "https://replicate.delivery/blurred-bg.jpg";

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "pred-789",
                        "status": "succeeded",
                        "output": "%s"
                    }
                    """.formatted(outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.blurBackground("https://example.com/image.jpg", 50);

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }
    }

    @Nested
    @DisplayName("Apply Style Tests")
    class ApplyStyleTests {

        @Test
        @DisplayName("Should apply style (via enhance)")
        void shouldApplyStyle() {
            // Given
            String outputUrl = "https://replicate.delivery/styled-image.jpg";

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "pred-style",
                        "status": "succeeded",
                        "output": "%s"
                    }
                    """.formatted(outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.applyStyle("https://example.com/image.jpg", StyleType.NATURAL);

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }
    }

    @Nested
    @DisplayName("Upscale Image Tests")
    class UpscaleImageTests {

        @Test
        @DisplayName("Should upscale image with factor 2")
        void shouldUpscaleImageWithFactor2() {
            // Given
            String outputUrl = "https://replicate.delivery/upscaled-2x.jpg";

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "pred-upscale",
                        "status": "succeeded",
                        "output": "%s"
                    }
                    """.formatted(outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.upscale("https://example.com/image.jpg", 2);

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }

        @Test
        @DisplayName("Should upscale image with factor 4")
        void shouldUpscaleImageWithFactor4() {
            // Given
            String outputUrl = "https://replicate.delivery/upscaled-4x.jpg";

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "pred-upscale",
                        "status": "succeeded",
                        "output": "%s"
                    }
                    """.formatted(outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.upscale("https://example.com/image.jpg", 4);

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }

        @Test
        @DisplayName("Should throw exception for invalid upscale factor")
        void shouldThrowExceptionForInvalidUpscaleFactor() {
            // When/Then
            assertThatThrownBy(() -> imageAIService.upscale("https://example.com/image.jpg", 3))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("must be 2 or 4");

            assertThatThrownBy(() -> imageAIService.upscale("https://example.com/image.jpg", 1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("must be 2 or 4");
        }
    }

    @Nested
    @DisplayName("Output Parsing Tests")
    class OutputParsingTests {

        @Test
        @DisplayName("Should handle output as array")
        void shouldHandleOutputAsArray() {
            // Given
            String outputUrl = "https://replicate.delivery/result.jpg";

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "pred-array",
                        "status": "succeeded",
                        "output": ["%s", "https://other.jpg"]
                    }
                    """.formatted(outputUrl))
                .addHeader("Content-Type", "application/json"));

            // When
            String result = imageAIService.enhance("https://example.com/image.jpg");

            // Then
            assertThat(result).isEqualTo(outputUrl);
        }
    }
}
