package com.projectshelf.discovery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectshelf.common.SafeHttp;
import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Types.ProjectType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.*;

/** GitHub REST API (https://docs.github.com/en/rest). Public repository metadata only. */
@Component
public class GitHubAdapter implements SourceAdapter {
    private final RestClient http;
    private final String token;
    private final SettingsService settings;
    private final ObjectMapper json;
    private long lastSearchAt;

    public GitHubAdapter(@Value("${app.github.api-url}") String apiUrl, @Value("${app.github.token}") String token,
                         SettingsService settings, ObjectMapper json) {
        this.http = SafeHttp.client(apiUrl);
        this.token = token.trim();
        this.settings = settings;
        this.json = json;
    }

    @Override public String code() { return "GITHUB"; }
    @Override public boolean credentialsConfigured() { return !token.isEmpty(); }
    @Override public boolean supportsRefresh() { return true; }

    /** One GET with auth, retry on transient errors, and explicit rate-limit handling. Returns null for 404. */
    private <T> T get(Class<T> type, String accept, String uri, Object... vars) {
        return SafeHttp.retry(() -> http.get().uri(uri, vars).headers(h -> {
            h.set("Accept", accept);
            h.set("X-GitHub-Api-Version", "2022-11-28");
            h.set("User-Agent", "project-catalogue-discovery");
            if (!token.isEmpty()) h.setBearerAuth(token);
        }).exchange((req, res) -> {
            int s = res.getStatusCode().value();
            if (s == 404 || s == 451) return null;
            if (s == 403 || s == 429) {
                String remaining = res.getHeaders().getFirst("x-ratelimit-remaining");
                String reset = res.getHeaders().getFirst("x-ratelimit-reset");
                if ("0".equals(remaining) || res.getHeaders().getFirst("retry-after") != null)
                    throw new RateLimitedException("GitHub rate limit reached" + (reset == null ? "" : "; resets at " + Instant.ofEpochSecond(Long.parseLong(reset))));
            }
            if (s == 401) throw new IllegalStateException("GitHub rejected the token (HTTP 401). Check GITHUB_TOKEN.");
            if (s >= 500) throw new HttpServerErrorException(res.getStatusCode());
            if (s >= 400) throw new IllegalStateException("GitHub returned HTTP " + s);
            return res.bodyTo(type);
        }));
    }

    @Override
    public List<DiscoveredItem> search(String keyword, int limit) {
        int minStars = settings.getInt("discovery.github.minStars");
        int maxStars = settings.getInt("discovery.github.maxStars");   // 0 = no upper limit; keeps huge frameworks out of a student catalogue
        String q = keyword + (maxStars > 0 ? " stars:" + minStars + ".." + maxStars : " stars:>=" + minStars) + " fork:false archived:false";
        int perPage = Math.min(limit, 100);
        List<DiscoveredItem> out = new ArrayList<>();
        for (int page = 1; out.size() < limit && page <= 10; page++) {
            throttleSearch();
            JsonNode body = get(JsonNode.class, "application/vnd.github+json",
                    "/search/repositories?q={q}&sort=stars&order=desc&per_page={n}&page={p}", q, perPage, page);
            JsonNode items = body == null ? null : body.get("items");
            if (items == null || items.isEmpty()) break;
            for (JsonNode r : items) if (out.size() < limit) out.add(toItem(r));
            if (items.size() < perPage) break;
        }
        return out;
    }

    /** The search endpoint has its own, lower limit: 30 requests/minute with a token, 10/minute without. */
    private synchronized void throttleSearch() {
        long gap = token.isEmpty() ? 6500 : 2200;
        long wait = lastSearchAt + gap - System.currentTimeMillis();
        if (wait > 0) {
            try { Thread.sleep(wait); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }
        lastSearchAt = System.currentTimeMillis();
    }

    @Override
    public Optional<String> readme(DiscoveredItem item) {
        String[] p = item.externalId().split("/", 2);
        return Optional.ofNullable(get(String.class, "application/vnd.github.raw+json", "/repos/{o}/{r}/readme", p[0], p[1]));
    }

    @Override
    public Optional<DiscoveredItem> fetch(String kind, String externalId) {
        String[] p = externalId.split("/", 2);
        JsonNode r = get(JsonNode.class, "application/vnd.github+json", "/repos/{o}/{r}", p[0], p[1]);
        return r == null ? Optional.empty() : Optional.of(toItem(r));
    }

    @Override
    public String testConnection() {
        JsonNode r = get(JsonNode.class, "application/vnd.github+json", "/rate_limit").get("resources");
        return (token.isEmpty() ? "Reachable without a token (low limits)" : "Token accepted")
                + ". Core: " + r.at("/core/remaining").asInt() + "/" + r.at("/core/limit").asInt() + " per hour"
                + ", search: " + r.at("/search/remaining").asInt() + "/" + r.at("/search/limit").asInt() + " per minute.";
    }

    private DiscoveredItem toItem(JsonNode r) {
        List<String> topics = new ArrayList<>();
        r.path("topics").forEach(t -> topics.add(t.asText()));
        String spdx = text(r.at("/license/spdx_id"));
        if ("NOASSERTION".equals(spdx)) spdx = null;   // GitHub could not identify the licence: keep it unknown
        // keep only the fields we use; this is what is stored as the original source record
        Map<String, Object> raw = new LinkedHashMap<>();
        for (String f : List.of("id", "full_name", "name", "description", "html_url", "homepage", "language", "stargazers_count",
                "forks_count", "open_issues_count", "created_at", "updated_at", "pushed_at", "archived", "default_branch", "has_wiki", "has_pages", "size"))
            if (r.hasNonNull(f)) raw.put(f, json.convertValue(r.get(f), Object.class));
        raw.put("topics", topics);
        raw.put("owner", text(r.at("/owner/login")));
        raw.put("license", json.convertValue(r.path("license"), Object.class));
        return new DiscoveredItem("repository", text(r.get("full_name")), humanise(text(r.get("name"))), text(r.get("description")),
                text(r.at("/owner/login")), text(r.at("/owner/html_url")), text(r.get("html_url")), text(r.get("language")), topics,
                r.path("stargazers_count").isNumber() ? r.get("stargazers_count").asInt() : null,
                r.path("forks_count").isNumber() ? r.get("forks_count").asInt() : null,
                spdx, spdx == null ? null : text(r.at("/license/name")),
                instant(r.get("created_at")), instant(r.get("pushed_at")), text(r.get("homepage")),
                r.path("archived").asBoolean(false), ProjectType.SOFTWARE_PROJECT, raw);
    }

    /** "spring-boot_blog" -> "Spring Boot Blog". The repository name itself is preserved in the source record. */
    static String humanise(String name) {
        if (name == null) return "Untitled";
        StringBuilder sb = new StringBuilder();
        for (String w : name.replaceAll("[-_.]+", " ").trim().split("\\s+"))
            if (!w.isEmpty()) sb.append(sb.isEmpty() ? "" : " ").append(Character.toUpperCase(w.charAt(0))).append(w.substring(1));
        return sb.isEmpty() ? name : sb.toString();
    }

    static String text(JsonNode n) {
        return n == null || n.isNull() || n.isMissingNode() || n.asText().isBlank() ? null : n.asText().trim();
    }

    static Instant instant(JsonNode n) {
        try {
            return text(n) == null ? null : Instant.parse(text(n));
        } catch (Exception e) {
            return null;
        }
    }
}
