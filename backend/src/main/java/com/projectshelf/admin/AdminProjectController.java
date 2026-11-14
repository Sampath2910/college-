package com.projectshelf.admin;

import com.projectshelf.catalogue.*;
import com.projectshelf.catalogue.Repos.*;
import com.projectshelf.common.AuditService;
import com.projectshelf.common.Text;
import com.projectshelf.common.Types.Difficulty;
import com.projectshelf.common.Types.ProjectStatus;
import com.projectshelf.common.Types.ProjectType;
import com.projectshelf.discovery.*;
import com.projectshelf.discovery.DiscoveryRepos.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

/** Internal catalogue management. Responses here include scores, analysis and review data that public endpoints never return. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminProjectController {
    private final NamedParameterJdbcTemplate jdbc;
    private final ProjectRepo projects;
    private final CategoryRepo categories;
    private final TechnologyRepo technologies;
    private final ProjectAssetRepo assets;
    private final ExternalSourceRecordRepo records;
    private final AiAnalysisRepo analyses;
    private final QualityScoreRepo scores;
    private final DuplicateCandidateRepo duplicates;
    private final QualityScorer scorer;
    private final DiscoveryPipeline pipeline;
    private final List<SourceAdapter> adapters;
    private final AuditService audit;

    @GetMapping("/projects")
    public Map<String, Object> list(@RequestParam(required = false) String q, @RequestParam(required = false) String status,
                                    @RequestParam(required = false) String platform, @RequestParam(required = false) Long categoryId,
                                    @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "25") int size) {
        size = Math.max(1, Math.min(size, 100));
        MapSqlParameterSource p = new MapSqlParameterSource();
        StringBuilder where = new StringBuilder(" FROM projects p JOIN source_platforms sp ON sp.id = p.source_platform_id "
                + "LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN licences l ON l.id = p.licence_id WHERE 1 = 1");
        if (!Text.blank(q)) { where.append(" AND (p.title LIKE :q OR p.author_name LIKE :q OR p.source_url LIKE :q)"); p.addValue("q", "%" + q.trim() + "%"); }
        if (!Text.blank(status)) { where.append(" AND p.status = :status"); p.addValue("status", status); }
        if (!Text.blank(platform)) { where.append(" AND sp.code = :platform"); p.addValue("platform", platform); }
        if (categoryId != null) { where.append(" AND p.category_id = :cat"); p.addValue("cat", categoryId); }
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + where, p, Long.class);
        p.addValue("limit", size).addValue("offset", Math.max(0, page) * size);
        List<Map<String, Object>> items = jdbc.queryForList("SELECT p.id, p.title, p.slug, p.status, p.project_type AS projectType, sp.name AS platform, "
                + "c.name AS category, l.spdx_id AS licence, p.quality_score AS qualityScore, p.analysis_status AS analysisStatus, p.stars, p.featured, "
                + "p.author_name AS authorName, p.discovered_at AS discoveredAt, p.source_updated_at AS sourceUpdatedAt, p.view_count AS viewCount"
                + where + " ORDER BY p.id DESC LIMIT :limit OFFSET :offset", p);
        return Map.of("items", items, "total", total == null ? 0 : total, "page", page, "size", size);
    }

    @GetMapping("/projects/{id}")
    @Transactional(readOnly = true)
    public Map<String, Object> get(@PathVariable long id) {
        Project p = find(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("slug", p.getSlug());
        m.put("title", p.getTitle());
        m.put("shortDescription", p.getShortDescription());
        m.put("overview", p.getOverview());
        m.put("problemStatement", p.getProblemStatement());
        m.put("objectives", p.getObjectives());
        m.put("features", p.getFeatures());
        m.put("modules", p.getModules());
        m.put("categoryId", p.getCategory() == null ? null : p.getCategory().getId());
        m.put("category", p.getCategory() == null ? null : p.getCategory().getName());
        m.put("projectType", p.getProjectType());
        m.put("difficulty", p.getDifficulty());
        m.put("technologyIds", p.getTechnologies().stream().map(Technology::getId).sorted().toList());
        m.put("authorName", p.getAuthorName());
        m.put("authorUrl", p.getAuthorUrl());
        m.put("platform", p.getSourcePlatform().getName());
        m.put("platformCode", p.getSourcePlatform().getCode());
        m.put("sourceUrl", p.getSourceUrl());
        m.put("licence", p.getLicence() == null ? null : Map.of("spdxId", p.getLicence().getSpdxId(), "name", p.getLicence().getName()));
        m.put("stars", p.getStars());
        m.put("forks", p.getForks());
        m.put("primaryLanguage", p.getPrimaryLanguage());
        m.put("demoUrl", p.getDemoUrl());
        m.put("demoVerified", p.isDemoVerified());
        m.put("documentationUrl", p.getDocumentationUrl());
        m.put("sourceAvailable", p.isSourceAvailable());
        m.put("sourceCreatedAt", p.getSourceCreatedAt());
        m.put("sourceUpdatedAt", p.getSourceUpdatedAt());
        m.put("lastVerifiedAt", p.getLastVerifiedAt());
        m.put("discoveredAt", p.getDiscoveredAt());
        m.put("publishedAt", p.getPublishedAt());
        m.put("status", p.getStatus());
        m.put("reviewNote", p.getReviewNote());
        m.put("featured", p.isFeatured());
        m.put("viewCount", p.getViewCount());
        m.put("qualityScore", p.getQualityScore());
        m.put("analysisStatus", p.getAnalysisStatus());
        m.put("scoreBreakdown", scores.findFirstByProjectIdOrderByIdDesc(id).map(QualityScore::getBreakdown).orElse(List.of()));
        m.put("heuristicAnalysis", analyses.findFirstByProjectIdAndAnalysisKindOrderByIdDesc(id, "HEURISTIC").map(AiAnalysis::getResult).orElse(null));
        analyses.findFirstByProjectIdAndAnalysisKindOrderByIdDesc(id, "AI").ifPresent(a ->
                m.put("aiAnalysis", Map.of("provider", String.valueOf(a.getProvider()), "model", String.valueOf(a.getModel()), "createdAt", a.getCreatedAt(), "result", a.getResult())));
        records.findFirstByProjectId(id).ifPresent(r -> {
            Map<String, Object> src = new LinkedHashMap<>();
            src.put("kind", r.getResourceKind());
            src.put("externalId", r.getExternalId());
            src.put("fetchedAt", r.getFetchedAt());
            src.put("rawMetadata", r.getRawMetadata());
            src.put("readmeExcerpt", Text.truncate(r.getReadme(), 6000));
            src.put("readmeLength", r.getReadme() == null ? 0 : r.getReadme().length());
            m.put("source", src);
        });
        m.put("assets", assets.findByProjectIdOrderBySortOrderAsc(id));
        m.put("duplicates", jdbc.queryForList("SELECT d.id, d.similarity, d.status, o.id AS otherId, o.title AS otherTitle, o.status AS otherStatus FROM duplicate_candidates d "
                + "JOIN projects o ON o.id = IF(d.project_id = :id, d.other_project_id, d.project_id) WHERE d.project_id = :id OR d.other_project_id = :id", Map.of("id", id)));
        return m;
    }

    public record ProjectUpdate(@NotBlank @Size(max = 200) String title, @Size(max = 600) String shortDescription, @Size(max = 20000) String overview,
                                @Size(max = 5000) String problemStatement, List<@Size(max = 240) String> objectives, List<@Size(max = 240) String> features,
                                List<@Size(max = 240) String> modules, Long categoryId, ProjectType projectType, Difficulty difficulty, List<Long> technologyIds,
                                @Pattern(regexp = "^$|^https?://\\S+$", message = "Must be an http(s) URL") @Size(max = 500) String demoUrl, boolean demoVerified,
                                @Pattern(regexp = "^$|^https?://\\S+$", message = "Must be an http(s) URL") @Size(max = 500) String documentationUrl, boolean featured) {}

    @PutMapping("/projects/{id}")
    @Transactional
    public Map<String, Object> update(@PathVariable long id, @Valid @RequestBody ProjectUpdate b) {
        Project p = find(id);
        p.setTitle(b.title().trim());
        p.setTitleNormalized(Text.normalizeTitle(b.title()));
        p.setShortDescription(b.shortDescription());
        p.setOverview(Text.blank(b.overview()) ? null : b.overview());
        p.setProblemStatement(Text.blank(b.problemStatement()) ? null : b.problemStatement());
        p.setObjectives(clean(b.objectives()));
        p.setFeatures(clean(b.features()));
        p.setModules(clean(b.modules()));
        p.setCategory(b.categoryId() == null ? null : categories.findById(b.categoryId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown category.")));
        if (b.projectType() != null) p.setProjectType(b.projectType());
        p.setDifficulty(b.difficulty());
        if (b.technologyIds() != null) {
            p.getTechnologies().clear();
            p.getTechnologies().addAll(technologies.findAllById(b.technologyIds()));
        }
        p.setDemoUrl(Text.blank(b.demoUrl()) ? null : b.demoUrl());
        p.setDemoVerified(p.getDemoUrl() != null && b.demoVerified());
        p.setDocumentationUrl(Text.blank(b.documentationUrl()) ? null : b.documentationUrl());
        p.setFeatured(b.featured());
        projects.save(p);
        scorer.score(p);
        audit.log("PROJECT_EDITED", "project", id, p.getTitle());
        return get(id);
    }

    public record ActionRequest(@NotBlank String action, @Size(max = 400) String note) {}

    @PostMapping("/projects/{id}/action")
    @Transactional
    public Map<String, Object> action(@PathVariable long id, @Valid @RequestBody ActionRequest b) {
        Project p = find(id);
        ProjectStatus s = p.getStatus();
        switch (b.action()) {
            case "approve" -> p.setStatus(ProjectStatus.APPROVED);
            case "publish" -> {
                if (p.getCategory() == null) throw bad("Choose a category before publishing.");
                if (!p.isSourceAvailable()) throw bad("The source is flagged unavailable. Revalidate it before publishing.");
                if (Text.blank(p.getShortDescription())) throw bad("Add a short description before publishing.");
                p.setStatus(ProjectStatus.PUBLISHED);
                if (p.getPublishedAt() == null) p.setPublishedAt(Instant.now());
            }
            case "unpublish" -> { if (s != ProjectStatus.PUBLISHED) throw bad("Only published projects can be unpublished."); p.setStatus(ProjectStatus.APPROVED); }
            case "reject" -> p.setStatus(ProjectStatus.REJECTED);
            case "archive" -> p.setStatus(ProjectStatus.ARCHIVED);
            case "restore" -> p.setStatus(ProjectStatus.PENDING_REVIEW);
            case "revalidate" -> { return revalidate(p); }
            default -> throw bad("Unknown action.");
        }
        if (!Text.blank(b.note()) || b.action().equals("reject")) p.setReviewNote(Text.blank(b.note()) ? "Rejected by administrator" : b.note());
        projects.save(p);
        audit.log("PROJECT_" + b.action().toUpperCase(Locale.ROOT), "project", id, s + " -> " + p.getStatus() + (Text.blank(b.note()) ? "" : ": " + b.note()));
        return get(id);
    }

    /** Re-reads the record from its source API now. A source that no longer exists moves the project to Needs Revalidation. */
    private Map<String, Object> revalidate(Project p) {
        ExternalSourceRecord rec = records.findFirstByProjectId(p.getId()).orElseThrow(() -> bad("No source record is stored for this project."));
        SourceAdapter adapter = adapters.stream().filter(a -> a.code().equals(p.getSourcePlatform().getCode())).findFirst().orElseThrow();
        String result;
        if (!adapter.supportsRefresh()) {
            int status = com.projectshelf.common.SafeHttp.probe(p.getSourceUrl());
            if (status == 404 || status == 410) { p.setSourceAvailable(false); p.setStatus(ProjectStatus.NEEDS_REVALIDATION); result = "Source page returned HTTP " + status; }
            else if (status >= 200 && status < 400) { p.setSourceAvailable(true); p.setLastVerifiedAt(Instant.now()); result = "Source page reachable (HTTP " + status + ")"; }
            else result = "Check inconclusive (HTTP " + status + ")";
        } else {
            Optional<SourceAdapter.DiscoveredItem> item;
            try {
                item = adapter.fetch(rec.getResourceKind(), rec.getExternalId());
            } catch (RuntimeException e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The source could not be checked: " + e.getMessage());
            }
            if (item.isEmpty()) { p.setSourceAvailable(false); p.setStatus(ProjectStatus.NEEDS_REVALIDATION); result = "The source reports this record no longer exists"; }
            else {
                if (p.getStatus() == ProjectStatus.NEEDS_REVALIDATION) p.setStatus(ProjectStatus.PENDING_REVIEW);
                projects.save(p);
                result = pipeline.ingest(adapter, item.get()).detail();
            }
        }
        p.setReviewNote("Revalidated: " + result);
        projects.save(p);
        audit.log("PROJECT_REVALIDATE", "project", p.getId(), result);
        return get(p.getId());
    }

    public record AssetRequest(@NotBlank @Pattern(regexp = "^https://\\S+$", message = "Must be an https URL") @Size(max = 600) String url,
                               @Size(max = 300) String attribution, boolean permitted) {}

    @PostMapping("/projects/{id}/assets")
    public ProjectAsset addAsset(@PathVariable long id, @Valid @RequestBody AssetRequest b) {
        find(id);
        ProjectAsset a = new ProjectAsset();
        a.setProjectId(id);
        a.setUrl(b.url());
        a.setAttribution(b.attribution());
        a.setPermitted(b.permitted());
        audit.log("ASSET_ADDED", "project", id, b.url());
        return assets.save(a);
    }

    @DeleteMapping("/assets/{assetId}")
    public void deleteAsset(@PathVariable long assetId) {
        assets.deleteById(assetId);
    }

    // ---------- duplicate review ----------

    @GetMapping("/duplicates")
    public List<Map<String, Object>> duplicates(@RequestParam(defaultValue = "PENDING") String status) {
        return jdbc.queryForList("SELECT d.id, d.similarity, d.reasons, d.status, a.id AS aId, a.title AS aTitle, a.status AS aStatus, a.source_url AS aUrl, "
                + "b.id AS bId, b.title AS bTitle, b.status AS bStatus, b.source_url AS bUrl FROM duplicate_candidates d JOIN projects a ON a.id = d.project_id "
                + "JOIN projects b ON b.id = d.other_project_id WHERE d.status = :s ORDER BY d.similarity DESC LIMIT 200", Map.of("s", status));
    }

    public record DuplicateDecision(@NotBlank @Pattern(regexp = "CONFIRMED|DISMISSED") String status, Long archiveProjectId) {}

    @PostMapping("/duplicates/{id}")
    @Transactional
    public void decide(@PathVariable long id, @Valid @RequestBody DuplicateDecision b) {
        DuplicateCandidate d = duplicates.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found."));
        d.setStatus(b.status());
        duplicates.save(d);
        if ("CONFIRMED".equals(b.status()) && b.archiveProjectId() != null
                && (b.archiveProjectId().equals(d.getProjectId()) || b.archiveProjectId().equals(d.getOtherProjectId()))) {
            Project p = find(b.archiveProjectId());
            p.setStatus(ProjectStatus.ARCHIVED);
            p.setReviewNote("Archived as a confirmed duplicate");
            projects.save(p);
        }
        audit.log("DUPLICATE_" + b.status(), "duplicate", id, null);
    }

    // ---------- categories & technologies ----------

    @GetMapping("/categories")
    public List<Map<String, Object>> categories() {
        return jdbc.queryForList("SELECT c.id, c.name, c.slug, c.description, c.keywords, c.sort_order AS sortOrder, c.enabled, "
                + "(SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id) AS projectCount FROM categories c ORDER BY c.sort_order, c.name", Map.of());
    }

    public record CategoryRequest(@NotBlank @Size(max = 80) String name, @Size(max = 400) String description, @Size(max = 600) String keywords, boolean enabled) {}

    @PostMapping("/categories")
    public Category createCategory(@Valid @RequestBody CategoryRequest b) {
        Category c = new Category();
        c.setSlug(Text.slugify(b.name()));
        c.setSortOrder((int) categories.count() + 1);
        return saveCategory(c, b, "CATEGORY_CREATED");
    }

    @PutMapping("/categories/{id}")
    public Category updateCategory(@PathVariable long id, @Valid @RequestBody CategoryRequest b) {
        return saveCategory(categories.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not found.")), b, "CATEGORY_UPDATED");
    }

    private Category saveCategory(Category c, CategoryRequest b, String action) {
        c.setName(b.name().trim());
        c.setDescription(b.description());
        c.setKeywords(b.keywords() == null ? null : b.keywords().toLowerCase(Locale.ROOT));
        c.setEnabled(b.enabled());
        c = categories.save(c);
        audit.log(action, "category", c.getId(), c.getName());
        return c;
    }

    /** Safe delete: a category that still has projects cannot be deleted, only disabled. */
    @DeleteMapping("/categories/{id}")
    public void deleteCategory(@PathVariable long id) {
        Long used = jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE category_id = :id", Map.of("id", id), Long.class);
        if (used != null && used > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, used + " project(s) use this category. Move them or disable the category instead.");
        categories.deleteById(id);
        audit.log("CATEGORY_DELETED", "category", id, null);
    }

    @PostMapping("/categories/reorder")
    @Transactional
    public void reorder(@RequestBody List<Long> ids) {
        for (int i = 0; i < ids.size(); i++) jdbc.update("UPDATE categories SET sort_order = :o WHERE id = :id", Map.of("o", i + 1, "id", ids.get(i)));
        audit.log("CATEGORIES_REORDERED", "category", null, null);
    }

    @GetMapping("/technologies")
    public List<Map<String, Object>> technologies() {
        return jdbc.queryForList("SELECT id, name, is_language AS language FROM technologies ORDER BY name", Map.of());
    }

    private Project find(long id) {
        return projects.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found."));
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static List<String> clean(List<String> in) {
        return in == null ? new ArrayList<>() : new ArrayList<>(in.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).limit(20).toList());
    }
}
