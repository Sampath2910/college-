package com.projectshelf.engagement;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectshelf.common.Text;
import com.projectshelf.engagement.EngagementEntities.CommunicationPreferenceRepo;
import com.projectshelf.user.AuthUser;
import com.projectshelf.user.UserRepo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * First-party activity tracking. An event is linked to a student only when they are signed in AND have granted
 * activity consent; otherwise it is stored without any identifier and only feeds aggregate counts.
 * No cookies, fingerprints or IP addresses are stored.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class ActivityController {
    static final Set<String> TYPES = Set.of("PROJECT_VIEW", "CATEGORY_VIEW", "SEARCH", "FILTER", "SAVE", "DEMO_CLICK", "SOURCE_CLICK",
            "SERVICE_VIEW", "ENQUIRY_START", "ENQUIRY_SUBMIT", "WHATSAPP_CLICK", "EMAIL_CLICK");

    private final JdbcTemplate jdbc;
    private final ConsentService consent;
    private final CommunicationPreferenceRepo prefs;
    private final UserRepo users;
    private final ObjectMapper json;

    public record TrackRequest(@NotBlank String type, Long projectId, @Size(max = 90) String categorySlug, @Size(max = 200) String query,
                               Map<String, String> meta) {}

    @PostMapping("/track")
    public Map<String, Object> track(@Valid @RequestBody TrackRequest b, @AuthenticationPrincipal AuthUser me) throws Exception {
        if (!TYPES.contains(b.type())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown event type.");
        if (me != null && me.isAdmin()) return Map.of("recorded", false);   // staff browsing is not student activity
        Long projectId = b.projectId();
        if (projectId != null) {
            Integer ok = jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE id = ? AND status = 'PUBLISHED'", Integer.class, projectId);
            if (ok == null || ok == 0) return Map.of("recorded", false);
        }
        Long categoryId = null;
        if (!Text.blank(b.categorySlug())) {
            List<Long> ids = jdbc.queryForList("SELECT id FROM categories WHERE slug = ?", Long.class, b.categorySlug());
            categoryId = ids.isEmpty() ? null : ids.get(0);
        }
        Map<String, String> meta = new LinkedHashMap<>();
        if (b.meta() != null) b.meta().entrySet().stream().limit(6).forEach(e -> meta.put(Text.truncate(e.getKey(), 40), Text.truncate(e.getValue(), 120)));
        Long userId = me != null && consent.prefs(me.id()).isActivityConsent() ? me.id() : null;
        jdbc.update("INSERT INTO activity_events (user_id, event_type, project_id, category_id, search_query, metadata, created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))",
                userId, b.type(), projectId, categoryId, Text.blank(b.query()) ? null : b.query().trim(), meta.isEmpty() ? null : json.writeValueAsString(meta));
        if ("PROJECT_VIEW".equals(b.type()) && projectId != null) jdbc.update("UPDATE projects SET view_count = view_count + 1 WHERE id = ?", projectId);
        return Map.of("recorded", true);
    }

    /** The exact consent wording (and version) the frontend must display next to each checkbox. */
    @GetMapping("/consent-wording")
    public Map<String, Object> wording() {
        return Map.of("version", ConsentService.VERSION, "wording", ConsentService.WORDING);
    }

    /** Opt out of all marketing messages using the token from an email footer. Idempotent. */
    @PostMapping("/unsubscribe")
    @Transactional
    public Map<String, Object> unsubscribe(@RequestParam String token) {
        var p = prefs.findByUnsubscribeToken(token).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This unsubscribe link is not valid."));
        users.findById(p.getUserId()).ifPresent(u -> {
            consent.set(u, ConsentService.EMAIL, false, "UNSUBSCRIBE_LINK");
            consent.set(u, ConsentService.WHATSAPP, false, "UNSUBSCRIBE_LINK");
        });
        return Map.of("unsubscribed", true);
    }
}
