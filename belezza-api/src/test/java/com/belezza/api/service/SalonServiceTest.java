package com.belezza.api.service;

import com.belezza.api.dto.salon.SalonRequest;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SalonService - horário de funcionamento (BUG-032)")
class SalonServiceTest {

    @Mock private SalonRepository salonRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ProfissionalRepository profissionalRepository;

    @InjectMocks
    private SalonService salonService;

    private Salon salon;

    @BeforeEach
    void setUp() {
        Usuario admin = Usuario.builder().id(1L).email("admin@teste.com").build();
        salon = Salon.builder().id(1L).nome("Salão").admin(admin)
                .horarioAbertura(LocalTime.of(9, 0)).horarioFechamento(LocalTime.of(18, 0)).build();
        when(usuarioRepository.findByEmailAndAtivoTrue("admin@teste.com")).thenReturn(Optional.of(admin));
        when(salonRepository.findById(1L)).thenReturn(Optional.of(salon));
    }

    private SalonRequest horario(String abertura, String fechamento) {
        return SalonRequest.builder().nome("Salão").horarioAbertura(abertura).horarioFechamento(fechamento).build();
    }

    @Test
    @DisplayName("Abertura 19:00 e fechamento 08:00 é recusado")
    void aberturaDepoisDoFechamento() {
        assertThatThrownBy(() -> salonService.atualizar(1L, horario("19:00", "08:00"), "admin@teste.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("deve ser antes do de fechamento");
        verify(salonRepository, never()).save(any());
    }

    @Test
    @DisplayName("Mudar só a abertura para depois do fechamento atual também é recusado")
    void soAberturaDepoisDoFechamentoAtual() {
        assertThatThrownBy(() -> salonService.atualizar(1L, horario("19:00", null), "admin@teste.com"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Horário que não existe vira mensagem, não erro 500")
    void horarioInexistente() {
        assertThatThrownBy(() -> salonService.atualizar(1L, horario("25:00", "18:00"), "admin@teste.com"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Horário de abertura inválido");
    }

    @Test
    @DisplayName("Expediente válido é salvo")
    void expedienteValido() {
        when(salonRepository.save(any(Salon.class))).thenAnswer(inv -> inv.getArgument(0));

        salonService.atualizar(1L, horario("08:00", "20:00"), "admin@teste.com");

        assertThat(salon.getHorarioAbertura()).isEqualTo(LocalTime.of(8, 0));
        assertThat(salon.getHorarioFechamento()).isEqualTo(LocalTime.of(20, 0));
    }
}
