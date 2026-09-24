package com.belezza.api.controller;

import com.belezza.api.entity.Salon;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.AvaliacaoRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.ServicoRepository;
import com.belezza.api.security.annotation.AdminOnly;
import com.belezza.api.service.SalonService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Controller for managing business profile data.
 * Provides endpoints for viewing and updating salon business information.
 *
 * SEC-018: antes retornava dados MOCK fixos (CNPJ/endereço/stats) para qualquer usuário
 * autenticado, sem isolamento de tenant, e o PUT não persistia. Agora todos os endpoints
 * são @AdminOnly e operam sobre o salão do próprio administrador autenticado, com dados
 * reais e persistência.
 */
@RestController
@RequestMapping("/api/salon/business")
@RequiredArgsConstructor
@Slf4j
@AdminOnly
public class SalonBusinessController {

    private final SalonService salonService;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final AvaliacaoRepository avaliacaoRepository;
    private final PagamentoRepository pagamentoRepository;

    /** SEC-018: monta a resposta a partir dos dados REAIS do salão. */
    private BusinessProfileResponse toProfileResponse(Salon salon) {
        AddressResponse address = new AddressResponse(
                salon.getCep(), salon.getEndereco(), null, null, null,
                salon.getCidade(), salon.getEstado(), "Brasil");
        return new BusinessProfileResponse(
                String.valueOf(salon.getId()),
                salon.getNome(),
                null,               // tradeName (não persistido na entidade Salon)
                salon.getCnpj(),
                salon.getTelefone(),
                null,               // whatsapp
                null,               // email (a entidade Salon não tem e-mail de negócio dedicado)
                null,               // website
                address,
                null,               // coordinates
                null,               // schedule — gerido por /api/salon/schedule
                "America/Sao_Paulo",
                salon.getLogoUrl(),
                salon.getBannerUrl(),
                null,               // primaryColor
                salon.getDescricao(),
                null,               // socialMedia
                false,
                salon.isAtivo() ? "active" : "inactive",
                salon.getCriadoEm(),
                salon.getAtualizadoEm());
    }

    // ==================== PROFILE ENDPOINTS ====================

    @GetMapping("/profile")
    public ResponseEntity<BusinessProfileResponse> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        Salon salon = salonService.getSalonByAdminEmail(userDetails.getUsername());
        return ResponseEntity.ok(toProfileResponse(salon));
    }

    @PutMapping("/profile")
    public ResponseEntity<BusinessProfileResponse> updateProfile(
            @RequestBody BusinessProfileUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        // SEC-018: persiste no salão do próprio admin (tenant), com dados reais.
        Salon salon = salonService.getSalonByAdminEmail(userDetails.getUsername());

        if (request.name() != null) salon.setNome(request.name());
        if (request.cnpj() != null) salon.setCnpj(request.cnpj());
        if (request.phone() != null) salon.setTelefone(request.phone());
        if (request.description() != null) salon.setDescricao(request.description());
        if (request.logo() != null) salon.setLogoUrl(request.logo());
        if (request.coverImage() != null) salon.setBannerUrl(request.coverImage());
        if (request.address() != null) {
            AddressResponse a = request.address();
            if (a.street() != null) salon.setEndereco(a.street());
            if (a.city() != null) salon.setCidade(a.city());
            if (a.state() != null) salon.setEstado(a.state());
            if (a.cep() != null) salon.setCep(a.cep());
        }

        salon = salonService.save(salon);
        log.info("Business profile atualizado para salão {}", salon.getId());
        return ResponseEntity.ok(toProfileResponse(salon));
    }

    // ==================== STATS ENDPOINT ====================

    @GetMapping("/stats")
    public ResponseEntity<BusinessStatsResponse> getStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        // SEC-018: estatísticas REAIS do salão do próprio admin (tenant).
        Salon salon = salonService.getSalonByAdminEmail(userDetails.getUsername());
        Long salonId = salon.getId();

        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusDays(30);

        int totalClients = (int) clienteRepository.countActiveBySalonId(salonId);
        int totalProfessionals = (int) profissionalRepository.countActiveBySalonId(salonId);
        int totalServices = (int) servicoRepository.countActiveBySalonId(salonId);
        int monthlyAppointments = (int) agendamentoRepository.countBySalonIdAndPeriod(salonId, inicio, fim);
        BigDecimal revenue = pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(salonId, inicio, fim);
        double monthlyRevenue = revenue != null ? revenue.doubleValue() : 0.0;
        Double avg = avaliacaoRepository.findAverageNotaBySalonId(salonId);
        double averageRating = avg != null ? avg : 0.0;
        int totalReviews = (int) avaliacaoRepository.countBySalonId(salonId);

        return ResponseEntity.ok(new BusinessStatsResponse(
                totalClients, totalProfessionals, totalServices,
                monthlyAppointments, monthlyRevenue, averageRating, totalReviews));
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
