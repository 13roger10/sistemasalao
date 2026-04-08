package com.belezza.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Controller for managing business profile data.
 * Provides endpoints for viewing and updating salon business information.
 */
@RestController
@RequestMapping("/api/salon/business")
@RequiredArgsConstructor
@Slf4j
public class SalonBusinessController {

    // ==================== PROFILE ENDPOINTS ====================

    @GetMapping("/profile")
    public ResponseEntity<BusinessProfileResponse> getProfile() {
        log.info("Getting business profile");

        // Mock data for development
        BusinessProfileResponse profile = new BusinessProfileResponse(
                "1",
                "Salao Belezza",
                "Belezza Hair & Beauty",
                "12.345.678/0001-90",
                "(11) 99999-9999",
                "(11) 99999-9999",
                "contato@belezza.com.br",
                "www.belezza.com.br",
                new AddressResponse(
                        "01310-100",
                        "Avenida Paulista",
                        "1000",
                        "Sala 101",
                        "Bela Vista",
                        "Sao Paulo",
                        "SP",
                        "Brasil"
                ),
                new CoordinatesResponse(-23.5505, -46.6333),
                new ScheduleResponse(List.of(
                        new DayScheduleResponse(0, false, List.of()),
                        new DayScheduleResponse(1, true, List.of(new TimeRangeResponse("09:00", "19:00"))),
                        new DayScheduleResponse(2, true, List.of(new TimeRangeResponse("09:00", "19:00"))),
                        new DayScheduleResponse(3, true, List.of(new TimeRangeResponse("09:00", "19:00"))),
                        new DayScheduleResponse(4, true, List.of(new TimeRangeResponse("09:00", "19:00"))),
                        new DayScheduleResponse(5, true, List.of(new TimeRangeResponse("09:00", "19:00"))),
                        new DayScheduleResponse(6, true, List.of(new TimeRangeResponse("09:00", "17:00")))
                )),
                "America/Sao_Paulo",
                "/images/logo.png",
                "/images/cover.jpg",
                "#7c3aed",
                "Salao de beleza especializado em cortes modernos, coloracao e tratamentos capilares. Atendemos com hora marcada e oferecemos os melhores produtos do mercado.",
                new SocialMediaResponse("@belezzahair", "belezzahair", "@belezzahair", null),
                true,
                "active",
                LocalDateTime.now().minusMonths(6),
                LocalDateTime.now()
        );

        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<BusinessProfileResponse> updateProfile(@RequestBody BusinessProfileUpdateRequest request) {
        log.info("Updating business profile: {}", request.name());

        // In production, this would update the database
        // For now, return the updated data
        BusinessProfileResponse profile = new BusinessProfileResponse(
                "1",
                request.name() != null ? request.name() : "Salao Belezza",
                request.tradeName(),
                request.cnpj(),
                request.phone() != null ? request.phone() : "(11) 99999-9999",
                request.whatsapp(),
                request.email(),
                request.website(),
                request.address() != null ? request.address() : new AddressResponse(
                        "01310-100", "Avenida Paulista", "1000", null,
                        "Bela Vista", "Sao Paulo", "SP", "Brasil"
                ),
                request.coordinates(),
                request.schedule() != null ? request.schedule() : new ScheduleResponse(List.of()),
                request.timezone() != null ? request.timezone() : "America/Sao_Paulo",
                request.logo(),
                request.coverImage(),
                request.primaryColor() != null ? request.primaryColor() : "#7c3aed",
                request.description(),
                request.socialMedia(),
                true,
                "active",
                LocalDateTime.now().minusMonths(6),
                LocalDateTime.now()
        );

        return ResponseEntity.ok(profile);
    }

    // ==================== STATS ENDPOINT ====================

    @GetMapping("/stats")
    public ResponseEntity<BusinessStatsResponse> getStats() {
        log.info("Getting business stats");

        // Mock data for development
        BusinessStatsResponse stats = new BusinessStatsResponse(
                245,    // totalClients
                8,      // totalProfessionals
                32,     // totalServices
                156,    // monthlyAppointments
                28500.00, // monthlyRevenue
                4.8,    // averageRating
                89      // totalReviews
        );

        return ResponseEntity.ok(stats);
    }

    // ==================== IMAGE UPLOAD ENDPOINTS ====================

    @PostMapping("/logo")
    public ResponseEntity<ImageUploadResponse> uploadLogo() {
        log.info("Uploading logo");
        // In production, this would handle file upload
        return ResponseEntity.ok(new ImageUploadResponse("/images/logo-" + System.currentTimeMillis() + ".png"));
    }

    @PostMapping("/cover")
    public ResponseEntity<ImageUploadResponse> uploadCover() {
        log.info("Uploading cover image");
        // In production, this would handle file upload
        return ResponseEntity.ok(new ImageUploadResponse("/images/cover-" + System.currentTimeMillis() + ".jpg"));
    }

    // ==================== CEP LOOKUP ====================

    @GetMapping("/address/cep/{cep}")
    public ResponseEntity<CepLookupResponse> searchCep(@PathVariable String cep) {
        log.info("Searching CEP: {}", cep);

        // Mock CEP lookup - in production, this would call ViaCEP or similar service
        CepLookupResponse response = new CepLookupResponse(
                cep,
                "Avenida Paulista",
                "Bela Vista",
                "Sao Paulo",
                "SP"
        );

        return ResponseEntity.ok(response);
    }

    // ==================== RECORD DEFINITIONS ====================

    public record BusinessProfileResponse(
            String id,
            String name,
            String tradeName,
            String cnpj,
            String phone,
            String whatsapp,
            String email,
            String website,
            AddressResponse address,
            CoordinatesResponse coordinates,
            ScheduleResponse schedule,
            String timezone,
            String logo,
            String coverImage,
            String primaryColor,
            String description,
            SocialMediaResponse socialMedia,
            boolean isVerified,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record BusinessProfileUpdateRequest(
            String name,
            String tradeName,
            String cnpj,
            String phone,
            String whatsapp,
            String email,
            String website,
            AddressResponse address,
            CoordinatesResponse coordinates,
            ScheduleResponse schedule,
            String timezone,
            String logo,
            String coverImage,
            String primaryColor,
            String description,
            SocialMediaResponse socialMedia
    ) {}

    public record AddressResponse(
            String cep,
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,
            String country
    ) {}

    public record CoordinatesResponse(
            double latitude,
            double longitude
    ) {}

    public record ScheduleResponse(
            List<DayScheduleResponse> days
    ) {}

    public record DayScheduleResponse(
            int dayOfWeek,
            boolean isOpen,
            List<TimeRangeResponse> timeRanges
    ) {}

    public record TimeRangeResponse(
            String start,
            String end
    ) {}

    public record SocialMediaResponse(
            String instagram,
            String facebook,
            String tiktok,
            String youtube
    ) {}

    public record BusinessStatsResponse(
            int totalClients,
            int totalProfessionals,
            int totalServices,
            int monthlyAppointments,
            double monthlyRevenue,
            double averageRating,
            int totalReviews
    ) {}

    public record ImageUploadResponse(
            String url
    ) {}

    public record CepLookupResponse(
            String cep,
            String street,
            String neighborhood,
            String city,
            String state
    ) {}
}
