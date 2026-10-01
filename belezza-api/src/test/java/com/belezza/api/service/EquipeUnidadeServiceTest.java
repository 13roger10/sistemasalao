package com.belezza.api.service;

import com.belezza.api.entity.DiaSemana;
import com.belezza.api.entity.HorarioTrabalho;
import com.belezza.api.entity.Profissional;
import com.belezza.api.entity.RecepcionistaUnidade;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.TipoComissao;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.HorarioTrabalhoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.RecepcionistaUnidadeRepository;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Profissionais e recepcionistas em várias unidades")
class EquipeUnidadeServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ProfissionalRepository profissionalRepository;
    @Mock private RecepcionistaUnidadeRepository recepcionistaUnidadeRepository;
    @Mock private HorarioTrabalhoRepository horarioTrabalhoRepository;
    @Mock private SalonService salonService;
    @InjectMocks private EquipeUnidadeService service;

    private Salon sede;
    private Salon filial;

    @BeforeEach
    void setUp() {
        sede = Salon.builder().id(1L).nome("Sede").ativo(true).build();
        filial = Salon.builder().id(3L).nome("Filial").ativo(true).build();
        lenient().when(salonService.unidadesDoMesmoDono(1L)).thenReturn(List.of(sede, filial));
    }

    @Test
    @DisplayName("Profissional: vincular cria o cadastro na unidade com especialidade, comissão e horários")
    void vinculaProfissional() {
        Usuario leticia = Usuario.builder().id(99L).nome("Leticia").role(Role.PROFISSIONAL).ativo(true).build();
        Profissional naSede = Profissional.builder().id(47L).usuario(leticia).salon(sede).ativo(true)
                .especialidade("Barba").tipoComissao(TipoComissao.FIXO).valorComissao(BigDecimal.TEN).build();
        when(usuarioRepository.findById(99L)).thenReturn(Optional.of(leticia));
        when(profissionalRepository.findAllByUsuarioIdOrderByIdAsc(99L)).thenReturn(List.of(naSede));
        when(profissionalRepository.findByUsuarioIdAndSalonId(99L, 1L)).thenReturn(Optional.of(naSede));
        when(profissionalRepository.findByUsuarioIdAndSalonId(99L, 3L)).thenReturn(Optional.empty());
        when(profissionalRepository.save(any(Profissional.class))).thenAnswer(inv -> {
            Profissional p = inv.getArgument(0);
            p.setId(48L);
            return p;
        });
        when(horarioTrabalhoRepository.findByProfissionalId(47L)).thenReturn(List.of(HorarioTrabalho.builder()
                .profissional(naSede).diaSemana(DiaSemana.SEGUNDA).horaInicio(LocalTime.of(9, 0))
                .horaFim(LocalTime.of(18, 0)).ativo(true).build()));

        service.atualizarUnidades(99L, List.of(3L), 1L);

        ArgumentCaptor<Profissional> novo = ArgumentCaptor.forClass(Profissional.class);
        verify(profissionalRepository).save(novo.capture());
        assertThat(novo.getValue().getSalon()).isSameAs(filial);
        assertThat(novo.getValue().getUsuario()).isSameAs(leticia);
        assertThat(novo.getValue().getEspecialidade()).isEqualTo("Barba");
        assertThat(novo.getValue().getTipoComissao()).isEqualTo(TipoComissao.FIXO);
        ArgumentCaptor<HorarioTrabalho> horario = ArgumentCaptor.forClass(HorarioTrabalho.class);
        verify(horarioTrabalhoRepository).save(horario.capture());
        assertThat(horario.getValue().getProfissional().getId()).isEqualTo(48L);
        assertThat(horario.getValue().getDiaSemana()).isEqualTo(DiaSemana.SEGUNDA);
    }

    @Test
    @DisplayName("Profissional: desvincular desativa o cadastro da outra unidade; o da unidade atual fica")
    void desvinculaProfissional() {
        Usuario leticia = Usuario.builder().id(99L).role(Role.PROFISSIONAL).ativo(true).build();
        Profissional naSede = Profissional.builder().id(47L).usuario(leticia).salon(sede).ativo(true).build();
        Profissional naFilial = Profissional.builder().id(48L).usuario(leticia).salon(filial).ativo(true).build();
        when(usuarioRepository.findById(99L)).thenReturn(Optional.of(leticia));
        when(profissionalRepository.findAllByUsuarioIdOrderByIdAsc(99L)).thenReturn(List.of(naSede, naFilial));
        when(profissionalRepository.findByUsuarioIdAndSalonId(99L, 1L)).thenReturn(Optional.of(naSede));
        when(profissionalRepository.findByUsuarioIdAndSalonId(99L, 3L)).thenReturn(Optional.of(naFilial));

        service.atualizarUnidades(99L, List.of(), 1L);

        assertThat(naFilial.isAtivo()).isFalse();
        assertThat(naSede.isAtivo()).isTrue();
    }

    @Test
    @DisplayName("Recepcionista: vincula e, ao sair da unidade em uso, passa para a unidade do admin")
    void recepcionista() {
        Usuario ana = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).salon(filial).ativo(true).build();
        RecepcionistaUnidade naSede = RecepcionistaUnidade.builder().id(1L).usuario(ana).salon(sede).build();
        RecepcionistaUnidade naFilial = RecepcionistaUnidade.builder().id(2L).usuario(ana).salon(filial).build();
        when(usuarioRepository.findById(14L)).thenReturn(Optional.of(ana));
        when(recepcionistaUnidadeRepository.findByUsuarioId(14L)).thenReturn(List.of(naSede, naFilial));

        service.atualizarUnidades(14L, List.of(), 1L);

        verify(recepcionistaUnidadeRepository).delete(naFilial);
        verify(recepcionistaUnidadeRepository, never()).delete(naSede);
        assertThat(ana.getSalon()).isSameAs(sede);
    }

    @Test
    @DisplayName("Não vincula a unidade de outro dono nem mexe em quem não é da unidade do admin")
    void recusas() {
        Usuario ana = Usuario.builder().id(14L).role(Role.RECEPCIONISTA).salon(sede).ativo(true).build();
        when(usuarioRepository.findById(14L)).thenReturn(Optional.of(ana));
        lenient().when(recepcionistaUnidadeRepository.findByUsuarioId(14L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.atualizarUnidades(14L, List.of(99L), 1L))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.unidadesDoMembro(14L, 3L))
                .isInstanceOf(AccessDeniedException.class);

        Usuario cliente = Usuario.builder().id(5L).role(Role.CLIENTE).build();
        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(cliente));
        assertThatThrownBy(() -> service.unidadesDoMembro(5L, 1L))
                .isInstanceOf(BusinessException.class);
        verify(recepcionistaUnidadeRepository, never()).save(any());
    }
}
