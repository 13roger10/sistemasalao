package com.belezza.api.entity;

/**
 * WhatsApp message status.
 * Represents the delivery state of a WhatsApp message.
 */
public enum WhatsAppMessageStatus {
    /**
     * Message sent to WhatsApp API.
     */
    SENT,

    /**
     * Message delivered to recipient's device.
     */
    DELIVERED,

    /**
     * Message read by recipient.
     */
    READ,

    /**
     * Message failed to send.
     */
    FAILED,

    /**
     * Message queued for retry.
     */
    RETRYING
}
