package com.projectshelf.admin;

import com.projectshelf.common.AuditService;
import com.projectshelf.common.Text;
import com.projectshelf.common.Types.EnquiryStatus;
import com.projectshelf.engagement.MessagingService;
import com.projectshelf.enquiry.Enquiry;
import com.projectshelf.enquiry.EnquiryNote;
import com.projectshelf.enquiry.EnquiryRepos.EnquiryNoteRepo;
import com.projectshelf.enquiry.EnquiryRepos.EnquiryRepo;
import com.projectshelf.enquiry.EnquiryRepos.QuotationRepo;
import com.projectshelf.enquiry.Quotation;
import com.projectshelf.user.AuthUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/enquiries")
@RequiredArgsConstructor
public class AdminEnquiryController {
    private final NamedParameterJdbcTemplate jdbc;
    private final EnquiryRepo enquiries;
    private final EnquiryNoteRepo notes;
    private final QuotationRepo quotations;
    private final MessagingService messaging;
    private final AuditService audit;

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String q, @RequestParam(required = false) String status,
                                    @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        size = Math.max(1, Math.min(size, 100));
        MapSqlParameterSource p = new MapSqlParameterSource();
        StringBuilder where = new StringBuilder(" FROM enquiries e LEFT JOIN projects pr ON pr.id = e.project_id WHERE 1 = 1");
        if (!Text.blank(q)) { where.append(" AND (e.reference LIKE :q OR e.name LIKE :q OR e.email LIKE :q OR pr.title LIKE :q)"); p.addValue("q", "%" + q.trim() + "%"); }
        if (!Text.blank(status)) { where.append(" AND e.status = :status"); p.addValue("status", status); }
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + where, p, Long.class);
        p.addValue("limit", size).addValue("offset", Math.max(0, page) * size);
        return Map.of("total", total == null ? 0 : total, "page", page, "size", size, "items", jdbc.queryForList(
                "SELECT e.id, e.reference, e.name, e.email, e.service_type AS serviceType, e.status, e.preferred_channel AS preferredChannel, "
                        + "e.follow_up_date AS followUpDate, e.created_at AS createdAt, pr.title AS projectTitle" + where + " ORDER BY e.id DESC LIMIT :limit OFFSET :offset", p));
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable long id) {
        Enquiry e = find(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enquiry", e);
        m.put("project", e.getProjectId() == null ? null : jdbc.queryForList("SELECT id, title, slug, status FROM projects WHERE id = :id", Map.of("id", e.getProjectId())).stream().findFirst().orElse(null));
        m.put("notes", jdbc.queryForList("SELECT n.id, n.note, n.created_at AS createdAt, u.email AS author FROM enquiry_notes n LEFT JOIN users u ON u.id = n.author_id "
                + "WHERE n.enquiry_id = :id ORDER BY n.id DESC", Map.of("id", id)));
        m.put("quotations", quotations.findByEnquiryIdOrderByIdDesc(id));
        m.put("messages", jdbc.queryForList("SELECT id, kind, channel, recipient, subject, body, status, error, created_at AS createdAt FROM message_history "
                + "WHERE enquiry_id = :id ORDER BY id DESC", Map.of("id", id)));
        m.put("consent", jdbc.queryForList("SELECT consent_type AS type, granted, wording, wording_version AS version, source, created_at AS createdAt "
                + "FROM consent_records WHERE enquiry_id = :id", Map.of("id", id)));
        m.put("emailReady", messaging.emailReady());
        return m;
    }

    public record UpdateRequest(@NotNull EnquiryStatus status, LocalDate followUpDate) {}

    @PutMapping("/{id}")
    public Enquiry update(@PathVariable long id, @Valid @RequestBody UpdateRequest b) {
        Enquiry e = find(id);
        EnquiryStatus before = e.getStatus();
        e.setStatus(b.status());
        e.setFollowUpDate(b.followUpDate());
        audit.log("ENQUIRY_UPDATED", "enquiry", id, before + " -> " + b.status());
        return enquiries.save(e);
    }

    public record NoteRequest(@NotBlank @Size(max = 4000) String note) {}

    @PostMapping("/{id}/notes")
    public EnquiryNote addNote(@PathVariable long id, @Valid @RequestBody NoteRequest b, @AuthenticationPrincipal AuthUser me) {
        find(id);
        EnquiryNote n = new EnquiryNote();
        n.setEnquiryId(id);
        n.setAuthorId(me.id());
        n.setNote(b.note().trim());
        return notes.save(n);
    }

    public record QuotationRequest(@NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
                                   @NotBlank @Pattern(regexp = "[A-Z]{3}", message = "Use a 3-letter currency code") String currency,
                                   @Size(max = 4000) String description, LocalDate validUntil) {}

    /** Records a quotation decided by the administrator and moves a new/reviewing enquiry to Quotation Prepared. */
    @PostMapping("/{id}/quotations")
    @Transactional
    public Quotation addQuotation(@PathVariable long id, @Valid @RequestBody QuotationRequest b, @AuthenticationPrincipal AuthUser me) {
        Enquiry e = find(id);
        Quotation q = new Quotation();
        q.setEnquiryId(id);
        q.setAmount(b.amount());
        q.setCurrency(b.currency());
        q.setDescription(b.description());
        q.setValidUntil(b.validUntil());
        q.setCreatedBy(me.id());
        if (List.of(EnquiryStatus.NEW, EnquiryStatus.REVIEWING, EnquiryStatus.REQUIREMENTS_CLARIFICATION).contains(e.getStatus())) {
            e.setStatus(EnquiryStatus.QUOTATION_PREPARED);
            enquiries.save(e);
        }
        audit.log("QUOTATION_RECORDED", "enquiry", id, b.currency() + " " + b.amount());
        return quotations.save(q);
    }

    public record EmailRequest(@NotBlank @Size(max = 200) String subject, @NotBlank @Size(max = 8000) String body) {}

    /** Emails the student about their own enquiry. Permitted by the contact consent given on the enquiry form. */
    @PostMapping("/{id}/email")
    public Map<String, Object> email(@PathVariable long id, @Valid @RequestBody EmailRequest b) {
        Enquiry e = find(id);
        if (!messaging.emailReady()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is not configured. Set it up on the Integrations page first.");
        boolean sent = messaging.sendEnquiryEmail("ENQUIRY_REPLY", id, e.getUserId(), e.getEmail(), b.subject(), b.body());
        audit.log("ENQUIRY_EMAIL", "enquiry", id, sent ? "sent" : "failed");
        if (!sent) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The email provider rejected the message. See the communication history for the error.");
        return Map.of("sent", true);
    }

    private Enquiry find(long id) {
        return enquiries.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enquiry not found."));
    }
}
