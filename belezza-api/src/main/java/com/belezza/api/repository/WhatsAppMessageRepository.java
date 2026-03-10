package com.belezza.api.repository;

import com.belezza.api.entity.WhatsAppMessage;
import com.belezza.api.entity.WhatsAppMessageStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for WhatsApp message operations.
 */
@Repository
public interface WhatsAppMessageRepository extends JpaRepository<WhatsAppMessage, Long> {

    /**
     * Find message by WhatsApp API message ID.
     */
    Optional<WhatsAppMessage> findByMessageId(String messageId);

    /**
     * Find all messages for a specific appointment.
     */
    List<WhatsAppMessage> findByAgendamentoIdOrderByCriadoEmDesc(Long agendamentoId);

    /**
     * Find messages by salon and status.
     */
    Page<WhatsAppMessage> findBySalonIdAndStatus(Long salonId, WhatsAppMessageStatus status, Pageable pageable);

    /**
     * Find failed messages that can be retried.
     */
    @Query("""
        SELECT m FROM WhatsAppMessage m
        WHERE m.status = 'FAILED'
        AND m.tentativas < 3
        AND m.criadoEm > :since
        ORDER BY m.criadoEm ASC
        """)
    List<WhatsAppMessage> findRetryableFailed(@Param("since") LocalDateTime since);

    /**
     * Count messages by salon and status within a time period.
     */
    @Query("""
        SELECT COUNT(m) FROM WhatsAppMessage m
        WHERE m.salon.id = :salonId
        AND m.status = :status
        AND m.criadoEm BETWEEN :start AND :end
        """)
    long countBySalonAndStatusBetween(
        @Param("salonId") Long salonId,
        @Param("status") WhatsAppMessageStatus status,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    /**
     * Find messages by phone number.
     */
    List<WhatsAppMessage> findByTelefoneOrderByCriadoEmDesc(String telefone);

    /**
     * Count total messages sent by salon in current month.
     */
    @Query("""
        SELECT COUNT(m) FROM WhatsAppMessage m
        WHERE m.salon.id = :salonId
        AND m.criadoEm >= :firstDayOfMonth
        AND m.status != 'FAILED'
        """)
    long countMonthlySent(@Param("salonId") Long salonId, @Param("firstDayOfMonth") LocalDateTime firstDayOfMonth);
}
