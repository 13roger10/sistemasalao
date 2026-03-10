package com.belezza.api.aspect;

import com.belezza.api.entity.AuditLog;
import com.belezza.api.repository.AuditLogRepository;
import com.belezza.api.security.annotation.Auditable;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

/**
 * AOP Aspect for automatic audit logging.
 * Intercepts methods annotated with @Auditable and creates audit log entries.
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    /**
     * Around advice for methods annotated with @Auditable.
     * Creates an audit log entry before and after method execution.
     */
    @Around("@annotation(com.belezza.api.security.annotation.Auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Auditable auditable = method.getAnnotation(Auditable.class);

        // Extract audit information
        String action = auditable.action();
        String entityType = auditable.entityType();
        String details = auditable.details();
        boolean captureOldState = auditable.captureOldState();
        boolean captureNewState = auditable.captureNewState();

        // Get current user information
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long usuarioId = null;
        String usuarioNome = "System";

        if (authentication != null && authentication.isAuthenticated() &&
            !(authentication.getPrincipal() instanceof String)) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof UserDetails) {
                usuarioNome = ((UserDetails) principal).getUsername();
                // Extract usuario ID from custom UserDetails implementation
                usuarioId = extractUsuarioId(principal);
            }
        }

        // Get HTTP request information
        String ipAddress = null;
        String userAgent = null;
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            ipAddress = getClientIpAddress(request);
            userAgent = request.getHeader("User-Agent");
        }

        Object oldState = null;
        Object result = null;
        boolean success = true;
        String errorMessage = null;
        Long entidadeId = null;

        try {
            // Capture old state if requested (for UPDATE/DELETE operations)
            if (captureOldState) {
                oldState = captureEntityState(joinPoint);
            }

            // Execute the actual method
            result = joinPoint.proceed();

            // Extract entity ID from result
            entidadeId = extractEntityId(result);

        } catch (Exception e) {
            success = false;
            errorMessage = e.getMessage();
            log.error("Error executing audited method: {}", method.getName(), e);
            throw e;

        } finally {
            try {
                // Create audit log entry
                AuditLog auditLog = AuditLog.builder()
                        .acao(action)
                        .entidade(entityType)
                        .entidadeId(entidadeId != null ? entidadeId : 0L)
                        .usuarioId(usuarioId)
                        .usuarioNome(usuarioNome)
                        .ipAddress(ipAddress)
                        .userAgent(truncate(userAgent, 500))
                        .detalhes(truncate(details, 500))
                        .sucesso(success)
                        .mensagemErro(truncate(errorMessage, 500))
                        .criadoEm(LocalDateTime.now())
                        .build();

                // Capture old state as JSON
                if (oldState != null) {
                    try {
                        auditLog.setDadosAntigos(objectMapper.writeValueAsString(oldState));
                    } catch (Exception e) {
                        log.warn("Failed to serialize old state: {}", e.getMessage());
                    }
                }

                // Capture new state as JSON
                if (captureNewState && result != null && success) {
                    try {
                        auditLog.setDadosNovos(objectMapper.writeValueAsString(result));
                    } catch (Exception e) {
                        log.warn("Failed to serialize new state: {}", e.getMessage());
                    }
                }

                // Save audit log asynchronously to avoid impacting performance
                auditLogRepository.save(auditLog);

                log.debug("Audit log created: action={}, entity={}, entityId={}, user={}",
                        action, entityType, entidadeId, usuarioNome);

            } catch (Exception e) {
                // Don't fail the main operation if audit logging fails
                log.error("Failed to create audit log: {}", e.getMessage(), e);
            }
        }

        return result;
    }

    /**
     * Extract usuario ID from UserDetails.
     * Override this method to extract ID from your custom UserDetails implementation.
     */
    private Long extractUsuarioId(Object principal) {
        // TODO: Implement extraction based on your UserDetails implementation
        // For now, returning null
        return null;
    }

    /**
     * Extract entity ID from method result.
     */
    private Long extractEntityId(Object result) {
        if (result == null) {
            return null;
        }

        try {
            // Try to get ID via reflection (assumes entity has getId() method)
            Method getIdMethod = result.getClass().getMethod("getId");
            Object id = getIdMethod.invoke(result);
            if (id instanceof Long) {
                return (Long) id;
            }
        } catch (Exception e) {
            log.debug("Could not extract entity ID from result: {}", e.getMessage());
        }

        return null;
    }

    /**
     * Capture entity state before operation.
     */
    private Object captureEntityState(ProceedingJoinPoint joinPoint) {
        // Try to find entity in method arguments
        Object[] args = joinPoint.getArgs();
        if (args != null && args.length > 0) {
            // Return first argument that looks like an entity (has an ID)
            for (Object arg : args) {
                if (arg != null && hasIdField(arg)) {
                    return arg;
                }
            }
        }
        return null;
    }

    /**
     * Check if object has an ID field.
     */
    private boolean hasIdField(Object obj) {
        try {
            Method getIdMethod = obj.getClass().getMethod("getId");
            return getIdMethod != null;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Get client IP address from request.
     * Checks X-Forwarded-For header for proxied requests.
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String[] headerNames = {
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_X_FORWARDED_FOR",
                "HTTP_X_FORWARDED",
                "HTTP_X_CLUSTER_CLIENT_IP",
                "HTTP_CLIENT_IP",
                "HTTP_FORWARDED_FOR",
                "HTTP_FORWARDED",
                "HTTP_VIA",
                "REMOTE_ADDR"
        };

        for (String header : headerNames) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For can contain multiple IPs, take the first one
                if (ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        }

        return request.getRemoteAddr();
    }

    /**
     * Truncate string to max length.
     */
    private String truncate(String str, int maxLength) {
        if (str == null) {
            return null;
        }
        if (str.length() <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength);
    }
}
