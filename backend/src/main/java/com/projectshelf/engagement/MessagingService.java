package com.projectshelf.engagement;

import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Text;
import com.projectshelf.common.Types.Channel;
import com.projectshelf.common.Types.DraftStatus;
import com.projectshelf.engagement.EngagementEntities.CommunicationPreference;
import com.projectshelf.engagement.EngagementEntities.MessageDraft;
import com.projectshelf.engagement.EngagementEntities.MessageDraftRepo;
import com.projectshelf.integration.EmailClient;
import com.projectshelf.integration.IntegrationService;
import com.projectshelf.integration.WhatsAppClient;
import com.projectshelf.user.User;
import com.projectshelf.user.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.ZoneId;

/**
 * The only place messages leave the system. Engagement messages require: an approved draft, a current opt-in for the
 * channel, a configured provider, being outside quiet hours, and being under the weekly frequency limit.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MessagingService {
    private final EmailClient email;
    private final WhatsAppClient whatsapp;
    private final IntegrationService integrations;
    private final SettingsService settings;
    private final ConsentService consent;
    private final UserRepo users;
    private final MessageDraftRepo drafts;
    private final JdbcTemplate jdbc;

    @Value("${app.public-url}") private String publicUrl;
    @Value("${app.site-name:ProjectShelf}") private String siteName;
    @Value("${app.email.admin-notify}") private String adminNotify;

    public boolean emailReady() { return email.configured() && integrations.enabled("EMAIL"); }
    public boolean whatsappReady() { return whatsapp.templateConfigured() && integrations.enabled("WHATSAPP"); }
    public String adminNotifyAddress() { return adminNotify; }
    public String siteName() { return siteName; }
    public String publicUrl() { return publicUrl; }

    /** Transactional email about a student's own enquiry (acknowledgement, admin notification, direct reply). Returns true if sent. */
    public boolean sendEnquiryEmail(String kind, Long enquiryId, Long userId, String to, String subject, String body) {
        if (!emailReady() || Text.blank(to)) return false;
        return deliver(kind, null, userId, enquiryId, Channel.EMAIL, to, subject, body, null) == null;
    }

    public boolean inQuietHours() {
        LocalTime now = LocalTime.now(ZoneId.of(settings.getString("engagement.timezone")));
        LocalTime start = LocalTime.parse(settings.getString("engagement.quietStart")), end = LocalTime.parse(settings.getString("engagement.quietEnd"));
        return start.isAfter(end) ? (!now.isBefore(start) || now.isBefore(end)) : (!now.isBefore(start) && now.isBefore(end));
    }

    /** Tries to send an APPROVED draft. Leaves it APPROVED (with a note) when it has to wait; never sends without consent. */
    public void sendDraft(MessageDraft d) {
        if (d.getStatus() != DraftStatus.APPROVED) return;
        User u = users.findById(d.getUserId()).orElse(null);
        CommunicationPreference p = u == null ? null : consent.prefs(u.getId());
        boolean optedIn = p != null && (d.getChannel() == Channel.EMAIL ? p.isEmailOptIn() : p.isWhatsappOptIn());
        if (u == null || !u.isEnabled() || u.getDeletionRequestedAt() != null || !optedIn) {
            finish(d, DraftStatus.DISCARDED, "Not sent: the student has no current opt-in for this channel.");
            return;
        }
        boolean ready = d.getChannel() == Channel.EMAIL ? emailReady() : whatsappReady();
        if (!ready) { note(d, "Approved, not sent: the " + d.getChannel() + " provider is not configured or is disabled."); return; }
        if (inQuietHours()) { note(d, "Approved: waiting for quiet hours to end."); return; }
        Integer recent = jdbc.queryForObject("SELECT COUNT(*) FROM message_history WHERE user_id = ? AND kind = 'ENGAGEMENT' AND status <> 'FAILED' "
                + "AND created_at > UTC_TIMESTAMP() - INTERVAL 7 DAY", Integer.class, u.getId());
        if (recent != null && recent >= settings.getInt("engagement.maxMessagesPerWeek")) { note(d, "Approved: weekly message limit reached, will send when allowed."); return; }

        String error;
        if (d.getChannel() == Channel.EMAIL) {
            String unsubscribe = publicUrl + "/unsubscribe?token=" + p.getUnsubscribeToken();
            String body = d.getBody() + "\n\n--\nYou are receiving this because you opted in to updates from " + siteName
                    + ". Unsubscribe any time: " + unsubscribe;
            error = deliver("ENGAGEMENT", d.getId(), u.getId(), null, Channel.EMAIL, u.getEmail(), d.getSubject(), body,
                    publicUrl + "/api/public/unsubscribe?token=" + p.getUnsubscribeToken());
        } else if (Text.blank(u.getPhone())) {
            error = "No WhatsApp number on file";
        } else {
            error = deliver("ENGAGEMENT", d.getId(), u.getId(), null, Channel.WHATSAPP, u.getPhone(), null, d.getBody(), null);
        }
        finish(d, error == null ? DraftStatus.SENT : DraftStatus.FAILED, error == null ? "Sent." : "Send failed: " + error);
    }

    /** Sends through the provider and writes message_history. Returns null on success, otherwise the error text. */
    private String deliver(String kind, Long draftId, Long userId, Long enquiryId, Channel channel, String to, String subject, String body, String unsubscribeUrl) {
        String providerId = null, error = null;
        try {
            if (channel == Channel.EMAIL) {
                Integer today = jdbc.queryForObject("SELECT COUNT(*) FROM message_history WHERE channel = 'EMAIL' AND created_at >= UTC_DATE()", Integer.class);
                if (today != null && today >= settings.getInt("email.dailyLimit")) throw new IllegalStateException("Daily email limit reached");
                providerId = email.send(to, subject, body, unsubscribeUrl);
            } else {
                providerId = whatsapp.sendTemplate(to, body);
            }
            integrations.success(channel.name());
        } catch (Exception e) {
            error = Text.truncate(e.getMessage(), 500);
            log.warn("{} send failed: {}", channel, error);
            integrations.failure(channel.name(), error);
        }
        jdbc.update("INSERT INTO message_history (draft_id, user_id, enquiry_id, kind, channel, recipient, subject, body, provider_message_id, status, error, created_at) "
                + "VALUES (?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(6))", draftId, userId, enquiryId, kind, channel.name(), to, subject, body, providerId,
                error == null ? "SENT" : "FAILED", error);
        return error;
    }

    private void note(MessageDraft d, String note) {
        if (!note.equals(d.getStatusNote())) { d.setStatusNote(note); drafts.save(d); }
    }

    private void finish(MessageDraft d, DraftStatus status, String note) {
        d.setStatus(status);
        d.setStatusNote(note);
        drafts.save(d);
    }

    /** Called every minute: sends approved drafts that were waiting for quiet hours or the frequency window. */
    public void sendApproved() {
        drafts.findByStatusOrderByIdDesc(DraftStatus.APPROVED).forEach(this::sendDraft);
    }

    /** Real provider round-trip for the integrations page: sends a short test email to the admin notification address. */
    public String testEmail() {
        if (!email.configured()) throw new IllegalStateException("RESEND_API_KEY and EMAIL_FROM are not set.");
        if (Text.blank(adminNotify)) throw new IllegalStateException("Set ADMIN_NOTIFY_EMAIL: the test email is sent to that address.");
        String err = deliver("CONNECTION_TEST", null, null, null, Channel.EMAIL, adminNotify, siteName + " email test",
                "This is a test email from the " + siteName + " admin dashboard. Receiving it means the email integration works.", null);
        if (err != null) throw new IllegalStateException(err);
        return "Resend accepted a test email to " + adminNotify + ". Check that inbox to confirm delivery.";
    }

    public String refreshDeliveryStatus(long historyId) {
        var row = jdbc.queryForMap("SELECT provider_message_id AS pid, channel FROM message_history WHERE id = ?", historyId);
        if (row.get("pid") == null || !"EMAIL".equals(row.get("channel"))) return null;
        String status = email.deliveryStatus((String) row.get("pid"));
        if (status != null) jdbc.update("UPDATE message_history SET status = ? WHERE id = ?", status.toUpperCase(), historyId);
        return status;
    }
}
