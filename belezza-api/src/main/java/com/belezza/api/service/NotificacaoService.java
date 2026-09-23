package com.belezza.api.service;

import com.belezza.api.dto.notificacao.NotificacaoResponse;
import com.belezza.api.dto.notificacao.NotificacoesResumoResponse;
import com.belezza.api.dto.notificacao.PushSubscriptionRequest;
import com.belezza.api.entity.*;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.NotificacaoRepository;
import com.belezza.api.repository.PushSubscriptionRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificacaoService {

    private final NotificacaoRepository notificacaoRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacaoWebSocketService webSocketService;

    @Value("${app.push.vapid-public-key:}")
    private String vapidPublicKey;

    // ==================== SUBSCRIPTIONS ====================

    @Transactional
    public void registrarSubscription(PushSubscriptionRequest request, String email) {
        log.info("Registrando push subscription para: {}", email);

        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        String endpointHash = hashEndpoint(request.getEndpoint());

        // Check if subscription already exists
        if (pushSubscriptionRepository.existsByEndpointHash(endpointHash)) {
            log.debug("Push subscription já existe para endpoint hash: {}", endpointHash);
            return;
        }

        PushSubscription subscription = PushSubscription.builder()
                .usuario(usuario)
                .endpoint(request.getEndpoint())
                .endpointHash(endpointHash)
                .p256dhKey(request.getP256dhKey())
                .authKey(request.getAuthKey())
                .userAgent(request.getUserAgent())
                .deviceType(request.getDeviceType())
                .build();

        pushSubscriptionRepository.save(subscription);
        log.info("Push subscription registrada com sucesso para usuário: {}", usuario.getId());
    }

    @Transactional
    public void removerSubscription(String endpoint, String email) {
        log.info("Removendo push subscription para: {}", email);
        String endpointHash = hashEndpoint(endpoint);
        pushSubscriptionRepository.desativarByEndpointHash(endpointHash);
        log.info("Push subscription removida");
    }

    public String getVapidPublicKey() {
        return vapidPublicKey;
    }

    // ==================== NOTIFICAÇÕES ====================

    @Transactional
    public Notificacao criarNotificacao(Usuario usuario, TipoNotificacao tipo, String titulo, String mensagem, String link, Long agendamentoId) {
        Notificacao notificacao = Notificacao.builder()
                .usuario(usuario)
                .tipo(tipo)
                .titulo(titulo)
                .mensagem(mensagem)
                .link(link)
                .agendamentoId(agendamentoId)
                .build();

        notificacao = notificacaoRepository.save(notificacao);
        log.info("Notificação criada: {} para usuário {}", notificacao.getId(), usuario.getId());

        // Real-time: push via WebSocket (async, non-blocking)
        webSocketService.enviarParaUsuario(usuario.getEmail(), notificacao);

        // Legacy push notification (browser push / PWA)
        enviarPushNotificationAsync(usuario.getId(), titulo, mensagem, link);

        return notificacao;
    }

    @Transactional(readOnly = true)
    public Page<NotificacaoResponse> listarNotificacoes(String email, Pageable pageable) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        return notificacaoRepository.findByUsuarioIdOrderByCriadoEmDesc(usuario.getId(), pageable)
                .map(NotificacaoResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public NotificacoesResumoResponse getResumo(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        long totalNaoLidas = notificacaoRepository.countByUsuarioIdAndLidaFalse(usuario.getId());
        List<Notificacao> recentes = notificacaoRepository.findByUsuarioIdAndLidaFalseOrderByCriadoEmDesc(usuario.getId());
        List<NotificacaoResponse> recentesResponse = recentes.stream()
                .limit(10)
                .map(NotificacaoResponse::fromEntity)
                .toList();

        return NotificacoesResumoResponse.builder()
                .totalNaoLidas(totalNaoLidas)
                .recentes(recentesResponse)
                .build();
    }

    @Transactional
    public void marcarComoLida(Long notificacaoId, String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        Notificacao notificacao = notificacaoRepository.findById(notificacaoId)
                .orElseThrow(() -> new ResourceNotFoundException("Notificação", notificacaoId));

        if (!notificacao.getUsuario().getId().equals(usuario.getId())) {
            throw new ResourceNotFoundException("Notificação", notificacaoId);
        }

        notificacaoRepository.marcarComoLida(notificacaoId);

        // Push updated badge counter via WebSocket
        long naoLidas = notificacaoRepository.countByUsuarioIdAndLidaFalse(usuario.getId());
        webSocketService.enviarContador(email, naoLidas);
    }

    @Transactional
    public void marcarTodasComoLidas(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        notificacaoRepository.marcarTodasComoLidas(usuario.getId());
        log.info("Todas notificações marcadas como lidas para usuário: {}", usuario.getId());

        // Badge goes to zero
        webSocketService.enviarContador(email, 0);
    }

    // ==================== NOTIFICAÇÕES DE AGENDAMENTO ====================

    /**
     * Notifica o cliente que um agendamento foi criado para ele (por um profissional
     * ou administrador) e está aguardando a confirmação dele.
     */
    @Transactional
    public void notificarClienteAgendamentoPendente(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Confirme seu agendamento";
        String mensagem = String.format("Você tem um novo agendamento para %s às %s, aguardando sua confirmação.",
                agendamento.getDataHora().toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/salon/client/appointments";

        criarNotificacao(usuario, TipoNotificacao.AGENDAMENTO_PENDENTE, titulo, mensagem, link, agendamento.getId());
    }

    /**
     * Notifica o profissional, a recepção e o administrador do salão que o cliente confirmou
     * o agendamento (via link de confirmação por token, ou pelo próprio app).
     */
    @Transactional
    public void notificarEquipeAgendamentoConfirmadoPeloCliente(Agendamento agendamento) {
        Salon salon = agendamento.getSalon();
        String nomeCliente = agendamento.getCliente() != null && agendamento.getCliente().getUsuario() != null
                ? agendamento.getCliente().getUsuario().getNome() : "Cliente";
        String data = agendamento.getDataHora().toLocalDate()
                .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM"));
        String hora = agendamento.getDataHora().toLocalTime()
                .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));

        String titulo = "Cliente confirmou agendamento";
        String mensagem = String.format("%s confirmou o agendamento de %s às %s.", nomeCliente, data, hora);
        String link = "/salon/appointments";

        if (agendamento.getProfissional() != null && agendamento.getProfissional().getUsuario() != null) {
            criarNotificacao(agendamento.getProfissional().getUsuario(), TipoNotificacao.AGENDAMENTO_CONFIRMADO_CLIENTE, titulo, mensagem, link, agendamento.getId());
        }

        if (salon.getAdmin() != null) {
            criarNotificacao(salon.getAdmin(), TipoNotificacao.AGENDAMENTO_CONFIRMADO_CLIENTE, titulo, mensagem, link, agendamento.getId());
        }

        List<Usuario> recepcionistas = usuarioRepository.findByRoleAndSalonIdAndAtivoTrue(Role.RECEPCIONISTA, salon.getId());
        for (Usuario recepcionista : recepcionistas) {
            criarNotificacao(recepcionista, TipoNotificacao.AGENDAMENTO_CONFIRMADO_CLIENTE, titulo, mensagem, link, agendamento.getId());
        }
    }

    /**
     * Notifica o profissional, a recepção e o administrador do salão que o cliente
     * reagendou o próprio atendimento (data/hora, e possivelmente profissional/serviços).
     */
    @Transactional
    public void notificarEquipeAgendamentoReagendadoPeloCliente(Agendamento agendamento) {
        Salon salon = agendamento.getSalon();
        String nomeCliente = agendamento.getCliente() != null && agendamento.getCliente().getUsuario() != null
                ? agendamento.getCliente().getUsuario().getNome() : "Cliente";
        String data = agendamento.getDataHora().toLocalDate()
                .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM"));
        String hora = agendamento.getDataHora().toLocalTime()
                .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));

        String titulo = "Cliente reagendou atendimento";
        String mensagem = String.format("%s reagendou o atendimento para %s às %s.", nomeCliente, data, hora);
        String link = "/salon/appointments";

        if (agendamento.getProfissional() != null && agendamento.getProfissional().getUsuario() != null) {
            criarNotificacao(agendamento.getProfissional().getUsuario(), TipoNotificacao.AGENDAMENTO_REAGENDADO, titulo, mensagem, link, agendamento.getId());
        }

        if (salon.getAdmin() != null) {
            criarNotificacao(salon.getAdmin(), TipoNotificacao.AGENDAMENTO_REAGENDADO, titulo, mensagem, link, agendamento.getId());
        }

        List<Usuario> recepcionistas = usuarioRepository.findByRoleAndSalonIdAndAtivoTrue(Role.RECEPCIONISTA, salon.getId());
        for (Usuario recepcionista : recepcionistas) {
            criarNotificacao(recepcionista, TipoNotificacao.AGENDAMENTO_REAGENDADO, titulo, mensagem, link, agendamento.getId());
        }
    }

    /**
     * Notifica a equipe do salão (profissional do atendimento, administrador e recepção)
     * sobre qualquer mudança de status de um agendamento — confirmação, início, conclusão,
     * cancelamento, reagendamento ou no-show. Usada para que a equipe toda saiba imediatamente
     * quando o status muda, e não só o cliente.
     *
     * @param autor Quem executou a ação (pode ser null para fluxos automáticos/por token).
     *              Se informado, essa pessoa é excluída dos destinatários — ela não precisa
     *              ser notificada de uma ação que ela mesma acabou de realizar.
     */
    @Transactional
    public void notificarEquipeMudancaStatusAgendamento(Agendamento agendamento, Usuario autor,
                                                          TipoNotificacao tipo, String titulo, String mensagem) {
        Salon salon = agendamento.getSalon();
        String link = "/salon/appointments";
        Long autorId = autor != null ? autor.getId() : null;

        if (agendamento.getProfissional() != null && agendamento.getProfissional().getUsuario() != null) {
            Usuario profUsuario = agendamento.getProfissional().getUsuario();
            if (autorId == null || !profUsuario.getId().equals(autorId)) {
                criarNotificacao(profUsuario, tipo, titulo, mensagem, link, agendamento.getId());
            }
        }

        if (salon.getAdmin() != null && (autorId == null || !salon.getAdmin().getId().equals(autorId))) {
            criarNotificacao(salon.getAdmin(), tipo, titulo, mensagem, link, agendamento.getId());
        }

        List<Usuario> recepcionistas = usuarioRepository.findByRoleAndSalonIdAndAtivoTrue(Role.RECEPCIONISTA, salon.getId());
        for (Usuario recepcionista : recepcionistas) {
            if (autorId == null || !recepcionista.getId().equals(autorId)) {
                criarNotificacao(recepcionista, tipo, titulo, mensagem, link, agendamento.getId());
            }
        }
    }

    @Transactional
    public void notificarAgendamentoConfirmado(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Agendamento Confirmado";
        String mensagem = String.format("Seu agendamento para %s às %s foi confirmado!",
                agendamento.getDataHora().toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/salon/client/appointments";

        criarNotificacao(usuario, TipoNotificacao.AGENDAMENTO_CONFIRMADO, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarAgendamentoReagendado(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Agendamento Reagendado";
        String mensagem = String.format("Seu agendamento foi reagendado para %s às %s.",
                agendamento.getDataHora().toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/salon/client/appointments";

        criarNotificacao(usuario, TipoNotificacao.AGENDAMENTO_REAGENDADO, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarAgendamentoCancelado(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Agendamento Cancelado";
        String mensagem = String.format("Seu agendamento para %s às %s foi cancelado.",
                agendamento.getDataHora().toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/salon/client/appointments";

        criarNotificacao(usuario, TipoNotificacao.AGENDAMENTO_CANCELADO, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarLembrete24h(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Lembrete de Agendamento";
        String mensagem = String.format("Seu agendamento é amanhã às %s. Não se esqueça!",
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/salon/client/appointments";

        criarNotificacao(usuario, TipoNotificacao.LEMBRETE_24H, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarLembrete2h(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Seu agendamento é em breve!";
        String mensagem = String.format("Seu agendamento é em 2 horas, às %s. Estamos te esperando!",
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/salon/client/appointments";

        criarNotificacao(usuario, TipoNotificacao.LEMBRETE_2H, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarCreditoFidelidade(Cliente cliente, String programaNome) {
        Usuario usuario = cliente.getUsuario();
        String titulo = "Você ganhou um crédito!";
        String mensagem = String.format("Parabéns! Você completou as visitas do programa %s e ganhou um crédito de recompensa!", programaNome);
        String link = "/salon/client/loyalty";

        criarNotificacao(usuario, TipoNotificacao.FIDELIDADE_CREDITO, titulo, mensagem, link, null);
    }

    @Transactional
    public void notificarNovoNivelFidelidade(Cliente cliente, NivelFidelidade novoNivel) {
        Usuario usuario = cliente.getUsuario();
        String titulo = "Você subiu de nível!";
        String mensagem = String.format("Parabéns! Você alcançou o nível %s no programa de fidelidade!", novoNivel.name());
        String link = "/salon/client/loyalty";

        criarNotificacao(usuario, TipoNotificacao.FIDELIDADE_NIVEL, titulo, mensagem, link, null);
    }

    @Transactional
    public void notificarAvaliacaoRecebida(Profissional profissional, int nota) {
        Usuario usuario = profissional.getUsuario();
        String titulo = "Nova avaliação recebida!";
        String mensagem = String.format("Você recebeu uma avaliação de %d estrelas. Continue o ótimo trabalho!", nota);
        String link = "/salon/appointments";

        criarNotificacao(usuario, TipoNotificacao.AVALIACAO_RECEBIDA, titulo, mensagem, link, null);
    }

    // ==================== PUSH NOTIFICATION ====================

    @Async
    protected void enviarPushNotificationAsync(Long usuarioId, String titulo, String mensagem, String link) {
        try {
            List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUsuarioIdAndAtivoTrue(usuarioId);
            if (subscriptions.isEmpty()) {
                log.debug("Nenhuma subscription ativa para usuário: {}", usuarioId);
                return;
            }

            for (PushSubscription subscription : subscriptions) {
                try {
                    // Here you would integrate with a Web Push library like web-push
                    // For now, we just log it
                    log.info("Enviando push para endpoint: {} - Título: {}",
                            subscription.getEndpointHash().substring(0, 8), titulo);
                    pushSubscriptionRepository.atualizarUltimoUso(subscription.getId());
                } catch (Exception e) {
                    log.error("Erro ao enviar push para subscription {}: {}", subscription.getId(), e.getMessage());
                    // Mark as inactive if push fails
                    subscription.setAtivo(false);
                    pushSubscriptionRepository.save(subscription);
                }
            }
        } catch (Exception e) {
            log.error("Erro ao enviar push notifications: {}", e.getMessage(), e);
        }
    }

    // ==================== HELPERS ====================

    private String hashEndpoint(String endpoint) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(endpoint.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
