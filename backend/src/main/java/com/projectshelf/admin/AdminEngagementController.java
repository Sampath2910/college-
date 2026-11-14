package com.projectshelf.admin;

import com.projectshelf.common.AuditService;
import com.projectshelf.common.Types.DraftStatus;
import com.projectshelf.engagement.ConsentService;
import com.projectshelf.engagement.EngagementEntities.*;
import com.projectshelf.engagement.EngagementService;
import com.projectshelf.engagement.MessagingService;
import com.projectshelf.user.AuthUser;
import com.projectshelf.user.User;
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

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Engagement Agent controls. Nothing here is reachable by students. */
@RestController
@RequestMapping("/api/admin/engagement")
@RequiredArgsConstructor
public class AdminEngagementController {
    private final JdbcTemplate jdbc;
    private final UserRepo users;
    private final ConsentService consent;
    private final InterestProfileRepo profiles;
    private final MessageDraftRepo drafts;
    private final EngagementService engagement;
    private final MessagingService messaging;
    private final AuditService audit;

    @GetMapping("/students")
    public List<Map<String, Object>> students() {
        return jdbc.queryForList("SELECT u.id, u.full_name AS fullName, u.email, u.college, u.created_at AS createdAt, u.last_login_at AS lastLoginAt, "
                + "u.deletion_requested_at AS deletionRequestedAt, COALESCE(cp.activity_consent, FALSE) AS activityConsent, COALESCE(cp.email_opt_in, FALSE) AS emailOptIn, "
                + "COALESCE(cp.whatsapp_opt_in, FALSE) AS whatsappOptIn, ip.confidence, ip.last_activity_at AS lastActivityAt, JSON_EXTRACT(ip.inferred, '$.likelyCategories') AS likelyCategories, "
                + "(SELECT COUNT(*) FROM saved_projects s WHERE s.user_id = u.id) AS savedCount, (SELECT COUNT(*) FROM enquiries e WHERE e.user_id = u.id) AS enquiryCount "
                + "FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id AND r.name = 'STUDENT' "
                + "LEFT JOIN communication_preferences cp ON cp.user_id = u.id LEFT JOIN interest_profiles ip ON ip.user_id = u.id ORDER BY u.id DESC LIMIT 500");
    }

    @GetMapping("/students/{id}")
    @Transactional
    public Map<String, Object> student(@PathVariable long id) {
        User u = student(Long.valueOf(id));
        CommunicationPreference p = consent.prefs(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("fullName", u.getFullName());
        m.put("email", u.getEmail());
        m.put("phone", u.getPhone());
        m.put("college", u.getCollege());
        m.put("deletionRequestedAt", u.getDeletionRequestedAt());
        m.put("preferences", Map.of("activityConsent", p.isActivityConsent(), "emailOptIn", p.isEmailOptIn(), "whatsappOptIn", p.isWhatsappOptIn(),
                "preferredChannel", p.getPreferredChannel() == null ? "" : p.getPreferredChannel().name()));
        m.put("consentHistory", consent.history(id));
        if (p.isActivityConsent()) engagement.buildProfile(id);    // always show current data
        m.put("profile", profiles.findByUserId(id).orElse(null));
        m.put("recommendations", engagement.recommend(id));
        m.put("draftBlockedReason", engagement.ineligibility(u, p));
        m.put("enquiries", jdbc.queryForList("SELECT id, reference, status, service_type AS serviceType, created_at AS createdAt FROM enquiries WHERE user_id = ? ORDER BY id DESC", id));
        m.put("messages", jdbc.queryForList("SELECT id, kind, channel, subject, status, created_at AS createdAt FROM message_history WHERE user_id = ? ORDER BY id DESC LIMIT 50", id));
        return m;
    }

    /** Admin-side opt-out, e.g. when a student asks by phone or reply to stop messages. */
    @PostMapping("/students/{id}/opt-out")
    public void optOut(@PathVariable long id) {
        User u = student(Long.valueOf(id));
        consent.set(u, ConsentService.EMAIL, false, "ADMIN");
        consent.set(u, ConsentService.WHATSAPP, false, "ADMIN");
        audit.log("STUDENT_OPTED_OUT", "user", id, null);
    }

    /** Completes an erasure request: removes the account and its activity, and strips personal details from past enquiries. */
    @DeleteMapping("/students/{id}")
    @Transactional
    public void erase(@PathVariable long id) {
        User u = student(Long.valueOf(id));
        jdbc.update("UPDATE enquiries SET name = 'Deleted user', email = 'deleted@invalid', phone = NULL, college = NULL WHERE user_id = ?", id);
        jdbc.update("UPDATE message_history SET recipient = 'deleted', body = NULL WHERE user_id = ?", id);
        users.delete(u);   // cascades: events, profile, saved projects, recommendations, consent records, preferences, drafts
        audit.log("STUDENT_ERASED", "user", id, null);
    }

    @GetMapping("/drafts")
    public List<Map<String, Object>> drafts(@RequestParam(required = false) DraftStatus status) {
        return jdbc.queryForList("SELECT d.id, d.user_id AS userId, u.full_name AS studentName, u.email AS studentEmail, d.channel, d.subject, d.body, "
                + "d.trigger_reason AS triggerReason, d.generated_by AS generatedBy, d.status, d.status_note AS statusNote, d.created_at AS createdAt, d.reviewed_at AS reviewedAt "
                + "FROM message_drafts d JOIN users u ON u.id = d.user_id WHERE (? IS NULL OR d.status = ?) ORDER BY d.id DESC LIMIT 200",
                status == null ? null : status.name(), status == null ? null : status.name());
    }

    public record GenerateRequest(Long userId) {}

    @PostMapping("/drafts/generate")
    public Map<String, Object> generate(@RequestBody GenerateRequest b) {
        int created = engagement.generateDrafts(b.userId());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("created", created);
        if (created == 0 && b.userId() != null) {
            User u = student(b.userId());
            String why = engagement.ineligibility(u, consent.prefs(u.getId()));
            m.put("reason", why != null ? why : "No qualifying activity yet (repeat views or saves in one category, or an unfinished enquiry), or the same nudge was already drafted in the last 30 days.");
        }
        audit.log("DRAFTS_GENERATED", "draft", null, created + " created");
        return m;
    }

    public record DraftEdit(@Size(max = 200) String subject, @NotBlank @Size(max = 4000) String body) {}

    @PutMapping("/drafts/{id}")
    public MessageDraft edit(@PathVariable long id, @Valid @RequestBody DraftEdit b) {
        MessageDraft d = draft(id);
        if (d.getStatus() != DraftStatus.DRAFT) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only drafts awaiting review can be edited.");
        d.setSubject(b.subject());
        d.setBody(b.body().trim());
        return drafts.save(d);
    }

    public record DraftAction(@NotBlank String action) {}

    @PostMapping("/drafts/{id}/action")
    public MessageDraft act(@PathVariable long id, @Valid @RequestBody DraftAction b, @AuthenticationPrincipal AuthUser me) {
        MessageDraft d = draft(id);
        if (d.getStatus() != DraftStatus.DRAFT && !(d.getStatus() == DraftStatus.APPROVED && b.action().equals("discard")))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This draft has already been " + d.getStatus().name().toLowerCase() + ".");
        d.setReviewedBy(me.id());
        d.setReviewedAt(Instant.now());
        switch (b.action()) {
            case "approve" -> d.setStatus(DraftStatus.APPROVED);
            case "reject" -> d.setStatus(DraftStatus.REJECTED);
            case "discard" -> d.setStatus(DraftStatus.DISCARDED);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown action.");
        }
        d = drafts.save(d);
        audit.log("DRAFT_" + b.action().toUpperCase(), "draft", id, null);
        if (d.getStatus() == DraftStatus.APPROVED) messaging.sendDraft(d);   // sends now if consent, provider, quiet hours and limits allow
        return draft(id);
    }

    @GetMapping("/messages")
    public List<Map<String, Object>> messages() {
        return jdbc.queryForList("SELECT m.id, m.kind, m.channel, m.recipient, m.subject, m.status, m.error, m.created_at AS createdAt, m.enquiry_id AS enquiryId, "
                + "m.user_id AS userId FROM message_history m ORDER BY m.id DESC LIMIT 200");
    }

    @PostMapping("/messages/{id}/refresh")
    public Map<String, Object> refresh(@PathVariable long id) {
        try {
            String status = messaging.refreshDeliveryStatus(id);
            return Map.of("status", status == null ? "Not available for this message" : status);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not read the delivery status from the provider.");
        }
    }

    @GetMapping("/analytics")
    public Map<String, Object> analytics(@RequestParam(defaultValue = "30") int days) {
        return engagement.analytics(days);
    }

    private User student(Long id) {
        return users.findById(id).filter(u -> u.hasRole("STUDENT")).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found."));
    }

    private MessageDraft draft(long id) {
        return drafts.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found."));
    }
}
