package com.belezza.api.controller;

import com.belezza.api.dto.agendamento.MeusAgendamentosResponse;
import com.belezza.api.entity.Usuario;
import com.belezza.api.service.AgendamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for client's own appointments.
 * Endpoint: GET /api/salon/appointments/my
 */
@RestController
@RequestMapping("/api/salon/appointments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Meus Agendamentos", description = "Endpoints para clientes consultarem seus próprios agendamentos")
@SecurityRequirement(name = "bearerAuth")
public class MeusAgendamentosController {

    private final AgendamentoService agendamentoService;

    /**
     * Returns the authenticated client's appointments with pagination and filtering.
     *
     * @param userDetails The authenticated user (from JWT)
     * @param limit       Number of items per page (default: 20)
     * @param page        Current page (1-indexed, default: 1)
     * @param status      Filter by status: pending, confirmed, in_progress, completed, canceled, no_show
     * @param sortBy      Sort field (default: date)
     * @param sortOrder   Sort order: asc or desc (default: desc)
     * @return Paginated list of the client's appointments
     */
    @GetMapping("/my")
    @Operation(
        summary = "Listar meus agendamentos",
        description = "Retorna os agendamentos do cliente autenticado com paginação e filtros"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Lista de agendamentos retornada com sucesso",
            content = @Content(schema = @Schema(implementation = MeusAgendamentosResponse.class))
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Token de autenticação inválido ou ausente",
            content = @Content
        ),
        @ApiResponse(
            responseCode = "403",
            description = "Acesso negado",
            content = @Content
        )
    })
    public ResponseEntity<MeusAgendamentosResponse> getMeusAgendamentos(
            @AuthenticationPrincipal Usuario userDetails,

            @Parameter(description = "Quantidade de itens por página", example = "20")
            @RequestParam(defaultValue = "20") int limit,

            @Parameter(description = "Página atual (1-indexed)", example = "1")
            @RequestParam(defaultValue = "1") int page,

            @Parameter(description = "Filtrar por status: pending, confirmed, in_progress, completed, canceled, no_show")
            @RequestParam(required = false) String status,

            @Parameter(description = "Campo para ordenação", example = "date")
            @RequestParam(defaultValue = "date") String sortBy,

            @Parameter(description = "Ordem: asc ou desc", example = "desc")
            @RequestParam(defaultValue = "desc") String sortOrder
    ) {
        log.info("GET /api/salon/appointments/my - userId: {}, page: {}, limit: {}, status: {}",
            userDetails.getId(), page, limit, status);

        MeusAgendamentosResponse response = agendamentoService.listarMeusAgendamentos(
            userDetails.getId(),
            page,
            limit,
            status,
            sortBy,
            sortOrder
        );

        return ResponseEntity.ok(response);
    }
}
