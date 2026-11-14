package com.projectshelf.discovery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectshelf.common.SafeHttp;
import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Types.ProjectType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;

import java.util.*;

import static com.projectshelf.discovery.GitHubAdapter.instant;
import static com.projectshelf.discovery.GitHubAdapter.text;

/**
 * Kaggle public API. Wire format taken from Kaggle's official client (kagglesdk):
 * POST {api}/v1/{service}/{method} with a JSON body; auth is "Authorization: Bearer KAGGLE_API_TOKEN"
 * or legacy HTTP Basic (username + key). Kaggle resources are NOT all software projects, so each kind maps to its own project type.
 */
@Component
public class KaggleAdapter implements SourceAdapter {
    private final RestClient http;
    private final String apiToken, username, key;
    private final SettingsService settings;
    private final ObjectMapper json;

    public KaggleAdapter(@Value("${app.kaggle.api-url}") String apiUrl, @Value("${app.kaggle.api-token}") String apiToken,
                         @Value("${app.kaggle.username}") String username, @Value("${app.kaggle.key}") String key,
                         SettingsService settings, ObjectMapper json) {
        this.http = SafeHttp.client(apiUrl);
        this.apiToken = apiToken.trim();
        this.username = username.trim();
        this.key = key.trim();
        this.settings = settings;
        this.json = json;
    }

    @Override public String code() { return "KAGGLE"; }
    @Override public boolean credentialsConfigured() { return !apiToken.isEmpty() || (!username.isEmpty() && !key.isEmpty()); }

    private JsonNode call(String service, String method, Map<String, Object> body) {
        return SafeHttp.retry(() -> http.post().uri("/v1/{s}/{m}", service, method).contentType(MediaType.APPLICATION_JSON).headers(h -> {
            h.set("User-Agent", "project-catalogue-discovery");
            if (!apiToken.isEmpty()) h.setBearerAuth(apiToken);
            else if (credentialsConfigured()) h.setBasicAuth(username, key);
        }).body(body).exchange((req, res) -> {
            int s = res.getStatusCode().value();
            if (s == 429) throw new RateLimitedException("Kaggle rate limit reached (HTTP 429)");
            if (s == 401 || s == 403) throw new IllegalStateException("Kaggle rejected the request (HTTP " + s + "). Check the Kaggle credentials.");
            if (s >= 500) throw new HttpServerErrorException(res.getStatusCode());
            if (s >= 400) throw new IllegalStateException("Kaggle returned HTTP " + s + " for " + method);
            return res.bodyTo(JsonNode.class);
        }));
    }

    @Override
    public List<DiscoveredItem> search(String keyword, int limit) {
        List<String> kinds = settings.getList("discovery.kaggle.kinds");
        int each = Math.max(1, Math.min(20, (int) Math.ceil((double) limit / Math.max(1, kinds.size()))));
        List<DiscoveredItem> out = new ArrayList<>();
        boolean auth = credentialsConfigured();   // verified live: notebooks and competitions return 401 without credentials
        Map<String, Object> q = Map.of("search", keyword, "pageSize", each);
        if (kinds.contains("dataset"))
            for (JsonNode d : call("datasets.DatasetApiService", "ListDatasets", q).path("datasets")) add(out, each, dataset(d));
        if (auth && kinds.contains("notebook"))
            for (JsonNode k : call("kernels.KernelsApiService", "ListKernels", q).path("kernels")) add(out, each * 2, notebook(k));
        if (kinds.contains("model"))
            for (JsonNode m : call("models.ModelApiService", "ListModels", q).path("models")) add(out, each * 3, model(m));
        if (auth && kinds.contains("competition"))
            for (JsonNode c : call("competitions.CompetitionApiService", "ListCompetitions", Map.of("search", keyword)).path("competitions"))
                add(out, each * 4, competition(c));
        return out;
    }

    private static void add(List<DiscoveredItem> out, int cap, DiscoveredItem item) {
        if (out.size() < cap && item.externalId() != null && item.title() != null) out.add(item);
    }

    @Override
    public String testConnection() {
        JsonNode r = call("datasets.DatasetApiService", "ListDatasets", Map.of("search", "iris", "pageSize", 1));
        if (!r.path("datasets").isArray()) throw new IllegalStateException("Unexpected response from Kaggle.");
        return credentialsConfigured() ? "Kaggle accepted the configured credentials and returned results."
                : "Kaggle is reachable without credentials: datasets and models only. Notebooks and competitions need KAGGLE_API_TOKEN.";
    }

    private Map<String, Object> raw(JsonNode n) {
        Map<String, Object> m = json.convertValue(n, new com.fasterxml.jackson.core.type.TypeReference<LinkedHashMap<String, Object>>() {});
        m.remove("files");
        m.remove("versions");
        m.remove("instances");
        return m;
    }

    private static List<String> tags(JsonNode n) {
        List<String> t = new ArrayList<>();
        n.path("tags").forEach(x -> { if (text(x.get("name")) != null) t.add(text(x.get("name")).toLowerCase(Locale.ROOT)); });
        return t;
    }

    private static Integer num(JsonNode n) {
        return n != null && n.isNumber() ? n.asInt() : null;
    }

    private DiscoveredItem dataset(JsonNode d) {
        String desc = text(d.get("subtitle")) != null ? text(d.get("subtitle")) : text(d.get("description"));
        String owner = text(d.get("ownerRef"));
        return new DiscoveredItem("dataset", text(d.get("ref")), text(d.get("title")), desc,
                text(d.get("ownerName")) != null ? text(d.get("ownerName")) : text(d.get("creatorName")),
                owner == null ? null : "https://www.kaggle.com/" + owner, text(d.get("url")), null, tags(d),
                num(d.get("voteCount")), null, null, text(d.get("licenseName")), null, instant(d.get("lastUpdated")), null,
                false, ProjectType.DATASET, raw(d));
    }

    private DiscoveredItem notebook(JsonNode k) {
        String ref = text(k.get("ref"));
        boolean competition = k.path("competitionDataSources").isArray() && !k.path("competitionDataSources").isEmpty();
        String lang = text(k.get("language"));
        return new DiscoveredItem("notebook", ref, text(k.get("title")), null, text(k.get("author")), null,
                ref == null ? null : "https://www.kaggle.com/code/" + ref,
                lang == null ? null : Character.toUpperCase(lang.charAt(0)) + lang.substring(1), List.of(),
                num(k.get("totalVotes")), null, null, null, null, instant(k.get("lastRunTime")), null,
                false, competition ? ProjectType.COMPETITION_SOLUTION : ProjectType.ML_NOTEBOOK, raw(k));
    }

    private DiscoveredItem model(JsonNode m) {
        String desc = text(m.get("subtitle")) != null ? text(m.get("subtitle")) : text(m.get("description"));
        String ref = text(m.get("ref"));
        String url = text(m.get("url")) != null ? text(m.get("url")) : ref == null ? null : "https://www.kaggle.com/models/" + ref;
        return new DiscoveredItem("model", ref, text(m.get("title")), desc, text(m.get("author")), null, url, null, tags(m),
                num(m.get("voteCount")), null, null, null, instant(m.get("publishTime")), instant(m.get("updateTime")), null,
                false, ProjectType.MODEL, raw(m));
    }

    private DiscoveredItem competition(JsonNode c) {
        String url = text(c.get("url"));
        String ref = text(c.get("ref"));
        if (ref != null && ref.startsWith("http")) { if (url == null) url = ref; ref = ref.substring(ref.lastIndexOf('/') + 1); }
        if (url == null && ref != null) url = "https://www.kaggle.com/competitions/" + ref;
        return new DiscoveredItem("competition", ref, text(c.get("title")), text(c.get("description")), text(c.get("organizationName")), null,
                url, null, tags(c), null, null, null, text(c.get("licenseName")), instant(c.get("enabledDate")), instant(c.get("deadline")), null,
                false, ProjectType.RESEARCH_REFERENCE, raw(c));
    }
}
