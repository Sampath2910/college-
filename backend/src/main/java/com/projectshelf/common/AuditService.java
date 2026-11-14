package com.projectshelf.common;

import com.projectshelf.user.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final JdbcTemplate jdbc;

    /** Records an action by the current user (or "system" for background jobs). */
    public void log(String action, String entityType, Object entityId, String detail) {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        AuthUser u = a != null && a.getPrincipal() instanceof AuthUser au ? au : null;
        jdbc.update("INSERT INTO audit_logs (actor_id, actor_email, action, entity_type, entity_id, detail, created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))",
                u == null ? null : u.id(), u == null ? "system" : u.email(), action, entityType,
                entityId == null ? null : entityId.toString(), Text.truncate(detail, 1000));
    }

    public List<Map<String, Object>> recent(int limit) {
        return jdbc.queryForList("SELECT id, actor_email AS actorEmail, action, entity_type AS entityType, entity_id AS entityId, detail, created_at AS createdAt "
                + "FROM audit_logs ORDER BY id DESC LIMIT ?", Math.min(limit, 500));
    }
}
