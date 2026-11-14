package com.projectshelf.discovery;

import com.projectshelf.common.SafeHttp;
import com.projectshelf.common.SettingsService;
import com.projectshelf.integration.IntegrationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.Optional;

/**
 * Client for the internal Python AI service. Every call is optional: when the service is down, unconfigured,
 * disabled or over its daily budget, callers fall back to rule-based behaviour.
 */
@Component
@Slf4j
public class AiClient {
    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {};
    private final RestClient http;
    private final String serviceToken;
    private final SettingsService settings;
    private final IntegrationService integrations;
    private final JdbcTemplate jdbc;
    private volatile long healthCheckedAt;
    private volatile Map<String, Object> health = Map.of();

    public AiClient(@Value("${app.ai.service-url}") String url, @Value("${app.ai.service-token}") String serviceToken,
                    SettingsService settings, IntegrationService integrations, JdbcTemplate jdbc) {
        this.http = SafeHttp.client(url);
        this.serviceToken = serviceToken;
        this.settings = settings;
        this.integrations = integrations;
        this.jdbc = jdbc;
    }

    /** {status, configured, provider, model} from the AI service, cached for a minute. Empty map when unreachable. */
    public Map<String, Object> health(boolean fresh) {
        if (fresh || System.currentTimeMillis() - healthCheckedAt > 60_000) {
            try {
                health = http.get().uri("/health").retrieve().body(MAP);
            } catch (Exception e) {
                health = Map.of();
            }
            healthCheckedAt = System.currentTimeMillis();
        }
        return health == null ? Map.of() : health;
    }

    public int callsToday() {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM ai_usage WHERE created_at >= UTC_DATE()", Integer.class);
        return n == null ? 0 : n;
    }

    public boolean available() {
        return integrations.enabled("AI") && settings.getBool("ai.enabled")
                && Boolean.TRUE.equals(health(false).get("configured")) && callsToday() < settings.getInt("ai.maxCallsPerDay");
    }

    public Optional<Map<String, Object>> analyseProject(Map<String, Object> payload) { return post("/v1/analyze-project", "PROJECT_ANALYSIS", payload); }

    public Optional<Map<String, Object>> draftMessage(Map<String, Object> payload) { return post("/v1/draft-message", "MESSAGE_DRAFT", payload); }

    /** Sends one tiny real request through the provider. Used by "Test connection". */
    public Map<String, Object> ping() {
        Map<String, Object> r = http.post().uri("/v1/ping").header("X-Service-Token", serviceToken).retrieve().body(MAP);
        recordUsage("CONNECTION_TEST", r);
        return r;
    }

    private Optional<Map<String, Object>> post(String path, String purpose, Map<String, Object> payload) {
        if (!available()) return Optional.empty();
        try {
            Map<String, Object> r = http.post().uri(path).header("X-Service-Token", serviceToken).body(payload).retrieve().body(MAP);
            recordUsage(purpose, r);
            integrations.success("AI");
            return Optional.ofNullable(r);
        } catch (Exception e) {
            log.warn("AI call {} failed: {}", path, e.getMessage());
            integrations.failure("AI", e.getMessage());
            return Optional.empty();
        }
    }

    @SuppressWarnings("unchecked")
    private void recordUsage(String purpose, Map<String, Object> r) {
        if (r == null || !(r.get("usage") instanceof Map<?, ?> u)) return;
        int in = ((Number) ((Map<String, Object>) u).getOrDefault("input_tokens", 0)).intValue();
        int out = ((Number) ((Map<String, Object>) u).getOrDefault("output_tokens", 0)).intValue();
        Double pin = settings.getNullableDouble("ai.price.inputPerMTok"), pout = settings.getNullableDouble("ai.price.outputPerMTok");
        BigDecimal cost = pin == null || pout == null ? null
                : BigDecimal.valueOf((in * pin + out * pout) / 1_000_000d).setScale(6, RoundingMode.HALF_UP);
        jdbc.update("INSERT INTO ai_usage (purpose, provider, model, input_tokens, output_tokens, estimated_cost_usd, created_at) VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6))",
                purpose, r.get("provider"), r.get("model"), in, out, cost);
    }
}
