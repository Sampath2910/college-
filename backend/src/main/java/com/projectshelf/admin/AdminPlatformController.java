package com.projectshelf.admin;

import com.projectshelf.common.AuditService;
import com.projectshelf.common.Text;
import com.projectshelf.discovery.AiClient;
import com.projectshelf.discovery.SourceAdapter;
import com.projectshelf.engagement.MessagingService;
import com.projectshelf.integration.Integration;
import com.projectshelf.integration.IntegrationService;
import com.projectshelf.integration.WhatsAppClient;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** Dashboard overview, integration status/testing and the audit log. Secret values are never returned, only whether each is set. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminPlatformController {
    private final JdbcTemplate jdbc;
    private final IntegrationService integrations;
    private final IntegrationService.IntegrationRepo integrationRepo;
    private final List<SourceAdapter> adapters;
    private final AiClient ai;
    private final MessagingService messaging;
    private final WhatsAppClient whatsapp;
    private final AuditService audit;
    private final Environment env;

    /** code -> {purpose, docs, credentialsUrl, variables: [[ENV_NAME, spring property, required]], steps} */
    private record Spec(String purpose, String docs, String credentialsUrl, List<String[]> variables, List<String> steps) {}

    private static final Map<String, Spec> SPECS = new LinkedHashMap<>();
    static {
        SPECS.put("GITHUB", new Spec("Discovers public repositories through the GitHub REST API.", "https://docs.github.com/en/rest",
                "https://github.com/settings/personal-access-tokens",
                List.<String[]>of(new String[]{"GITHUB_TOKEN", "app.github.token", "recommended"}),
                List.of("Open the token page and choose Generate new token (fine-grained).",
                        "Repository access: Public repositories (read-only). Do not add any account or repository permissions.",
                        "Copy the token into GITHUB_TOKEN in the backend .env file and restart the backend.",
                        "Without a token discovery still works, but GitHub only allows 60 core requests per hour and 10 searches per minute.")));
        SPECS.put("KAGGLE", new Spec("Discovers public datasets, notebooks, models and competitions through the Kaggle API.", "https://www.kaggle.com/docs/api",
                "https://www.kaggle.com/settings/api",
                List.of(new String[]{"KAGGLE_API_TOKEN", "app.kaggle.api-token", "recommended"}, new String[]{"KAGGLE_USERNAME", "app.kaggle.username", "legacy alternative"},
                        new String[]{"KAGGLE_KEY", "app.kaggle.key", "legacy alternative"}),
                List.of("Sign in to Kaggle and open Settings > API.", "Choose Generate New Token and copy it into KAGGLE_API_TOKEN, then restart the backend.",
                        "Alternatively use Create Legacy API Key and copy username and key from kaggle.json into KAGGLE_USERNAME and KAGGLE_KEY.",
                        "Without credentials only datasets and models can be listed; notebooks and competitions require a token.")));
        SPECS.put("AI", new Spec("Writes project summaries from README evidence and prepares message drafts. Runs in the separate AI service.",
                "https://platform.claude.com/docs", "https://platform.claude.com/settings/keys",
                List.of(new String[]{"ANTHROPIC_API_KEY", null, "required (set on the AI service)"}, new String[]{"AI_SERVICE_TOKEN", "app.ai.service-token", "required (same value on backend and AI service)"},
                        new String[]{"AI_SERVICE_URL", "app.ai.service-url", "required"}),
                List.of("Create an API key in the Claude Console (billing must be enabled on the account).", "Put it in ANTHROPIC_API_KEY in the AI service .env file. The backend never sees this key.",
                        "Set the same random AI_SERVICE_TOKEN in both .env files so only the backend can call the AI service.",
                        "Until this is configured the catalogue uses rule-based classification and template message drafts.")));
        SPECS.put("EMAIL", new Spec("Sends enquiry acknowledgements, admin notifications and approved messages through Resend.", "https://resend.com/docs",
                "https://resend.com/api-keys",
                List.of(new String[]{"RESEND_API_KEY", "app.email.resend-api-key", "required"}, new String[]{"EMAIL_FROM", "app.email.from", "required (address on a verified domain)"},
                        new String[]{"EMAIL_FROM_NAME", "app.email.from-name", "optional"}, new String[]{"EMAIL_REPLY_TO", "app.email.reply-to", "optional"},
                        new String[]{"ADMIN_NOTIFY_EMAIL", "app.email.admin-notify", "required for notifications and the connection test"}),
                List.of("Create a Resend account and verify your sending domain under Domains (add the DNS records shown).",
                        "Create an API key with Sending access only.", "Set RESEND_API_KEY, EMAIL_FROM and ADMIN_NOTIFY_EMAIL, then restart the backend.",
                        "Test connection sends one real email to ADMIN_NOTIFY_EMAIL.")));
        SPECS.put("WHATSAPP", new Spec("Sends approved messages through the WhatsApp Business Platform (Cloud API). Click-to-chat links on the website work without it.",
                "https://developers.facebook.com/docs/whatsapp/", "https://developers.facebook.com/apps/",
                List.of(new String[]{"WHATSAPP_ACCESS_TOKEN", "app.whatsapp.access-token", "required"}, new String[]{"WHATSAPP_PHONE_NUMBER_ID", "app.whatsapp.phone-number-id", "required"},
                        new String[]{"WHATSAPP_TEMPLATE_NAME", "app.whatsapp.template-name", "required to send"}, new String[]{"WHATSAPP_TEMPLATE_LANG", "app.whatsapp.template-lang", "optional"}),
                List.of("Create a Meta developer app with the WhatsApp product and a WhatsApp Business Account (business verification may be required).",
                        "Register a business phone number and note its Phone number ID.", "Create a permanent System User access token with whatsapp_business_messaging permission.",
                        "Create and get approval for a message template with exactly one body variable, e.g. \"{{1}}\", and set its name in WHATSAPP_TEMPLATE_NAME.",
                        "Messages are only sent to students who opted in to WhatsApp.")));
    }

    @GetMapping("/integrations")
    public List<Map<String, Object>> integrations() {
        List<Map<String, Object>> out = new ArrayList<>();
        Map<String, Object> aiHealth = ai.health(true);
        for (Integration i : integrationRepo.findAll()) {
            Spec spec = SPECS.get(i.getCode());
            if (spec == null) continue;
            List<Map<String, Object>> vars = new ArrayList<>();
            for (String[] v : spec.variables()) {
                Map<String, Object> var = new LinkedHashMap<>();
                var.put("name", v[0]);
                var.put("note", v[2]);
                // ANTHROPIC_API_KEY lives only in the AI service, so its presence is reported by that service's health check
                var.put("set", v[1] == null ? Boolean.TRUE.equals(aiHealth.get("configured")) : !Text.blank(env.getProperty(v[1])));
                vars.add(var);
            }
            boolean configured = switch (i.getCode()) {
                case "GITHUB", "KAGGLE" -> adapters.stream().anyMatch(a -> a.code().equals(i.getCode()) && a.credentialsConfigured());
                case "AI" -> Boolean.TRUE.equals(aiHealth.get("configured"));
                case "EMAIL" -> !Text.blank(env.getProperty("app.email.resend-api-key")) && !Text.blank(env.getProperty("app.email.from"));
                default -> whatsapp.templateConfigured();
            };
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("code", i.getCode());
            m.put("name", i.getName());
            m.put("enabled", i.isEnabled());
            m.put("configured", configured);
            m.put("worksWithoutCredentials", i.getCode().equals("GITHUB") || i.getCode().equals("KAGGLE"));
            m.put("purpose", spec.purpose());
            m.put("docsUrl", spec.docs());
            m.put("credentialsUrl", spec.credentialsUrl());
            m.put("variables", vars);
            m.put("steps", spec.steps());
            m.put("lastSuccessAt", i.getLastSuccessAt());
            m.put("lastFailureAt", i.getLastFailureAt());
            m.put("lastFailureMessage", i.getLastFailureMessage());
            m.put("lastSyncAt", i.getLastSyncAt());
            if (i.getCode().equals("AI")) m.put("detail", aiHealth.isEmpty() ? "AI service is not reachable at AI_SERVICE_URL." : "Provider: " + aiHealth.get("provider") + ", model: " + aiHealth.get("model"));
            out.add(m);
        }
        return out;
    }

    /** Makes a real request to the provider and records the outcome. Never reports success without one. */
    @PostMapping("/integrations/{code}/test")
    public Map<String, Object> test(@PathVariable String code) {
        if (!SPECS.containsKey(code)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown integration.");
        try {
            String result = switch (code) {
                case "GITHUB", "KAGGLE" -> adapters.stream().filter(a -> a.code().equals(code)).findFirst().orElseThrow().testConnection();
                case "AI" -> {
                    if (!Boolean.TRUE.equals(ai.health(true).get("configured"))) throw new IllegalStateException(ai.health(false).isEmpty()
                            ? "The AI service is not reachable. Start it and check AI_SERVICE_URL." : "The AI service is running but ANTHROPIC_API_KEY is not set.");
                    Map<String, Object> r = ai.ping();
                    yield "The provider answered a test prompt using model " + r.get("model") + ".";
                }
                case "EMAIL" -> messaging.testEmail();
                default -> whatsapp.test();
            };
            integrations.success(code);
            audit.log("INTEGRATION_TEST", "integration", code, "ok");
            return Map.of("ok", true, "message", result);
        } catch (Exception e) {
            String msg = Text.truncate(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage(), 500);
            integrations.failure(code, msg);
            audit.log("INTEGRATION_TEST", "integration", code, "failed: " + msg);
            return Map.of("ok", false, "message", msg);
        }
    }

    public record EnableRequest(boolean enabled) {}

    @PutMapping("/integrations/{code}")
    public void setEnabled(@PathVariable String code, @RequestBody EnableRequest b) {
        Integration i = integrationRepo.findByCode(code).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown integration."));
        i.setEnabled(b.enabled());
        integrationRepo.save(i);
        audit.log(b.enabled() ? "INTEGRATION_ENABLED" : "INTEGRATION_DISABLED", "integration", code, null);
    }

    @GetMapping("/overview")
    public Map<String, Object> overview() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("projects", jdbc.queryForMap("SELECT COUNT(*) AS total, COALESCE(SUM(status = 'PUBLISHED'), 0) AS published, COALESCE(SUM(status = 'PENDING_REVIEW'), 0) AS pendingReview, "
                + "COALESCE(SUM(status = 'APPROVED'), 0) AS approved, COALESCE(SUM(status = 'REJECTED'), 0) AS rejected, "
                + "COALESCE(SUM(status = 'NEEDS_REVALIDATION'), 0) AS needsRevalidation FROM projects"));
        m.put("discoveryFailures", jdbc.queryForObject("SELECT COUNT(*) FROM discovery_jobs WHERE status = 'FAILED' AND started_at > UTC_TIMESTAMP() - INTERVAL 7 DAY", Long.class));
        m.put("enquiries", jdbc.queryForMap("SELECT COUNT(*) AS total, COALESCE(SUM(status = 'NEW'), 0) AS fresh, "
                + "COALESCE(SUM(follow_up_date IS NOT NULL AND follow_up_date <= CURRENT_DATE AND status NOT IN ('COMPLETED','CLOSED','REJECTED')), 0) AS followUpsDue FROM enquiries"));
        m.put("students", jdbc.queryForMap("SELECT COUNT(*) AS total, COALESCE(SUM(u.last_login_at > UTC_TIMESTAMP() - INTERVAL 30 DAY), 0) AS active30d "
                + "FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id AND r.name = 'STUDENT'"));
        m.put("draftsAwaitingReview", jdbc.queryForObject("SELECT COUNT(*) FROM message_drafts WHERE status = 'DRAFT'", Long.class));
        m.put("pendingDuplicates", jdbc.queryForObject("SELECT COUNT(*) FROM duplicate_candidates WHERE status = 'PENDING'", Long.class));
        m.put("popularCategories", jdbc.queryForList("SELECT c.name, COUNT(*) AS views FROM activity_events e JOIN projects p ON p.id = e.project_id JOIN categories c ON c.id = p.category_id "
                + "WHERE e.event_type = 'PROJECT_VIEW' AND e.created_at > UTC_TIMESTAMP() - INTERVAL 30 DAY GROUP BY c.id, c.name ORDER BY views DESC LIMIT 6"));
        m.put("mostViewedProjects", jdbc.queryForList("SELECT id, title, view_count AS views FROM projects WHERE view_count > 0 ORDER BY view_count DESC LIMIT 6"));
        m.put("aiUsage", jdbc.queryForMap("SELECT COUNT(*) AS calls30d, COALESCE(SUM(input_tokens), 0) AS inputTokens, COALESCE(SUM(output_tokens), 0) AS outputTokens, "
                + "SUM(estimated_cost_usd) AS estimatedCostUsd, COALESCE(SUM(created_at >= UTC_DATE()), 0) AS callsToday FROM ai_usage WHERE created_at > UTC_TIMESTAMP() - INTERVAL 30 DAY"));
        m.put("integrations", integrations().stream().map(i -> Map.of("code", i.get("code"), "name", i.get("name"), "enabled", i.get("enabled"), "configured", i.get("configured"))).toList());
        m.put("recentJobs", jdbc.queryForList("SELECT id, job_type AS jobType, status, started_at AS startedAt, records_processed AS processed FROM discovery_jobs ORDER BY id DESC LIMIT 5"));
        m.put("recentActivity", audit.recent(12));
        return m;
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> auditLog(@RequestParam(defaultValue = "100") int limit) {
        return audit.recent(limit);
    }
}
