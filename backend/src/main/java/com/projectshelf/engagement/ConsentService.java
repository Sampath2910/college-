package com.projectshelf.engagement;

import com.projectshelf.engagement.EngagementEntities.CommunicationPreference;
import com.projectshelf.engagement.EngagementEntities.CommunicationPreferenceRepo;
import com.projectshelf.engagement.EngagementEntities.InterestProfileRepo;
import com.projectshelf.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Consent is explicit, versioned and append-only (consent_records); communication_preferences holds the current state.
 * Withdrawing activity consent anonymises the student's past events and deletes their interest profile.
 */
@Service
@RequiredArgsConstructor
public class ConsentService {
    public static final String ACTIVITY = "ACTIVITY", EMAIL = "EMAIL", WHATSAPP = "WHATSAPP", ENQUIRY_CONTACT = "ENQUIRY_CONTACT";
    public static final String VERSION = "2026-11";
    public static final Map<String, String> WORDING = Map.of(
            ACTIVITY, "Remember which projects, categories and searches I look at while signed in, so the site can suggest relevant projects and the team can understand what I am interested in.",
            EMAIL, "Send me occasional emails about projects and services related to what I have explored. I can unsubscribe at any time.",
            WHATSAPP, "Send me occasional WhatsApp messages on the number I provided about projects and services related to what I have explored. I can opt out at any time.",
            ENQUIRY_CONTACT, "I agree to be contacted about this enquiry using the details I have provided.");

    private final CommunicationPreferenceRepo prefs;
    private final InterestProfileRepo profiles;
    private final JdbcTemplate jdbc;

    @Transactional
    public CommunicationPreference prefs(Long userId) {
        return prefs.findByUserId(userId).orElseGet(() -> {
            CommunicationPreference p = new CommunicationPreference();
            p.setUserId(userId);
            p.setUnsubscribeToken(UUID.randomUUID().toString());
            return prefs.save(p);
        });
    }

    @Transactional
    public void set(User u, String type, boolean granted, String source) {
        CommunicationPreference p = prefs(u.getId());
        boolean current = switch (type) {
            case ACTIVITY -> p.isActivityConsent();
            case EMAIL -> p.isEmailOptIn();
            case WHATSAPP -> p.isWhatsappOptIn();
            default -> throw new IllegalArgumentException(type);
        };
        if (current == granted && !"REGISTRATION".equals(source)) return;   // nothing changed
        record(u.getId(), null, u.getEmail(), type, granted, source);
        switch (type) {
            case ACTIVITY -> p.setActivityConsent(granted);
            case EMAIL -> p.setEmailOptIn(granted);
            default -> p.setWhatsappOptIn(granted);
        }
        prefs.save(p);
        if (ACTIVITY.equals(type) && !granted) {
            jdbc.update("UPDATE activity_events SET user_id = NULL WHERE user_id = ?", u.getId());
            jdbc.update("DELETE FROM recommendations WHERE user_id = ?", u.getId());
            profiles.deleteByUserId(u.getId());
        }
    }

    public void record(Long userId, Long enquiryId, String email, String type, boolean granted, String source) {
        jdbc.update("INSERT INTO consent_records (user_id, enquiry_id, email, consent_type, granted, wording, wording_version, source, created_at) "
                + "VALUES (?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", userId, enquiryId, email, type, granted, WORDING.get(type), VERSION, source);
    }

    public List<Map<String, Object>> history(Long userId) {
        return jdbc.queryForList("SELECT consent_type AS type, granted, wording, wording_version AS version, source, created_at AS createdAt "
                + "FROM consent_records WHERE user_id = ? ORDER BY id DESC", userId);
    }
}
