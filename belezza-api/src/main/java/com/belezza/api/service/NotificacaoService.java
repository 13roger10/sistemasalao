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
import org.springframework.data.domain.PageRequest;
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

        // Tentar enviar push notification
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
    }

    @Transactional
    public void marcarTodasComoLidas(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        notificacaoRepository.marcarTodasComoLidas(usuario.getId());
        log.info("Todas notificações marcadas como lidas para usuário: {}", usuario.getId());
    }

    // ==================== NOTIFICAÇÕES DE AGENDAMENTO ====================

    @Transactional
    public void notificarAgendamentoConfirmado(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Agendamento Confirmado";
        String mensagem = String.format("Seu agendamento para %s às %s foi confirmado!",
                agendamento.getDataHora().toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/meus-agendamentos/" + agendamento.getId();

        criarNotificacao(usuario, TipoNotificacao.AGENDAMENTO_CONFIRMADO, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarAgendamentoCancelado(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Agendamento Cancelado";
        String mensagem = String.format("Seu agendamento para %s às %s foi cancelado.",
                agendamento.getDataHora().toLocalDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/agendar/" + agendamento.getSalon().getId();

        criarNotificacao(usuario, TipoNotificacao.AGENDAMENTO_CANCELADO, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarLembrete24h(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Lembrete de Agendamento";
        String mensagem = String.format("Seu agendamento é amanhã às %s. Não se esqueça!",
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/meus-agendamentos/" + agendamento.getId();

        criarNotificacao(usuario, TipoNotificacao.LEMBRETE_24H, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarLembrete2h(Agendamento agendamento) {
        Usuario usuario = agendamento.getCliente().getUsuario();
        String titulo = "Seu agendamento é em breve!";
        String mensagem = String.format("Seu agendamento é em 2 horas, às %s. Estamos te esperando!",
                agendamento.getDataHora().toLocalTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        String link = "/meus-agendamentos/" + agendamento.getId();

        criarNotificacao(usuario, TipoNotificacao.LEMBRETE_2H, titulo, mensagem, link, agendamento.getId());
    }

    @Transactional
    public void notificarCreditoFidelidade(Cliente cliente, String programaNome) {
        Usuario usuario = cliente.getUsuario();
        String titulo = "Você ganhou um crédito!";
        String mensagem = String.format("Parabéns! Você completou as visitas do programa %s e ganhou um crédito de recompensa!", programaNome);
        String link = "/fidelidade";

        criarNotificacao(usuario, TipoNotificacao.FIDELIDADE_CREDITO, titulo, mensagem, link, null);
    }

    @Transactional
    public void notificarNovoNivelFidelidade(Cliente cliente, NivelFidelidade novoNivel) {
        Usuario usuario = cliente.getUsuario();
        String titulo = "Você subiu de nível!";
        String mensagem = String.format("Parabéns! Você alcançou o nível %s no programa de fidelidade!", novoNivel.name());
        String link = "/fidelidade";

        criarNotificacao(usuario, TipoNotificacao.FIDELIDADE_NIVEL, titulo, mensagem, link, null);
    }

    @Transactional
    public void notificarAvaliacaoRecebida(Profissional profissional, int nota) {
        Usuario usuario = profissional.getUsuario();
        String titulo = "Nova avaliação recebida!";
        String mensagem = String.format("Você recebeu uma avaliação de %d estrelas. Continue o ótimo trabalho!", nota);
        String link = "/avaliacoes";

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
