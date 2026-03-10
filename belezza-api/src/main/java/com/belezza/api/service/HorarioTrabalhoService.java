package com.belezza.api.service;

import com.belezza.api.dto.horario.HorarioTrabalhoRequest;
import com.belezza.api.dto.horario.HorarioTrabalhoResponse;
import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioTrabalho;
import com.belezza.api.entity.Profissional;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class HorarioTrabalhoService {

    private final HorarioTrabalhoRepository horarioTrabalhoRepository;
    private final ProfissionalService profissionalService;

    @Transactional
    public HorarioTrabalhoResponse criar(Long profissionalId, HorarioTrabalhoRequest request) {
        Profissional profissional = profissionalService.getProfissionalEntity(profissionalId);

        if (horarioTrabalhoRepository.existsByProfissionalIdAndDiaSemana(profissionalId, request.getDiaSemana())) {
            throw new DuplicateResourceException("Horário", "dia", request.getDiaSemana().getDescription());
        }

        LocalTime horaInicio = LocalTime.parse(request.getHoraInicio());
        LocalTime horaFim = LocalTime.parse(request.getHoraFim());
        LocalTime intervaloInicio = LocalTime.parse(request.getIntervaloInicio());
        LocalTime intervaloFim = LocalTime.parse(request.getIntervaloFim());

        validarHorarios(horaInicio, horaFim, intervaloInicio, intervaloFim);

        HorarioTrabalho horario = HorarioTrabalho.builder()
                .profissional(profissional)
                .diaSemana(request.getDiaSemana())
                .horaInicio(horaInicio)
                .horaFim(horaFim)
                .intervaloInicio(intervaloInicio)
                .intervaloFim(intervaloFim)
                .build();

        horario = horarioTrabalhoRepository.save(horario);
        log.info("Horário criado para profissional {} no dia {}", profissionalId, request.getDiaSemana());

        return HorarioTrabalhoResponse.fromEntity(horario);
    }

    @Transactional(readOnly = true)
    public List<HorarioTrabalhoResponse> listarPorProfissional(Long profissionalId) {
        return horarioTrabalhoRepository.findByProfissionalIdAndAtivoTrue(profissionalId).stream()
                .map(HorarioTrabalhoResponse::fromEntity)
                .toList();
    }

    @Transactional
    public HorarioTrabalhoResponse atualizar(Long profissionalId, DiaSemana diaSemana, HorarioTrabalhoRequest request) {
        HorarioTrabalho horario = horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(profissionalId, diaSemana)
                .orElseThrow(() -> new ResourceNotFoundException("Horário de trabalho não encontrado para " + diaSemana.getDescription()));

        LocalTime horaInicio = LocalTime.parse(request.getHoraInicio());
        LocalTime horaFim = LocalTime.parse(request.getHoraFim());
        LocalTime intervaloInicio = LocalTime.parse(request.getIntervaloInicio());
        LocalTime intervaloFim = LocalTime.parse(request.getIntervaloFim());

        validarHorarios(horaInicio, horaFim, intervaloInicio, intervaloFim);

        horario.setHoraInicio(horaInicio);
        horario.setHoraFim(horaFim);
        horario.setIntervaloInicio(intervaloInicio);
        horario.setIntervaloFim(intervaloFim);

        horario = horarioTrabalhoRepository.save(horario);
        log.info("Horário atualizado para profissional {} no dia {}", profissionalId, diaSemana);

        return HorarioTrabalhoResponse.fromEntity(horario);
    }

    @Transactional
    public void desativar(Long profissionalId, DiaSemana diaSemana) {
        HorarioTrabalho horario = horarioTrabalhoRepository.findByProfissionalIdAndDiaSemana(profissionalId, diaSemana)
                .orElseThrow(() -> new ResourceNotFoundException("Horário de trabalho não encontrado para " + diaSemana.getDescription()));

        horario.setAtivo(false);
        horarioTrabalhoRepository.save(horario);
        log.info("Horário desativado para profissional {} no dia {}", profissionalId, diaSemana);
    }

    private void validarHorarios(LocalTime horaInicio, LocalTime horaFim, LocalTime intervaloInicio, LocalTime intervaloFim) {
        if (horaInicio.isAfter(horaFim) || horaInicio.equals(horaFim)) {
            throw new BusinessException("Hora de início deve ser antes da hora de fim");
        }
        if (intervaloInicio.isAfter(intervaloFim)) {
            throw new BusinessException("Início do intervalo deve ser antes do fim do intervalo");
        }
        if (intervaloInicio.isBefore(horaInicio) || intervaloFim.isAfter(horaFim)) {
            throw new BusinessException("Intervalo deve estar dentro do horário de trabalho");
        }
    }
}
