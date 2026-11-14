package com.projectshelf.engagement;

import com.projectshelf.catalogue.CatalogueService;
import com.projectshelf.common.AuditService;
import com.projectshelf.common.Types.Channel;
import com.projectshelf.engagement.EngagementEntities.CommunicationPreference;
import com.projectshelf.engagement.EngagementEntities.CommunicationPreferenceRepo;
import com.projectshelf.user.AuthUser;
import com.projectshelf.user.User;
import com.projectshelf.user.UserRepo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Everything here is scoped to the signed-in student's own id, taken from the session, never from the request. */
@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentController {
    private final UserRepo users;
    private final JdbcTemplate jdbc;
    private final CatalogueService catalogue;
    private final ConsentService consent;
    private final CommunicationPreferenceRepo prefsRepo;
    private final EngagementService engagement;
    private final AuditService audit;

    public record ProfileRequest(@NotBlank @Size(min = 2, max = 120) String fullName,
                                 @Pattern(regexp = "^$|^\\+?[0-9 ()-]{7,20}$", message = "Enter a valid phone number") String phone,
                                 @Size(max = 160) String college) {}

    public record PreferencesRequest(boolean activityConsent, boolean emailOptIn, boolean whatsappOptIn, Channel preferredChannel) {}

    @GetMapping("/profile")
    public Map<String, Object> profile(@AuthenticationPrincipal AuthUser me) {
        User u = users.findById(me.id()).orElseThrow();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("fullName", u.getFullName());
        m.put("email", u.getEmail());
        m.put("phone", u.getPhone());
        m.put("college", u.getCollege());
        m.put("deletionRequestedAt", u.getDeletionRequestedAt());
        m.put("createdAt", u.getCreatedAt());
        return m;
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ProfileRequest b) {
        User u = users.findById(me.id()).orElseThrow();
        u.setFullName(b.fullName().trim());
        u.setPhone(b.phone() == null || b.phone().isBlank() ? null : b.phone().trim());
        u.setCollege(b.college());
        users.save(u);
        if (u.getPhone() == null) consent.set(u, ConsentService.WHATSAPP, false, "DASHBOARD");   // no number, no WhatsApp opt-in
        return profile(me);
    }

    @GetMapping("/saved")
    public List<CatalogueService.PublicCard> saved(@AuthenticationPrincipal AuthUser me) {
        return catalogue.cards(jdbc.queryForList("SELECT s.project_id FROM saved_projects s JOIN projects p ON p.id = s.project_id "
                + "WHERE s.user_id = ? AND p.status = 'PUBLISHED' ORDER BY s.created_at DESC", Long.class, me.id()));
    }

    @GetMapping("/saved/ids")
    public List<Long> savedIds(@AuthenticationPrincipal AuthUser me) {
        return jdbc.queryForList("SELECT project_id FROM saved_projects WHERE user_id = ?", Long.class, me.id());
    }

    @PutMapping("/saved/{projectId}")
    public Map<String, Object> save(@AuthenticationPrincipal AuthUser me, @PathVariable long projectId) {
        Integer ok = jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE id = ? AND status = 'PUBLISHED'", Integer.class, projectId);
        if (ok == null || ok == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found.");
        jdbc.update("INSERT IGNORE INTO saved_projects (user_id, project_id, created_at) VALUES (?,?,UTC_TIMESTAMP(6))", me.id(), projectId);
        return Map.of("saved", true);
    }

    @DeleteMapping("/saved/{projectId}")
    public Map<String, Object> unsave(@AuthenticationPrincipal AuthUser me, @PathVariable long projectId) {
        jdbc.update("DELETE FROM saved_projects WHERE user_id = ? AND project_id = ?", me.id(), projectId);
        return Map.of("saved", false);
    }

    @GetMapping("/recommendations")
    public List<EngagementService.Recommendation> recommendations(@AuthenticationPrincipal AuthUser me) {
        return engagement.recommend(me.id());
    }

    @GetMapping("/preferences")
    public Map<String, Object> preferences(@AuthenticationPrincipal AuthUser me) {
        CommunicationPreference p = consent.prefs(me.id());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("activityConsent", p.isActivityConsent());
        m.put("emailOptIn", p.isEmailOptIn());
        m.put("whatsappOptIn", p.isWhatsappOptIn());
        m.put("preferredChannel", p.getPreferredChannel());
        m.put("wording", ConsentService.WORDING);
        m.put("history", consent.history(me.id()));
        return m;
    }

    @PutMapping("/preferences")
    @Transactional
    public Map<String, Object> updatePreferences(@AuthenticationPrincipal AuthUser me, @RequestBody PreferencesRequest b) {
        User u = users.findById(me.id()).orElseThrow();
        if (b.whatsappOptIn() && (u.getPhone() == null || u.getPhone().isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a WhatsApp number to your profile first.");
        consent.set(u, ConsentService.ACTIVITY, b.activityConsent(), "DASHBOARD");
        consent.set(u, ConsentService.EMAIL, b.emailOptIn(), "DASHBOARD");
        consent.set(u, ConsentService.WHATSAPP, b.whatsappOptIn(), "DASHBOARD");
        CommunicationPreference p = consent.prefs(me.id());
        p.setPreferredChannel(b.preferredChannel());
        prefsRepo.save(p);
        return preferences(me);
    }

    /** Records the request, stops all messaging and tracking immediately; an administrator completes the erasure. */
    @PostMapping("/delete-request")
    @Transactional
    public Map<String, Object> requestDeletion(@AuthenticationPrincipal AuthUser me) {
        User u = users.findById(me.id()).orElseThrow();
        if (u.getDeletionRequestedAt() == null) {
            u.setDeletionRequestedAt(Instant.now());
            users.save(u);
            consent.set(u, ConsentService.ACTIVITY, false, "DASHBOARD");
            consent.set(u, ConsentService.EMAIL, false, "DASHBOARD");
            consent.set(u, ConsentService.WHATSAPP, false, "DASHBOARD");
            audit.log("ACCOUNT_DELETION_REQUESTED", "user", u.getId(), null);
        }
        return Map.of("deletionRequestedAt", u.getDeletionRequestedAt());
    }
}
