package com.projectshelf.engagement;

import com.projectshelf.catalogue.CatalogueService;
import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Types.Channel;
import com.projectshelf.common.Types.DraftStatus;
import com.projectshelf.discovery.AiClient;
import com.projectshelf.engagement.EngagementEntities.*;
import com.projectshelf.user.User;
import com.projectshelf.user.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

/**
 * The private Student Engagement Agent. It summarises consented first-party activity into interest profiles,
 * recommends catalogue projects and prepares message drafts for an administrator to review.
 * It never sets prices, makes promises, contacts anonymous visitors or sends anything by itself.
 */
@Service
@RequiredArgsConstructor
public class EngagementService {
    private final JdbcTemplate jdbc;
    private final UserRepo users;
    private final ConsentService consent;
    private final InterestProfileRepo profiles;
    private final MessageDraftRepo drafts;
    private final CatalogueService catalogue;
    private final AiClient ai;
    private final SettingsService settings;
    private final MessagingService messaging;

    public record Recommendation(CatalogueService.PublicCard project, String reason) {}

    // ---------- interest profiles ----------

    /** Rebuilds profiles for every student who has granted activity consent. Returns the number of profiles written. */
    @Transactional
    public int aggregateProfiles() {
        int n = 0;
        for (User u : users.findStudents()) {
            if (!consent.prefs(u.getId()).isActivityConsent() || u.getDeletionRequestedAt() != null) continue;
            buildProfile(u.getId());
            recommend(u.getId());
            n++;
        }
        return n;
    }

    @Transactional
    public InterestProfile buildProfile(Long uid) {
        String window = " AND e.created_at > UTC_TIMESTAMP() - INTERVAL 90 DAY ";
        List<Map<String, Object>> categories = jdbc.queryForList("SELECT c.name, COUNT(*) AS views FROM activity_events e LEFT JOIN projects p ON p.id = e.project_id "
                + "JOIN categories c ON c.id = COALESCE(e.category_id, p.category_id) WHERE e.user_id = ? AND e.event_type IN ('PROJECT_VIEW','CATEGORY_VIEW')"
                + window + "GROUP BY c.id, c.name ORDER BY views DESC LIMIT 8", uid);
        List<Map<String, Object>> technologies = jdbc.queryForList("SELECT t.name, COUNT(*) AS projects FROM (SELECT e.project_id FROM activity_events e "
                + "WHERE e.user_id = ? AND e.event_type = 'PROJECT_VIEW'" + window + "UNION ALL SELECT project_id FROM saved_projects WHERE user_id = ?) x "
                + "JOIN project_technologies pt ON pt.project_id = x.project_id JOIN technologies t ON t.id = pt.technology_id "
                + "GROUP BY t.id, t.name ORDER BY projects DESC LIMIT 10", uid, uid);
        List<Map<String, Object>> viewed = jdbc.queryForList("SELECT p.id, p.title, COUNT(*) AS views FROM activity_events e JOIN projects p ON p.id = e.project_id "
                + "WHERE e.user_id = ? AND e.event_type = 'PROJECT_VIEW'" + window + "GROUP BY p.id, p.title ORDER BY views DESC LIMIT 10", uid);
        List<Map<String, Object>> saved = jdbc.queryForList("SELECT p.id, p.title FROM saved_projects s JOIN projects p ON p.id = s.project_id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 20", uid);
        List<String> searches = jdbc.queryForList("SELECT e.search_query FROM activity_events e WHERE e.user_id = ? AND e.event_type = 'SEARCH' AND e.search_query IS NOT NULL"
                + window + "GROUP BY e.search_query ORDER BY MAX(e.created_at) DESC LIMIT 10", String.class, uid);
        Map<String, Object> totals = jdbc.queryForMap("SELECT COUNT(*) AS events, MAX(created_at) AS lastAt FROM activity_events WHERE user_id = ?", uid);
        Integer enquiries = jdbc.queryForObject("SELECT COUNT(*) FROM enquiries WHERE user_id = ?", Integer.class, uid);

        Map<String, Object> observed = new LinkedHashMap<>();
        observed.put("categoryViews", categories);
        observed.put("technologiesInViewedOrSavedProjects", technologies);
        observed.put("viewedProjects", viewed);
        observed.put("savedProjects", saved);
        observed.put("recentSearches", searches);
        observed.put("enquiriesSubmitted", enquiries);
        observed.put("totalEvents", totals.get("events"));

        Map<String, Object> inferred = new LinkedHashMap<>();
        inferred.put("likelyCategories", categories.stream().filter(c -> num(c.get("views")) >= 2).map(c -> c.get("name")).toList());
        inferred.put("likelyTechnologies", technologies.stream().filter(t -> num(t.get("projects")) >= 2).map(t -> t.get("name")).toList());
        inferred.put("basis", "Inferred from repeat counts (2 or more) in the observed data. Viewing a project is not evidence of intent to buy.");

        long events = num(totals.get("events"));
        InterestProfile p = profiles.findByUserId(uid).orElseGet(InterestProfile::new);
        p.setUserId(uid);
        p.setObserved(observed);
        p.setInferred(inferred);
        p.setConfidence(BigDecimal.valueOf(Math.min(1.0, events / 20.0)).setScale(3, RoundingMode.HALF_UP));
        p.setLastActivityAt(totals.get("lastAt") instanceof LocalDateTime t ? t.toInstant(ZoneOffset.UTC) : null);
        return profiles.save(p);
    }

    // ---------- recommendations ----------

    /**
     * Ranks published projects by overlap with what the student saved (always) and viewed (only recorded with consent).
     * Score = 3 for a shared category + 1 per shared technology. Reasons state only the overlap that was found.
     * ponytail: scans all published projects per student; precompute per-category candidate lists if this gets slow.
     */
    @Transactional
    public List<Recommendation> recommend(Long uid) {
        String basis = "(SELECT project_id FROM saved_projects WHERE user_id = ? UNION SELECT project_id FROM activity_events "
                + "WHERE user_id = ? AND event_type = 'PROJECT_VIEW' AND project_id IS NOT NULL AND created_at > UTC_TIMESTAMP() - INTERVAL 90 DAY)";
        Map<Long, String> cats = new HashMap<>();
        jdbc.query("SELECT DISTINCT c.id, c.name FROM projects p JOIN categories c ON c.id = p.category_id WHERE p.id IN " + basis,
                rs -> { cats.put(rs.getLong(1), rs.getString(2)); }, uid, uid);
        Map<Long, String> techs = new HashMap<>();
        jdbc.query("SELECT DISTINCT t.id, t.name FROM project_technologies pt JOIN technologies t ON t.id = pt.technology_id WHERE pt.project_id IN " + basis,
                rs -> { techs.put(rs.getLong(1), rs.getString(2)); }, uid, uid);
        jdbc.update("DELETE FROM recommendations WHERE user_id = ?", uid);
        if (cats.isEmpty() && techs.isEmpty()) return List.of();

        record Scored(long id, double score, String reason) {}
        List<Scored> scored = new ArrayList<>();
        for (Map<String, Object> row : jdbc.queryForList("SELECT p.id, p.category_id AS cat, GROUP_CONCAT(pt.technology_id) AS techs FROM projects p "
                + "LEFT JOIN project_technologies pt ON pt.project_id = p.id WHERE p.status = 'PUBLISHED' AND p.id NOT IN " + basis
                + " AND p.id NOT IN (SELECT project_id FROM enquiries WHERE user_id = ? AND project_id IS NOT NULL) GROUP BY p.id, p.category_id", uid, uid, uid)) {
            List<String> shared = new ArrayList<>();
            if (row.get("techs") != null)
                for (String t : row.get("techs").toString().split(","))
                    if (techs.containsKey(Long.valueOf(t))) shared.add(techs.get(Long.valueOf(t)));
            String cat = row.get("cat") == null ? null : cats.get(num(row.get("cat")));
            double score = (cat != null ? 3 : 0) + shared.size();
            if (score < 2) continue;
            Collections.sort(shared);
            String reason = (cat != null ? "Same category as projects you viewed or saved (" + cat + ")" : "")
                    + (cat != null && !shared.isEmpty() ? "; " : "")
                    + (shared.isEmpty() ? "" : "uses " + String.join(", ", shared.subList(0, Math.min(3, shared.size()))) + ", also used by projects you viewed or saved");
            scored.add(new Scored(num(row.get("id")), score, Character.toUpperCase(reason.charAt(0)) + reason.substring(1)));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed().thenComparing(Scored::id, Comparator.reverseOrder()));
        List<Scored> top = scored.subList(0, Math.min(8, scored.size()));
        for (Scored s : top)
            jdbc.update("INSERT INTO recommendations (user_id, project_id, score, reason, created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))", uid, s.id(), s.score(), s.reason());
        Map<Long, CatalogueService.PublicCard> cards = new HashMap<>();
        catalogue.cards(top.stream().map(Scored::id).toList()).forEach(c -> cards.put(c.id(), c));
        return top.stream().filter(s -> cards.containsKey(s.id())).map(s -> new Recommendation(cards.get(s.id()), s.reason())).toList();
    }

    // ---------- message drafts ----------

    /** Creates at most one new draft per eligible student. Returns the number of drafts created. */
    @Transactional
    public int generateDrafts(Long onlyUserId) {
        int created = 0;
        for (User u : users.findStudents()) {
            if (onlyUserId != null && !onlyUserId.equals(u.getId())) continue;
            if (createDraftFor(u) != null) created++;
        }
        return created;
    }

    /** Explains why no draft can be created for this student, or null if one can. */
    public String ineligibility(User u, CommunicationPreference p) {
        if (!u.isEnabled() || u.getDeletionRequestedAt() != null) return "Account is disabled or deletion was requested.";
        if (!p.isEmailOptIn() && !p.isWhatsappOptIn()) return "The student has not opted in to email or WhatsApp messages.";
        if (!p.isActivityConsent()) return "The student has not consented to activity-based suggestions.";
        if (drafts.existsByUserIdAndStatus(u.getId(), DraftStatus.DRAFT) || drafts.existsByUserIdAndStatus(u.getId(), DraftStatus.APPROVED))
            return "A draft for this student is already waiting.";
        Integer recent = jdbc.queryForObject("SELECT COUNT(*) FROM message_history WHERE user_id = ? AND kind = 'ENGAGEMENT' AND status <> 'FAILED' "
                + "AND created_at > UTC_TIMESTAMP() - INTERVAL 7 DAY", Integer.class, u.getId());
        if (recent != null && recent >= settings.getInt("engagement.maxMessagesPerWeek")) return "Weekly message limit reached for this student.";
        return null;
    }

    private MessageDraft createDraftFor(User u) {
        CommunicationPreference p = consent.prefs(u.getId());
        if (ineligibility(u, p) != null) return null;
        String[] trigger = trigger(u.getId());   // {reason, category or null, enquiry-project or null}
        if (trigger == null) return null;
        Integer repeated = jdbc.queryForObject("SELECT COUNT(*) FROM message_drafts WHERE user_id = ? AND trigger_reason = ? "
                + "AND created_at > UTC_TIMESTAMP() - INTERVAL 30 DAY", Integer.class, u.getId(), trigger[0]);
        if (repeated != null && repeated > 0) return null;    // do not repeat the same nudge

        Channel channel = p.getPreferredChannel() == Channel.WHATSAPP && p.isWhatsappOptIn() ? Channel.WHATSAPP
                : p.isEmailOptIn() ? Channel.EMAIL : Channel.WHATSAPP;
        List<Recommendation> recs = recommend(u.getId());
        List<Map<String, String>> suggestions = recs.stream().limit(3)
                .map(r -> Map.of("title", r.project().title(), "url", messaging.publicUrl() + "/projects/" + r.project().slug())).toList();
        String first = u.getFullName().trim().split("\\s+")[0];

        MessageDraft d = new MessageDraft();
        d.setUserId(u.getId());
        d.setChannel(channel);
        d.setTriggerReason(trigger[0]);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("student_first_name", first);
        payload.put("channel", channel.name());
        payload.put("observed_behaviour", trigger[0]);
        payload.put("suggested_projects", suggestions);
        payload.put("site_name", messaging.siteName());
        Optional<Map<String, Object>> aiDraft = ai.draftMessage(payload);
        if (aiDraft.isPresent() && aiDraft.get().get("result") instanceof Map<?, ?> r && r.get("body") instanceof String body && !body.isBlank()) {
            d.setSubject(r.get("subject") instanceof String s ? s : "Projects you might find useful");
            d.setBody(body.trim());
            d.setGeneratedBy("AI");
        } else {
            d.setSubject(trigger[1] != null ? trigger[1] + " projects you might find useful" : "Still thinking about your project?");
            d.setBody(template(first, trigger, suggestions, channel));
            d.setGeneratedBy("TEMPLATE");
        }
        boolean auto = settings.getBool("engagement.autoSend");
        d.setStatus(auto ? DraftStatus.APPROVED : DraftStatus.DRAFT);
        d.setStatusNote(auto ? "Auto-approved by the automatic sending setting." : null);
        return drafts.save(d);
    }

    /** Picks the single most relevant observed behaviour, or null when nothing qualifies. */
    private String[] trigger(Long uid) {
        List<Map<String, Object>> abandoned = jdbc.queryForList("SELECT p.title, s.created_at AS at FROM activity_events s LEFT JOIN projects p ON p.id = s.project_id "
                + "WHERE s.user_id = ? AND s.event_type = 'ENQUIRY_START' AND s.created_at BETWEEN UTC_TIMESTAMP() - INTERVAL 7 DAY AND UTC_TIMESTAMP() - INTERVAL 1 DAY "
                + "AND NOT EXISTS (SELECT 1 FROM activity_events x WHERE x.user_id = s.user_id AND x.event_type = 'ENQUIRY_SUBMIT' AND x.created_at >= s.created_at) "
                + "AND NOT EXISTS (SELECT 1 FROM enquiries q WHERE q.user_id = s.user_id AND q.created_at >= s.created_at) ORDER BY s.created_at DESC LIMIT 1", uid);
        if (!abandoned.isEmpty()) {
            String title = (String) abandoned.get(0).get("title");
            return new String[]{"Started an enquiry" + (title == null ? "" : " about \"" + title + "\"") + " in the last 7 days but did not submit it", null, title};
        }
        List<Map<String, Object>> saved = jdbc.queryForList("SELECT c.name, COUNT(*) AS n FROM saved_projects s JOIN projects p ON p.id = s.project_id "
                + "JOIN categories c ON c.id = p.category_id WHERE s.user_id = ? AND s.created_at > UTC_TIMESTAMP() - INTERVAL 30 DAY "
                + "GROUP BY c.id, c.name HAVING COUNT(*) >= 2 ORDER BY n DESC LIMIT 1", uid);
        if (!saved.isEmpty())
            return new String[]{"Saved " + saved.get(0).get("n") + " " + saved.get(0).get("name") + " projects in the last 30 days", (String) saved.get(0).get("name"), null};
        List<Map<String, Object>> viewed = jdbc.queryForList("SELECT c.name, COUNT(*) AS n FROM activity_events e JOIN projects p ON p.id = e.project_id "
                + "JOIN categories c ON c.id = p.category_id WHERE e.user_id = ? AND e.event_type = 'PROJECT_VIEW' AND e.created_at > UTC_TIMESTAMP() - INTERVAL 14 DAY "
                + "GROUP BY c.id, c.name HAVING COUNT(*) >= 3 ORDER BY n DESC LIMIT 1", uid);
        if (!viewed.isEmpty())
            return new String[]{"Viewed " + viewed.get(0).get("n") + " " + viewed.get(0).get("name") + " project pages in the last 14 days", (String) viewed.get(0).get("name"), null};
        return null;
    }

    private String template(String first, String[] trigger, List<Map<String, String>> suggestions, Channel channel) {
        StringBuilder sb = new StringBuilder("Hi ").append(first).append(",\n\n");
        if (trigger[1] == null) {
            sb.append("You started an enquiry").append(trigger[2] == null ? "" : " about \"" + trigger[2] + "\"").append(" on ").append(messaging.siteName())
              .append(" but did not send it. If you still have questions, just reply to this message and we will help. If you have changed your mind, no action is needed.");
        } else {
            sb.append("You have been exploring ").append(trigger[1]).append(" projects on ").append(messaging.siteName()).append(".");
            if (!suggestions.isEmpty()) {
                sb.append(" A few related ones from our catalogue:\n");
                suggestions.forEach(s -> sb.append("\n- ").append(s.get("title")).append(": ").append(s.get("url")));
                sb.append("\n");
            }
            sb.append("\nIf you would like help understanding, customising or building a project like these, reply to this message. There is no obligation.");
        }
        sb.append("\n\n").append(messaging.siteName()).append(" team");
        return channel == Channel.WHATSAPP ? sb.toString().replace("\n\n", "\n") : sb.toString();
    }

    // ---------- analytics (facts only; counts straight from the database) ----------

    public Map<String, Object> analytics(int days) {
        days = Math.max(1, Math.min(days, 365));
        String since = " created_at > UTC_TIMESTAMP() - INTERVAL " + days + " DAY ";
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("days", days);
        m.put("topCategories", jdbc.queryForList("SELECT c.name, COUNT(*) AS views FROM activity_events e LEFT JOIN projects p ON p.id = e.project_id "
                + "JOIN categories c ON c.id = COALESCE(e.category_id, p.category_id) WHERE e.event_type IN ('PROJECT_VIEW','CATEGORY_VIEW') AND e." + since.trim()
                + " GROUP BY c.id, c.name ORDER BY views DESC LIMIT 10"));
        m.put("topProjects", jdbc.queryForList("SELECT p.id, p.title, p.slug, COUNT(*) AS views FROM activity_events e JOIN projects p ON p.id = e.project_id "
                + "WHERE e.event_type = 'PROJECT_VIEW' AND e." + since.trim() + " GROUP BY p.id, p.title, p.slug ORDER BY views DESC LIMIT 10"));
        m.put("topTechnologies", jdbc.queryForList("SELECT t.name, COUNT(*) AS views FROM activity_events e JOIN project_technologies pt ON pt.project_id = e.project_id "
                + "JOIN technologies t ON t.id = pt.technology_id WHERE e.event_type = 'PROJECT_VIEW' AND e." + since.trim() + " GROUP BY t.id, t.name ORDER BY views DESC LIMIT 10"));
        m.put("searchTerms", jdbc.queryForList("SELECT LOWER(search_query) AS term, COUNT(*) AS searches FROM activity_events WHERE event_type = 'SEARCH' "
                + "AND search_query IS NOT NULL AND" + since + "GROUP BY LOWER(search_query) ORDER BY searches DESC LIMIT 15"));
        m.put("mostSaved", jdbc.queryForList("SELECT p.id, p.title, COUNT(*) AS saves FROM saved_projects s JOIN projects p ON p.id = s.project_id GROUP BY p.id, p.title ORDER BY saves DESC LIMIT 10"));
        m.put("eventCounts", jdbc.queryForList("SELECT event_type AS type, COUNT(*) AS total FROM activity_events WHERE" + since + "GROUP BY event_type ORDER BY total DESC"));
        m.put("dailyViews", jdbc.queryForList("SELECT DATE(created_at) AS day, COUNT(*) AS views FROM activity_events WHERE event_type = 'PROJECT_VIEW' AND" + since + "GROUP BY DATE(created_at) ORDER BY day"));
        m.put("enquiriesByStatus", jdbc.queryForList("SELECT status, COUNT(*) AS total FROM enquiries GROUP BY status"));
        Map<String, Object> funnel = jdbc.queryForMap("SELECT SUM(event_type = 'PROJECT_VIEW') AS projectViews, SUM(event_type = 'ENQUIRY_START') AS enquiryStarts "
                + "FROM activity_events WHERE" + since);
        funnel.put("enquiriesSubmitted", jdbc.queryForObject("SELECT COUNT(*) FROM enquiries WHERE" + since, Long.class));
        m.put("funnel", funnel);
        m.put("messages", jdbc.queryForList("SELECT channel, kind, status, COUNT(*) AS total FROM message_history WHERE" + since + "GROUP BY channel, kind, status"));
        m.put("recentEvents", jdbc.queryForList("SELECT e.event_type AS type, e.created_at AS createdAt, p.title AS project, e.search_query AS query, "
                + "u.email AS student FROM activity_events e LEFT JOIN projects p ON p.id = e.project_id LEFT JOIN users u ON u.id = e.user_id ORDER BY e.id DESC LIMIT 40"));
        return m;
    }

    private static long num(Object o) {
        return o instanceof Number n ? n.longValue() : 0;
    }

    static Instant utc(Object o) {
        return o instanceof LocalDateTime t ? t.toInstant(ZoneOffset.UTC) : null;
    }
}
