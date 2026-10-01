package com.belezza.api.controller;

import com.belezza.api.dto.profissional.ProfissionalResponse;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.service.IndisponibilidadeService;
import com.belezza.api.service.ProfissionalService;
import com.belezza.api.service.TenantIsolationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@DisplayName("ProfissionalController - contato da equipe só para a equipe")
class ProfissionalControllerTest {

    private final ProfissionalService service = mock(ProfissionalService.class);
    private final ProfissionalController controller = new ProfissionalController(
            service, mock(IndisponibilidadeService.class), mock(TenantIsolationService.class));

    private ProfissionalResponse profissional() {
        return ProfissionalResponse.builder().id(6L).usuarioId(20L).nome("Funcionario Teste")
                .email("func@salao.com").telefone("+5511977777777").bio("Cortes").build();
    }

    private Usuario com(Role role) {
        return Usuario.builder().id(99L).role(role).build();
    }

    @Test
    @DisplayName("Cliente vê nome e bio, sem e-mail, telefone e id de usuário")
    void clienteSemContato() {
        when(service.listarPorSalon(1L, null)).thenReturn(List.of(profissional()));
        when(service.buscarPorId(6L)).thenReturn(profissional());

        ProfissionalResponse naLista = controller.listarPorSalon(1L, null, com(Role.CLIENTE)).getBody().get(0);
        ProfissionalResponse sozinho = controller.buscarPorId(6L, com(Role.CLIENTE)).getBody();

        for (ProfissionalResponse p : List.of(naLista, sozinho)) {
            assertThat(p.getNome()).isEqualTo("Funcionario Teste");
            assertThat(p.getBio()).isEqualTo("Cortes");
            assertThat(p.getEmail()).isNull();
            assertThat(p.getTelefone()).isNull();
            assertThat(p.getUsuarioId()).isNull();
        }
    }

    @Test
    @DisplayName("Admin, recepção e profissional continuam vendo o contato")
    void equipeComContato() {
        for (Role role : List.of(Role.ADMIN, Role.RECEPCIONISTA, Role.PROFISSIONAL)) {
            when(service.listarPorSalon(1L, null)).thenReturn(List.of(profissional()));
            ProfissionalResponse p = controller.listarPorSalon(1L, null, com(role)).getBody().get(0);
            assertThat(p.getEmail()).as(role.name()).isEqualTo("func@salao.com");
            assertThat(p.getTelefone()).as(role.name()).isEqualTo("+5511977777777");
        }
    }
}
