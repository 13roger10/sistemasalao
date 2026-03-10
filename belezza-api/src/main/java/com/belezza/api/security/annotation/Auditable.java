package com.belezza.api.security.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that should be audited.
 * When applied to a method, an audit log entry will be created automatically.
 *
 * Usage:
 * <pre>
 * {@code
 * @Auditable(action = "CREATE", entityType = "Agendamento")
 * public Agendamento createAgendamento(...) {
 *     // method implementation
 * }
 * }
 * </pre>
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {

    /**
     * Action being performed (e.g., "CREATE", "UPDATE", "DELETE", "LOGIN").
     */
    String action();

    /**
     * Type of entity being audited (e.g., "Agendamento", "Usuario", "Post").
     */
    String entityType();

    /**
     * Additional details or description of the action.
     * Supports SpEL expressions to extract values from method parameters.
     */
    String details() default "";

    /**
     * Whether to capture the entity state before the operation (for UPDATE/DELETE).
     */
    boolean captureOldState() default false;

    /**
     * Whether to capture the entity state after the operation (for CREATE/UPDATE).
     */
    boolean captureNewState() default true;
}
