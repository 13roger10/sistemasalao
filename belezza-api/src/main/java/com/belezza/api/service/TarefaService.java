package com.belezza.api.service;

import com.belezza.api.dto.tarefa.TarefaRequest;
import com.belezza.api.dto.tarefa.TarefaResponse;
import com.belezza.api.dto.tarefa.TarefaStatusRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.TarefaHistoricoRepository;
import com.belezza.api.repository.TarefaRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TarefaService {

    private final TarefaRepository tarefaRepository;
    private final TarefaHistoricoRepository historicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final SalonService salonService;

    @Transactional
    public TarefaResponse criar(TarefaRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Usuario criador = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));

        Usuario atribuido = null;
        if (request.getAtribuidoAId() != null) {
            atribuido = usuarioRepository.findById(request.getAtribuidoAId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário", request.getAtribuidoAId()));
        }

        TarefaSalon tarefa = TarefaSalon.builder()
                .titulo(request.getTitulo().trim())
                .descricao(request.getDescricao())
                .prioridade(request.getPrioridade() != null ? request.getPrioridade() : PrioridadeTarefa.MEDIA)
                .recorrencia(request.getRecorrencia() != null ? request.getRecorrencia() : RecorrenciaTarefa.NENHUMA)
                .salon(salon)
                .criadoPor(criador)
                .atribuidoA(atribuido)
                .dataPrevista(request.getDataPrevista())
                .horaPrevista(request.getHoraPrevista())
                .observacoes(request.getObservacoes())
                .categoria(request.getCategoria())
                .local(request.getLocal())
                .tempoEstimadoMinutos(request.getTempoEstimadoMinutos())
                .build();

        tarefa = tarefaRepository.save(tarefa);
        log.info("Tarefa criada: {} no salão {}", tarefa.getId(), salon.getId());

        registrarHistorico(tarefa, criador, "CRIACAO", null, StatusTarefa.PENDENTE, "Tarefa criada");

        return TarefaResponse.fromEntity(tarefa);
    }

    @Transactional(readOnly = true)
    public Page<TarefaResponse> listar(String emailUsuario, Pageable pageable) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return tarefaRepository.findBySalonIdAndAtivoTrue(salon.getId(), pageable)
                .map(TarefaResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<TarefaResponse> listarMinhasTarefas(String emailUsuario) {
        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));
        return tarefaRepository.findMinhasTarefas(usuario.getId()).stream()
                .map(TarefaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TarefaResponse> listarTarefasHoje(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return tarefaRepository.findTarefasDoDia(salon.getId(), LocalDate.now()).stream()
                .map(TarefaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public TarefaResponse buscarPorId(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        TarefaSalon tarefa = tarefaRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa", id));
        return TarefaResponse.fromEntity(tarefa);
    }

    @Transactional
    public TarefaResponse atualizar(Long id, TarefaRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));

        TarefaSalon tarefa = tarefaRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa", id));

        tarefa.setTitulo(request.getTitulo().trim());
        if (request.getDescricao() != null) tarefa.setDescricao(request.getDescricao());
        if (request.getPrioridade() != null) tarefa.setPrioridade(request.getPrioridade());
        if (request.getRecorrencia() != null) tarefa.setRecorrencia(request.getRecorrencia());
        tarefa.setDataPrevista(request.getDataPrevista());
        tarefa.setHoraPrevista(request.getHoraPrevista());
        tarefa.setObservacoes(request.getObservacoes());
        tarefa.setCategoria(request.getCategoria());
        tarefa.setLocal(request.getLocal());
        tarefa.setTempoEstimadoMinutos(request.getTempoEstimadoMinutos());

        if (request.getAtribuidoAId() != null) {
            Usuario atribuido = usuarioRepository.findById(request.getAtribuidoAId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário", request.getAtribuidoAId()));
            tarefa.setAtribuidoA(atribuido);
        } else {
            tarefa.setAtribuidoA(null);
        }

        tarefa = tarefaRepository.save(tarefa);
        log.info("Tarefa atualizada: {}", tarefa.getId());

        registrarHistorico(tarefa, usuario, "ATUALIZACAO", null, null, "Tarefa atualizada");

        return TarefaResponse.fromEntity(tarefa);
    }

    @Transactional
    public TarefaResponse alterarStatus(Long id, TarefaStatusRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));

        TarefaSalon tarefa = tarefaRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa", id));

        StatusTarefa statusAnterior = tarefa.getStatus();
        tarefa.setStatus(request.getStatus());

        if (request.getStatus() == StatusTarefa.EM_ANDAMENTO && tarefa.getDataInicio() == null) {
            tarefa.setDataInicio(LocalDateTime.now());
        } else if (request.getStatus() == StatusTarefa.CONCLUIDA) {
            tarefa.setDataConclusao(LocalDateTime.now());
            if (request.getTempoRealMinutos() != null) {
                tarefa.setTempoRealMinutos(request.getTempoRealMinutos());
            }
        }

        tarefa = tarefaRepository.save(tarefa);
        log.info("Status da tarefa {} alterado de {} para {}", id, statusAnterior, request.getStatus());

        registrarHistorico(tarefa, usuario, "ALTERACAO_STATUS", statusAnterior, request.getStatus(), request.getObservacao());

        return TarefaResponse.fromEntity(tarefa);
    }

    @Transactional
    public TarefaResponse concluir(Long id, String emailUsuario) {
        TarefaStatusRequest request = TarefaStatusRequest.builder()
                .status(StatusTarefa.CONCLUIDA)
                .build();
        return alterarStatus(id, request, emailUsuario);
    }

    @Transactional
    public void excluir(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        TarefaSalon tarefa = tarefaRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Tarefa", id));

        tarefa.setAtivo(false);
        tarefaRepository.save(tarefa);
        log.info("Tarefa excluída: {}", id);
    }

    @Transactional(readOnly = true)
    public List<TarefaResponse> listarAtrasadas(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return tarefaRepository.findTarefasAtrasadas(salon.getId(), LocalDate.now()).stream()
                .map(TarefaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TarefaResponse> listarPorStatus(String emailUsuario, StatusTarefa status) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return tarefaRepository.findByStatusAndSalonId(salon.getId(), status).stream()
                .map(TarefaResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<String> listarCategorias(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return tarefaRepository.findCategoriasBySalonId(salon.getId());
    }

    private void registrarHistorico(TarefaSalon tarefa, Usuario usuario, String acao,
                                     StatusTarefa statusAnterior, StatusTarefa statusNovo, String descricao) {
        TarefaHistorico historico = TarefaHistorico.builder()
                .tarefa(tarefa)
                .usuario(usuario)
                .acao(acao)
                .statusAnterior(statusAnterior)
                .statusNovo(statusNovo)
                .descricao(descricao)
                .build();
        historicoRepository.save(historico);
    }
}
