package com.belezza.api.integration;

import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.TipoServico;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
@DisplayName("CaptionAIService Tests")
class CaptionAIServiceTest {

    private CaptionAIService captionAIService;
    private ObjectMapper objectMapper;
    private MockWebServer mockWebServer;

    @BeforeEach
    void setUp() throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.start();

        objectMapper = new ObjectMapper();
        captionAIService = new CaptionAIService(objectMapper);

        // Set values via reflection since they're @Value injected
        ReflectionTestUtils.setField(captionAIService, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(captionAIService, "model", "gpt-3.5-turbo");
        ReflectionTestUtils.setField(captionAIService, "apiUrl", mockWebServer.url("/v1").toString());
    }

    @AfterEach
    void tearDown() throws IOException {
        mockWebServer.shutdown();
    }

    @Nested
    @DisplayName("API Key Validation Tests")
    class ApiKeyValidationTests {

        @Test
        @DisplayName("Should throw exception when API key is empty")
        void shouldThrowExceptionWhenApiKeyEmpty() {
            // Given
            ReflectionTestUtils.setField(captionAIService, "apiKey", "");
            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de corte de cabelo",
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                "profissional",
                "português"
            );

            // When/Then
            assertThatThrownBy(() -> captionAIService.generate(request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("API key not configured");
        }

        @Test
        @DisplayName("Should throw exception when API key is null")
        void shouldThrowExceptionWhenApiKeyNull() {
            // Given
            ReflectionTestUtils.setField(captionAIService, "apiKey", null);
            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de corte de cabelo",
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                "profissional",
                "português"
            );

            // When/Then
            assertThatThrownBy(() -> captionAIService.generate(request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("API key not configured");
        }
    }

    @Nested
    @DisplayName("CaptionRequest Validation Tests")
    class CaptionRequestValidationTests {

        @Test
        @DisplayName("Should throw exception when image description is null")
        void shouldThrowExceptionWhenImageDescriptionNull() {
            // When/Then
            assertThatThrownBy(() -> new CaptionAIService.CaptionRequest(
                null,
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                "profissional",
                "português"
            ))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Image description is required");
        }

        @Test
        @DisplayName("Should throw exception when image description is empty")
        void shouldThrowExceptionWhenImageDescriptionEmpty() {
            // When/Then
            assertThatThrownBy(() -> new CaptionAIService.CaptionRequest(
                "",
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                "profissional",
                "português"
            ))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Image description is required");
        }

        @Test
        @DisplayName("Should throw exception when platform is null")
        void shouldThrowExceptionWhenPlatformNull() {
            // When/Then
            assertThatThrownBy(() -> new CaptionAIService.CaptionRequest(
                "Foto de corte de cabelo",
                TipoServico.CABELO,
                "moderno",
                null,
                "profissional",
                "português"
            ))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Platform is required");
        }

        @Test
        @DisplayName("Should use default values for tom and idioma when null")
        void shouldUseDefaultValuesWhenNullOptionalFields() {
            // When
            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de corte de cabelo",
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                null,
                null
            );

            // Then
            assertThat(request.tom()).isEqualTo("profissional");
            assertThat(request.idioma()).isEqualTo("português");
        }
    }

    @Nested
    @DisplayName("Generate Caption Tests")
    class GenerateCaptionTests {

        @Test
        @DisplayName("Should generate caption successfully")
        void shouldGenerateCaptionSuccessfully() {
            // Given
            String jsonResponse = """
                {
                    "legenda": "Transformação incrível! ✨ Confira esse corte moderno que deixou nossa cliente radiante.",
                    "hashtags": ["#cabelo", "#transformacao", "#salaosp"],
                    "callToAction": "Agende seu horário agora!",
                    "engajamentoEstimado": 85
                }
                """;

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "chatcmpl-123",
                        "choices": [
                            {
                                "message": {
                                    "content": "%s"
                                }
                            }
                        ]
                    }
                    """.formatted(jsonResponse.replace("\"", "\\\"").replace("\n", "\\n")))
                .addHeader("Content-Type", "application/json"));

            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de corte de cabelo moderno",
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                "profissional",
                "português"
            );

            // When
            CaptionAIService.CaptionResponse result = captionAIService.generate(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.legenda()).contains("Transformação");
            assertThat(result.hashtags()).isNotEmpty();
            assertThat(result.callToAction()).isNotEmpty();
            assertThat(result.engajamentoEstimado()).isGreaterThan(0);
        }

        @Test
        @DisplayName("Should handle response with raw content as fallback")
        void shouldHandleFallbackResponse() {
            // Given - Response without JSON format
            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "chatcmpl-123",
                        "choices": [
                            {
                                "message": {
                                    "content": "Uma legenda incrível para seu post!"
                                }
                            }
                        ]
                    }
                    """)
                .addHeader("Content-Type", "application/json"));

            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de corte de cabelo",
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                "profissional",
                "português"
            );

            // When
            CaptionAIService.CaptionResponse result = captionAIService.generate(request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.legenda()).isEqualTo("Uma legenda incrível para seu post!");
            assertThat(result.hashtags()).containsExactly("beleza", "salaosp", "transformacao");
            assertThat(result.engajamentoEstimado()).isEqualTo(70);
        }

        @Test
        @DisplayName("Should generate caption for different service types")
        void shouldGenerateCaptionForDifferentServiceTypes() {
            // Given
            String jsonResponse = """
                {
                    "legenda": "Unhas perfeitas!",
                    "hashtags": ["#manicure"],
                    "callToAction": "Marque já!",
                    "engajamentoEstimado": 80
                }
                """;

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "chatcmpl-123",
                        "choices": [
                            {
                                "message": {
                                    "content": "%s"
                                }
                            }
                        ]
                    }
                    """.formatted(jsonResponse.replace("\"", "\\\"").replace("\n", "\\n")))
                .addHeader("Content-Type", "application/json"));

            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de unhas decoradas",
                TipoServico.UNHA,
                "feminino",
                PlataformaSocial.INSTAGRAM,
                "divertido",
                "português"
            );

            // When
            CaptionAIService.CaptionResponse result = captionAIService.generate(request);

            // Then
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Should generate caption for different platforms")
        void shouldGenerateCaptionForDifferentPlatforms() {
            // Given
            String jsonResponse = """
                {
                    "legenda": "Novidade no salão!",
                    "hashtags": ["#beleza"],
                    "callToAction": "Curta e compartilhe!",
                    "engajamentoEstimado": 75
                }
                """;

            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "chatcmpl-123",
                        "choices": [
                            {
                                "message": {
                                    "content": "%s"
                                }
                            }
                        ]
                    }
                    """.formatted(jsonResponse.replace("\"", "\\\"").replace("\n", "\\n")))
                .addHeader("Content-Type", "application/json"));

            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto do salão",
                TipoServico.ESTETICA,
                "luxo",
                PlataformaSocial.FACEBOOK,
                "profissional",
                "português"
            );

            // When
            CaptionAIService.CaptionResponse result = captionAIService.generate(request);

            // Then
            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("Generate Variations Tests")
    class GenerateVariationsTests {

        @Test
        @DisplayName("Should generate multiple variations")
        void shouldGenerateMultipleVariations() {
            // Given
            String jsonResponse = """
                {
                    "legenda": "Variação de legenda",
                    "hashtags": ["#teste"],
                    "callToAction": "Teste!",
                    "engajamentoEstimado": 80
                }
                """;

            // Queue 3 responses for 3 variations
            for (int i = 0; i < 3; i++) {
                mockWebServer.enqueue(new MockResponse()
                    .setBody("""
                        {
                            "id": "chatcmpl-%d",
                            "choices": [
                                {
                                    "message": {
                                        "content": "%s"
                                    }
                                }
                            ]
                        }
                        """.formatted(i, jsonResponse.replace("\"", "\\\"").replace("\n", "\\n")))
                    .addHeader("Content-Type", "application/json"));
            }

            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de maquiagem",
                TipoServico.MAQUIAGEM,
                "glamour",
                PlataformaSocial.INSTAGRAM,
                "inspiracional",
                "português"
            );

            // When
            List<CaptionAIService.CaptionResponse> variations = captionAIService.generateVariations(request, 3);

            // Then
            assertThat(variations).hasSize(3);
            variations.forEach(v -> {
                assertThat(v).isNotNull();
                assertThat(v.legenda()).isNotEmpty();
            });
        }

        @Test
        @DisplayName("Should handle partial failures in variations")
        void shouldHandlePartialFailuresInVariations() {
            // Given
            String jsonResponse = """
                {
                    "legenda": "Legenda válida",
                    "hashtags": ["#teste"],
                    "callToAction": "Teste!",
                    "engajamentoEstimado": 80
                }
                """;

            // First request succeeds
            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "chatcmpl-1",
                        "choices": [
                            {
                                "message": {
                                    "content": "%s"
                                }
                            }
                        ]
                    }
                    """.formatted(jsonResponse.replace("\"", "\\\"").replace("\n", "\\n")))
                .addHeader("Content-Type", "application/json"));

            // Second request fails
            mockWebServer.enqueue(new MockResponse()
                .setResponseCode(500)
                .setBody("Internal Server Error"));

            // Third request succeeds
            mockWebServer.enqueue(new MockResponse()
                .setBody("""
                    {
                        "id": "chatcmpl-3",
                        "choices": [
                            {
                                "message": {
                                    "content": "%s"
                                }
                            }
                        ]
                    }
                    """.formatted(jsonResponse.replace("\"", "\\\"").replace("\n", "\\n")))
                .addHeader("Content-Type", "application/json"));

            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de massagem",
                TipoServico.MASSAGEM,
                "spa",
                PlataformaSocial.INSTAGRAM,
                "relaxante",
                "português"
            );

            // When
            List<CaptionAIService.CaptionResponse> variations = captionAIService.generateVariations(request, 3);

            // Then - Should have at least the successful ones
            assertThat(variations.size()).isGreaterThanOrEqualTo(2);
        }
    }

    @Nested
    @DisplayName("Error Handling Tests")
    class ErrorHandlingTests {

        @Test
        @DisplayName("Should throw exception on API error")
        void shouldThrowExceptionOnApiError() {
            // Given
            mockWebServer.enqueue(new MockResponse()
                .setResponseCode(401)
                .setBody("Unauthorized"));

            CaptionAIService.CaptionRequest request = new CaptionAIService.CaptionRequest(
                "Foto de cabelo",
                TipoServico.CABELO,
                "moderno",
                PlataformaSocial.INSTAGRAM,
                "profissional",
                "português"
            );

            // When/Then
            assertThatThrownBy(() -> captionAIService.generate(request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Failed to generate caption");
        }
    }
}
