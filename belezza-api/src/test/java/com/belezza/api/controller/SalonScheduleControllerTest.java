package com.belezza.api.controller;

import com.belezza.api.controller.SalonScheduleController.*;
import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioFuncionamentoSalon;
import com.belezza.api.entity.Salon;
import com.belezza.api.repository.HorarioFuncionamentoSalonRepository;
import com.belezza.api.service.SalonService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SalonScheduleController")
class SalonScheduleControllerTest {

    @Mock
    private SalonService salonService;

    @Mock
    private HorarioFuncionamentoSalonRepository horarioFuncionamentoSalonRepository;

    @InjectMocks
    private SalonScheduleController controller;

    private final UserDetails admin = User.withUsername("admin@salao.com").password("x").roles("ADMIN").build();

    @Test
    @DisplayName("Salvar o horário do salão grava só a configuração do salão (expediente dos profissionais fica intacto)")
    void salvaSoOHorarioDoSalao() {
        Salon salon = Salon.builder().id(1L)
                .horarioAbertura(LocalTime.of(8, 0)).horarioFechamento(LocalTime.of(18, 0)).build();
        when(salonService.getSalonByAdminEmail("admin@salao.com")).thenReturn(salon);
        when(horarioFuncionamentoSalonRepository.findBySalonIdAndDiaSemana(any(), any())).thenReturn(Optional.empty());

        ScheduleSettingsRequest request = new ScheduleSettingsRequest(
                new WeekScheduleResponse(List.of(
                        new DayScheduleResponse(0, false, List.of()),
                        new DayScheduleResponse(1, true, List.of(new TimeRangeResponse("09:00", "18:00"))))),
                null, null, null, null, null, null);

        controller.updateSchedule(request, admin);

        ArgumentCaptor<HorarioFuncionamentoSalon> salvos = ArgumentCaptor.forClass(HorarioFuncionamentoSalon.class);
        verify(horarioFuncionamentoSalonRepository, times(2)).save(salvos.capture());
        HorarioFuncionamentoSalon domingo = salvos.getAllValues().get(0);
        HorarioFuncionamentoSalon segunda = salvos.getAllValues().get(1);
        assertThat(domingo.getDiaSemana()).isEqualTo(DiaSemana.DOMINGO);
        assertThat(domingo.isAtivo()).isFalse();
        assertThat(segunda.getDiaSemana()).isEqualTo(DiaSemana.SEGUNDA);
        assertThat(segunda.getHoraInicio()).isEqualTo(LocalTime.of(9, 0));
        assertThat(segunda.getHoraFim()).isEqualTo(LocalTime.of(18, 0));
        assertThat(salon.getHorarioAbertura()).isEqualTo(LocalTime.of(9, 0));
        verify(salonService).save(salon);
    }
}
