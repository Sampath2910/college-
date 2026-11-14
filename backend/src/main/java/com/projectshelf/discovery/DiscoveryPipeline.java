package com.projectshelf.discovery;

import com.projectshelf.catalogue.*;
import com.projectshelf.catalogue.Repos.*;
import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Text;
import com.projectshelf.common.Types.Difficulty;
import com.projectshelf.common.Types.ProjectStatus;
import com.projectshelf.common.Types.ProjectType;
import com.projectshelf.discovery.DiscoveryRepos.AiAnalysisRepo;
import com.projectshelf.discovery.DiscoveryRepos.ExternalSourceRecordRepo;
import com.projectshelf.discovery.SourceAdapter.DiscoveredItem;
import com.projectshelf.discovery.SourceAdapter.RateLimitedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Turns one discovered source record into a catalogue entry:
 * normalise -> change check -> quality rules -> README -> classify (rules, then AI if available) -> score -> duplicates -> review queue.
 * Idempotent: running it again for the same unchanged record does nothing, so jobs are safe to retry.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DiscoveryPipeline {
    private static final Set<ProjectStatus> HUMAN_REVIEWED = EnumSet.of(ProjectStatus.PUBLISHED, ProjectStatus.APPROVED, ProjectStatus.REJECTED, ProjectStatus.ARCHIVED);

    private final ProjectRepo projects;
    private final SourcePlatformRepo platforms;
    private final LicenceRepo licences;
    private final CategoryRepo categories;
    private final TechnologyRepo technologies;
    private final ExternalSourceRecordRepo records;
    private final AiAnalysisRepo analyses;
    private final Classifier classifier;
    private final AiClient ai;
    private final QualityScorer scorer;
    private final DuplicateDetector duplicates;
    private final SettingsService settings;

    public record Outcome(String outcome, String detail, Long projectId) {}

    @Transactional
    public Outcome ingest(SourceAdapter adapter, DiscoveredItem item) {
        SourcePlatform platform = platforms.findByCode(adapter.code()).orElseThrow();
        if (item.url() == null || item.externalId() == null) return new Outcome("REJECTED", "Source did not provide a URL or identifier", null);
        String hash = Text.sha256(String.join("|", n(item.title()), n(item.description()), String.valueOf(item.updatedAt()),
                n(item.licenceSpdx()), n(item.licenceName()), n(item.homepage()), String.join(",", item.topics()), String.valueOf(item.archived())));
        ExternalSourceRecord rec = records.findBySourcePlatformIdAndResourceKindAndExternalId(platform.getId(), item.kind(), item.externalId()).orElse(null);
        Project existing = rec != null && rec.getProjectId() != null ? projects.findById(rec.getProjectId()).orElse(null) : null;
        if (existing == null) existing = projects.findByCanonicalUrl(canonical(item.url())).orElse(null);

        if (rec != null && hash.equals(rec.getContentHash())) {   // unchanged: refresh cheap counters only, no re-analysis
            if (existing != null) {
                existing.setStars(item.stars());
                existing.setForks(item.forks());
                existing.setLastVerifiedAt(Instant.now());
                existing.setSourceAvailable(true);
            }
            return new Outcome("UNCHANGED", "No source change since the last analysis", existing == null ? null : existing.getId());
        }

        if (rec == null) {
            rec = new ExternalSourceRecord();
            rec.setSourcePlatformId(platform.getId());
            rec.setResourceKind(item.kind());
            rec.setExternalId(item.externalId());
        }
        rec.setRawMetadata(item.raw());
        rec.setContentHash(hash);
        rec.setFetchedAt(Instant.now());

        String reject = rejectReason(item);
        if (reject != null && existing == null) {      // remembered so the same unchanged record is not re-evaluated every run
            records.save(rec);
            return new Outcome("REJECTED", reject, null);
        }

        try {
            rec.setReadme(adapter.readme(item).map(r -> Text.truncate(r, 60_000)).orElse(null));
        } catch (RateLimitedException e) {
            throw e;
        } catch (Exception e) {
            log.warn("README fetch failed for {}: {}", item.externalId(), e.getMessage());
        }

        boolean isNew = existing == null;
        Project p = isNew ? new Project() : existing;
        boolean locked = !isNew && HUMAN_REVIEWED.contains(p.getStatus());
        applySourceFields(p, item, platform, isNew);
        if (isNew) {
            p.setSlug(uniqueSlug(item));
            p.setDiscoveredAt(Instant.now());
            p.setStatus(ProjectStatus.PROCESSING);
            p = projects.save(p);
        }
        rec.setProjectId(p.getId());
        records.save(rec);

        if (!locked) {
            analyse(p, item, rec.getReadme(), hash, platform);
            p.setStatus(ProjectStatus.ANALYSED);
        }
        QualityScore qs = scorer.score(p);
        int dups = duplicates.check(p);
        String suffix = " Score " + qs.getTotal() + (dups > 0 ? "; " + dups + " possible duplicate(s) flagged" : "") + ".";

        if (locked) return new Outcome("UPDATED", "Source changed: metadata refreshed, reviewed text kept." + suffix, p.getId());
        if (reject != null || qs.getTotal().doubleValue() < settings.getDouble("quality.minScore")) {
            p.setStatus(ProjectStatus.REJECTED);
            p.setReviewNote(reject != null ? reject : "Below the minimum quality score (" + qs.getTotal() + ")");
            return new Outcome("REJECTED", p.getReviewNote() + "." + suffix, p.getId());
        }
        p.setStatus(ProjectStatus.PENDING_REVIEW);
        if (settings.getBool("autopublish.enabled") && platform.isAutoPublish() && p.getLicence() != null && p.getCategory() != null
                && qs.getTotal().compareTo(platform.getAutoPublishThreshold()) >= 0 && !duplicates.hasPending(p.getId())) {
            p.setStatus(ProjectStatus.PUBLISHED);
            p.setPublishedAt(Instant.now());
            p.setReviewNote("Auto-published: score " + qs.getTotal() + " >= " + platform.getAutoPublishThreshold());
            return new Outcome("PUBLISHED", p.getReviewNote() + ".", p.getId());
        }
        return new Outcome(isNew ? "CREATED" : "UPDATED", "Queued for review (" + p.getAnalysisStatus() + " analysis)." + suffix, p.getId());
    }

    /** Hard rules applied before any analysis is spent on a record. */
    String rejectReason(DiscoveredItem item) {
        if (item.archived()) return "Archived at the source";
        String title = item.title() == null ? "" : item.title().toLowerCase(Locale.ROOT);
        if (item.kind().equals("repository") && (title.startsWith("awesome") || item.topics().stream().anyMatch(t -> t.equals("awesome") || t.equals("awesome-list"))))
            return "Curated link list, not a project";
        boolean needsDescription = !item.kind().equals("notebook");
        int minLen = settings.getInt("discovery.minDescriptionLength");
        if (needsDescription && (item.description() == null || item.description().length() < minLen)) return "Description missing or shorter than " + minLen + " characters";
        if (item.kind().equals("repository") && item.updatedAt() != null
                && item.updatedAt().isBefore(Instant.now().minus(365L * settings.getInt("discovery.maxAgeYears"), ChronoUnit.DAYS)))
            return "No source update in over " + settings.getInt("discovery.maxAgeYears") + " years";
        if (List.of("dataset", "notebook", "model").contains(item.kind())) {
            int minVotes = settings.getInt("discovery.kaggle.minVotes");
            if (item.stars() == null || item.stars() < minVotes) return "Fewer than " + minVotes + " votes on Kaggle";
        }
        return null;
    }

    private void applySourceFields(Project p, DiscoveredItem item, SourcePlatform platform, boolean isNew) {
        if (isNew) {
            p.setTitle(Text.truncate(item.title(), 200));
            p.setTitleNormalized(Text.truncate(Text.normalizeTitle(item.title()), 200));
            p.setProjectType(item.type());
            p.setSourcePlatform(platform);
            p.setShortDescription(Text.truncate(Text.stripShortcodes(item.description()), 600));
        }
        p.setAuthorName(Text.truncate(item.authorName(), 160));
        p.setAuthorUrl(item.authorUrl());
        p.setSourceUrl(item.url());
        p.setCanonicalUrl(canonical(item.url()));
        p.setLicence(licence(item));
        p.setStars(item.stars());
        p.setForks(item.forks());
        if (item.primaryLanguage() != null) p.setPrimaryLanguage(item.primaryLanguage());
        String home = item.homepage() != null && item.homepage().matches("(?i)^https?://\\S+$") && !canonical(item.homepage()).equals(canonical(item.url()))
                ? Text.truncate(item.homepage(), 500) : null;
        if (!Objects.equals(home, p.getDemoUrl())) {
            p.setDemoUrl(home);
            p.setDemoVerified(false);
        }
        p.setSourceCreatedAt(item.createdAt());
        p.setSourceUpdatedAt(item.updatedAt());
        p.setLastVerifiedAt(Instant.now());
        p.setSourceAvailable(true);
    }

    @SuppressWarnings("unchecked")
    private void analyse(Project p, DiscoveredItem item, String readme, String hash, SourcePlatform platform) {
        Classifier.Result h = classifier.classify(item);
        p.setCategory(h.category());
        p.getTechnologies().clear();
        p.getTechnologies().addAll(h.technologies());
        if (item.primaryLanguage() != null) p.getTechnologies().addAll(classifier.resolve(List.of(item.primaryLanguage())));
        p.setShortDescription(Text.truncate(Text.stripShortcodes(item.description()), 600));
        p.setAnalysisStatus("HEURISTIC");
        saveAnalysis(p, "HEURISTIC", null, null, hash, Map.of(
                "category", h.category() == null ? "" : h.category().getName(),
                "technologies", h.technologies().stream().map(Technology::getName).toList(), "evidence", h.evidence()));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", item.title());
        payload.put("description", n(item.description()));
        payload.put("platform", platform.getName());
        payload.put("resource_kind", item.kind());
        payload.put("primary_language", n(item.primaryLanguage()));
        payload.put("topics", item.topics());
        payload.put("readme", readme == null ? "" : Text.truncate(readme, 12_000));
        payload.put("categories", categories.findAllByOrderBySortOrderAscNameAsc().stream().filter(Category::isEnabled).map(Category::getName).toList());
        payload.put("technologies", technologies.findAll().stream().map(Technology::getName).toList());
        Optional<Map<String, Object>> response = ai.analyseProject(payload);
        if (response.isEmpty() || !(response.get().get("result") instanceof Map<?, ?> raw)) return;
        Map<String, Object> r = (Map<String, Object>) raw;

        if (str(r, "short_description") != null) p.setShortDescription(Text.truncate(str(r, "short_description"), 600));
        p.setOverview(str(r, "overview"));
        p.setProblemStatement(str(r, "problem_statement"));
        p.setObjectives(list(r, "objectives"));
        p.setFeatures(list(r, "features"));
        p.setModules(list(r, "modules"));
        String cat = str(r, "category");
        if (cat != null) categories.findAll().stream().filter(c -> c.isEnabled() && c.getName().equalsIgnoreCase(cat)).findFirst().ifPresent(p::setCategory);
        p.getTechnologies().addAll(classifier.resolve(list(r, "technologies")));
        try {
            if (platform.getCode().equals("GITHUB") && str(r, "project_type") != null) p.setProjectType(ProjectType.valueOf(str(r, "project_type")));
            p.setDifficulty(str(r, "difficulty") == null ? null : Difficulty.valueOf(str(r, "difficulty")));
        } catch (IllegalArgumentException ignored) {
            // an unexpected enum value from the model is treated as unknown
        }
        p.setAnalysisStatus("AI");
        saveAnalysis(p, "AI", (String) response.get().get("provider"), (String) response.get().get("model"), hash, r);
    }

    private void saveAnalysis(Project p, String kind, String provider, String model, String hash, Map<String, Object> result) {
        AiAnalysis a = new AiAnalysis();
        a.setProjectId(p.getId());
        a.setAnalysisKind(kind);
        a.setProvider(provider);
        a.setModel(model);
        a.setInputHash(hash);
        a.setResult(result);
        analyses.save(a);
    }

    private Licence licence(DiscoveredItem item) {
        String name = item.licenceName() != null ? item.licenceName() : item.licenceSpdx();
        if (name == null || name.equalsIgnoreCase("unknown")) return null;
        String key = Text.truncate(item.licenceSpdx() != null ? item.licenceSpdx() : name, 80);
        return licences.findBySpdxId(key).orElseGet(() -> {
            Licence l = new Licence();
            l.setSpdxId(key);
            l.setName(Text.truncate(name, 160));
            if (item.licenceSpdx() != null) l.setUrl("https://spdx.org/licenses/" + item.licenceSpdx() + ".html");
            return licences.save(l);
        });
    }

    private String uniqueSlug(DiscoveredItem item) {
        String base = Text.slugify(item.title());
        if (item.authorName() != null) base = Text.truncate(base, 90) + "-by-" + Text.truncate(Text.slugify(item.authorName()), 40);
        if (base.isBlank()) base = "project";
        String slug = base;
        for (int i = 2; projects.existsBySlug(slug); i++) slug = base + "-" + i;
        return slug;
    }

    static String canonical(String url) {
        return url.trim().toLowerCase(Locale.ROOT).replaceAll("^http://", "https://").replaceAll("[/#?]+$", "");
    }

    private static String n(String s) { return s == null ? "" : s; }

    private static String str(Map<String, Object> m, String k) {
        return m.get(k) instanceof String s && !s.isBlank() ? s.trim() : null;
    }

    private static List<String> list(Map<String, Object> m, String k) {
        List<String> out = new ArrayList<>();
        if (m.get(k) instanceof List<?> l)
            for (Object o : l) if (o instanceof String s && !s.isBlank() && out.size() < 12) out.add(Text.truncate(s.trim(), 240));
        return out;
    }
}
