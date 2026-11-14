package com.projectshelf.enquiry;

import com.projectshelf.catalogue.Project;
import com.projectshelf.catalogue.Repos.ProjectRepo;
import com.projectshelf.common.Types.Channel;
import com.projectshelf.common.Types.EnquiryStatus;
import com.projectshelf.common.Types.ProjectStatus;
import com.projectshelf.common.Types.ServiceType;
import com.projectshelf.engagement.ConsentService;
import com.projectshelf.engagement.MessagingService;
import com.projectshelf.enquiry.EnquiryRepos.EnquiryRepo;
import com.projectshelf.enquiry.EnquiryRepos.QuotationRepo;
import com.projectshelf.user.AuthUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class EnquiryController {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no look-alike characters
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final EnumSet<EnquiryStatus> QUOTE_VISIBLE = EnumSet.of(EnquiryStatus.QUOTATION_SENT, EnquiryStatus.ACCEPTED,
            EnquiryStatus.REJECTED, EnquiryStatus.IN_PROGRESS, EnquiryStatus.COMPLETED, EnquiryStatus.CLOSED);

    private final EnquiryRepo enquiries;
    private final QuotationRepo quotations;
    private final ProjectRepo projects;
    private final ConsentService consent;
    private final MessagingService messaging;

    public record EnquiryRequest(
            @NotBlank @Size(min = 2, max = 120) String name,
            @NotBlank @Email @Size(max = 190) String email,
            @Pattern(regexp = "^$|^\\+?[0-9 ()-]{7,20}$", message = "Enter a valid phone number") String phone,
            @Size(max = 160) String college,
            Long projectId,
            @NotNull(message = "Choose a service") ServiceType serviceType,
            @Size(max = 160) String preferredTechnology,
            @NotBlank @Size(min = 20, max = 4000, message = "Please describe your requirements in 20 to 4000 characters") String requirements,
            @Size(max = 2000) String notes,
            @NotNull(message = "Choose how we should contact you") Channel preferredChannel,
            @AssertTrue(message = "We need your permission to contact you about this enquiry") boolean contactConsent,
            String website /* honeypot: real visitors never see or fill this */) {}

    @PostMapping("/api/public/enquiries")
    @Transactional
    public Map<String, Object> submit(@Valid @RequestBody EnquiryRequest b, @AuthenticationPrincipal AuthUser me) {
        if (b.website() != null && !b.website().isBlank()) return Map.of("reference", reference());   // bot: accept silently, store nothing
        if (b.preferredChannel() == Channel.WHATSAPP && (b.phone() == null || b.phone().isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a WhatsApp number so we can reach you there.");
        Project project = null;
        if (b.projectId() != null) {
            project = projects.findById(b.projectId()).filter(p -> p.getStatus() == ProjectStatus.PUBLISHED)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "The selected project is no longer available."));
        }
        Enquiry e = new Enquiry();
        String ref = reference();
        while (enquiries.existsByReference(ref)) ref = reference();
        e.setReference(ref);
        e.setUserId(me != null && !me.isAdmin() ? me.id() : null);
        e.setName(b.name().trim());
        e.setEmail(b.email().trim().toLowerCase());
        e.setPhone(b.phone() == null || b.phone().isBlank() ? null : b.phone().trim());
        e.setCollege(b.college());
        e.setProjectId(project == null ? null : project.getId());
        e.setServiceType(b.serviceType());
        e.setPreferredTechnology(b.preferredTechnology());
        e.setRequirements(b.requirements().trim());
        e.setNotes(b.notes());
        e.setPreferredChannel(b.preferredChannel());
        e = enquiries.save(e);
        consent.record(e.getUserId(), e.getId(), e.getEmail(), ConsentService.ENQUIRY_CONTACT, true, "ENQUIRY_FORM");

        String title = project == null ? "General enquiry" : project.getTitle();
        boolean acknowledged = messaging.sendEnquiryEmail("ENQUIRY_ACK", e.getId(), e.getUserId(), e.getEmail(),
                "We received your enquiry " + ref,
                "Hi " + e.getName().split("\\s+")[0] + ",\n\nThank you for your enquiry (" + ref + ") about: " + title + ".\n\n"
                        + "We will review your requirements and get back to you by " + (e.getPreferredChannel() == Channel.WHATSAPP ? "WhatsApp" : "email")
                        + ". Nothing is confirmed or charged until you have agreed a quotation with us.\n\n" + messaging.siteName() + " team");
        messaging.sendEnquiryEmail("ADMIN_NOTIFY", e.getId(), null, messaging.adminNotifyAddress(), "New enquiry " + ref + ": " + title,
                "New enquiry " + ref + "\n\nFrom: " + e.getName() + " <" + e.getEmail() + ">\nService: " + e.getServiceType() + "\nProject: " + title
                        + "\n\nRequirements:\n" + e.getRequirements() + "\n\nOpen: " + messaging.publicUrl() + "/admin/enquiries/" + e.getId());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("reference", ref);
        out.put("emailAcknowledgementSent", acknowledged);
        return out;
    }

    @GetMapping("/api/student/enquiries")
    public List<Map<String, Object>> mine(@AuthenticationPrincipal AuthUser me) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Enquiry e : enquiries.findByUserIdOrderByIdDesc(me.id())) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("reference", e.getReference());
            m.put("serviceType", e.getServiceType());
            m.put("status", e.getStatus());
            m.put("requirements", e.getRequirements());
            m.put("createdAt", e.getCreatedAt());
            m.put("updatedAt", e.getUpdatedAt());
            Project p = e.getProjectId() == null ? null : projects.findById(e.getProjectId()).orElse(null);
            m.put("projectTitle", p == null ? null : p.getTitle());
            m.put("projectSlug", p == null || p.getStatus() != ProjectStatus.PUBLISHED ? null : p.getSlug());
            if (QUOTE_VISIBLE.contains(e.getStatus()))   // a prepared-but-unsent quotation stays internal
                quotations.findByEnquiryIdOrderByIdDesc(e.getId()).stream().findFirst().ifPresent(q -> m.put("quotation",
                        Map.of("amount", q.getAmount(), "currency", q.getCurrency(), "description", q.getDescription() == null ? "" : q.getDescription(),
                                "validUntil", q.getValidUntil() == null ? "" : q.getValidUntil().toString())));
            out.add(m);
        }
        return out;
    }

    private static String reference() {
        StringBuilder sb = new StringBuilder("PS-").append(LocalDate.now().format(DateTimeFormatter.ofPattern("yyMM"))).append('-');
        for (int i = 0; i < 6; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return sb.toString();
    }
}
