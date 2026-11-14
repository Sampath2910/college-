package com.projectshelf.catalogue;

import com.projectshelf.catalogue.Repos.ProjectAssetRepo;
import com.projectshelf.catalogue.Repos.ProjectRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Read side of the public catalogue. Only PUBLISHED projects ever leave this class, and only through the Public* records. */
@Service
@RequiredArgsConstructor
public class CatalogueService {
    private final NamedParameterJdbcTemplate jdbc;
    private final ProjectRepo projects;
    private final ProjectAssetRepo assets;

    // ---- public response models (deliberately exclude scores, status, analysis and review notes) ----
    public record PublicCard(Long id, String slug, String title, String shortDescription, String category, String categorySlug,
                             String projectType, String difficulty, String platform, String platformCode, String primaryLanguage,
                             List<String> technologies, Integer stars, String licence, Instant sourceUpdatedAt, boolean featured) {}

    public record PublicAsset(String url, String attribution) {}

    public record PackageOption(String type, String title, int priceInr, int originalPriceInr, String subtitle, List<String> features, boolean popular) {}

    /**
     * Paid help offered alongside a listing. These describe OUR work (setup material, drafting help, mentoring);
     * the source code of a project always stays with its author and is obtained from the original source under its licence.
     * originalPriceInr equals priceInr: no reference ("was") prices are shown unless they were genuinely charged.
     */
    public static final List<PackageOption> DEFAULT_PACKAGES = List.of(
            new PackageOption("RUN_PACK", "Setup & Run Pack", 699, 699,
                    "Material and help to get this project running on your own machine.",
                    List.of(
                            "Step-by-step local setup guide for Windows, macOS and Linux",
                            "Run scripts and an environment configuration template",
                            "Database setup script template where the project needs one",
                            "Help by email or WhatsApp if the setup does not work for you"
                    ), false),
            new PackageOption("REPORT_PACK", "Documentation & Presentation Pack", 1299, 1299,
                    "Editable report and slide drafts structured around this project, for you to complete and cite.",
                    List.of(
                            "Everything in the Setup & Run Pack",
                            "Editable project report draft (.docx) with the standard chapter structure",
                            "Editable presentation draft (.pptx)",
                            "Guidance on diagrams, citations and attributing the original author"
                    ), true),
            new PackageOption("VIVA_MENTORSHIP", "Mentoring Sessions", 2499, 2499,
                    "One-to-one sessions so you can understand, explain and extend the project yourself.",
                    List.of(
                            "Everything in the Documentation & Presentation Pack",
                            "Live walkthrough of the code and architecture over a video call",
                            "Practice questions to prepare for your project review",
                            "Guidance on a small customisation you implement with our help"
                    ), false)
    );

    public record PublicDetail(PublicCard card, String overview, String problemStatement, List<String> objectives, List<String> features,
                               List<String> modules, String authorName, String authorUrl, String sourceUrl, String licenceName, String licenceUrl,
                               Integer forks, String demoUrl, String documentationUrl, List<PublicAsset> screenshots,
                               Instant sourceCreatedAt, Instant lastVerifiedAt, Instant publishedAt, List<PublicCard> similar,
                               boolean sourceGated, List<PackageOption> packages) {}

    public record Page<T>(List<T> items, long total, int page, int size) {}

    public record Search(String q, String category, String language, String technology, String difficulty, String type, String platform, String sort) {}

    public static PublicCard card(Project p) {
        return new PublicCard(p.getId(), p.getSlug(), p.getTitle(), p.getShortDescription(),
                p.getCategory() == null ? null : p.getCategory().getName(), p.getCategory() == null ? null : p.getCategory().getSlug(),
                p.getProjectType().name(), p.getDifficulty() == null ? null : p.getDifficulty().name(),
                p.getSourcePlatform().getName(), p.getSourcePlatform().getCode(), p.getPrimaryLanguage(),
                p.getTechnologies().stream().map(Technology::getName).sorted().toList(), p.getStars(),
                p.getLicence() == null ? null : p.getLicence().getSpdxId(), p.getSourceUpdatedAt(), p.isFeatured());
    }

    @Transactional(readOnly = true)
    public Page<PublicCard> search(Search s, int page, int size) {
        size = Math.max(1, Math.min(size, 48));
        page = Math.max(0, page);
        MapSqlParameterSource p = new MapSqlParameterSource();
        StringBuilder where = new StringBuilder(" FROM projects p LEFT JOIN categories c ON c.id = p.category_id "
                + "JOIN source_platforms sp ON sp.id = p.source_platform_id WHERE p.status = 'PUBLISHED'");
        String q = s.q() == null ? "" : s.q().trim();
        if (q.length() > 100) q = q.substring(0, 100);
        if (!q.isEmpty()) {
            where.append(" AND (MATCH(p.title, p.short_description, p.overview) AGAINST (:q IN NATURAL LANGUAGE MODE) OR p.title LIKE :like"
                    + " OR p.primary_language = :q OR EXISTS (SELECT 1 FROM project_technologies pt JOIN technologies t ON t.id = pt.technology_id"
                    + " WHERE pt.project_id = p.id AND (t.name LIKE :like OR FIND_IN_SET(LOWER(:q), t.aliases))))");
            p.addValue("q", q).addValue("like", "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        if (has(s.category())) { where.append(" AND c.slug = :category"); p.addValue("category", s.category()); }
        if (has(s.language())) { where.append(" AND p.primary_language = :language"); p.addValue("language", s.language()); }
        if (has(s.difficulty())) { where.append(" AND p.difficulty = :difficulty"); p.addValue("difficulty", s.difficulty()); }
        if (has(s.type())) { where.append(" AND p.project_type = :type"); p.addValue("type", s.type()); }
        if (has(s.platform())) { where.append(" AND sp.code = :platform"); p.addValue("platform", s.platform()); }
        if (has(s.technology())) {
            where.append(" AND EXISTS (SELECT 1 FROM project_technologies pt2 JOIN technologies t2 ON t2.id = pt2.technology_id WHERE pt2.project_id = p.id AND t2.slug = :tech)");
            p.addValue("tech", s.technology());
        }
        String order = switch (s.sort() == null ? "" : s.sort()) {
            case "popular" -> "p.stars DESC, p.id DESC";
            case "updated" -> "p.source_updated_at DESC, p.id DESC";
            case "newest" -> "p.published_at DESC, p.id DESC";
            default -> q.isEmpty() ? "p.featured DESC, p.published_at DESC, p.id DESC"
                    : "(p.title LIKE :like) DESC, MATCH(p.title, p.short_description, p.overview) AGAINST (:q IN NATURAL LANGUAGE MODE) DESC, p.id DESC";
        };
        Long total = jdbc.queryForObject("SELECT COUNT(*)" + where, p, Long.class);
        p.addValue("limit", size).addValue("offset", page * size);
        List<Long> ids = jdbc.queryForList("SELECT p.id" + where + " ORDER BY " + order + " LIMIT :limit OFFSET :offset", p, Long.class);
        return new Page<>(cards(ids), total == null ? 0 : total, page, size);
    }

    /** Loads projects by id, keeping the given order. */
    public List<PublicCard> cards(List<Long> ids) {
        Map<Long, Project> byId = projects.findAllById(ids).stream().collect(Collectors.toMap(Project::getId, Function.identity()));
        return ids.stream().map(byId::get).filter(Objects::nonNull).map(CatalogueService::card).toList();
    }

    @Transactional(readOnly = true)
    public Optional<PublicDetail> detail(String slug) {
        return projects.findBySlug(slug).filter(p -> p.getStatus() == com.projectshelf.common.Types.ProjectStatus.PUBLISHED).map(p -> {
            List<PublicAsset> shots = assets.findByProjectIdOrderBySortOrderAsc(p.getId()).stream()
                    .filter(ProjectAsset::isPermitted).map(a -> new PublicAsset(a.getUrl(), a.getAttribution())).toList();
            return new PublicDetail(card(p), p.getOverview(), p.getProblemStatement(), p.getObjectives(), p.getFeatures(), p.getModules(),
                    p.getAuthorName(), p.getAuthorUrl(), p.getSourceUrl(),
                    p.getLicence() == null ? null : p.getLicence().getName(), p.getLicence() == null ? null : p.getLicence().getUrl(),
                    p.getForks(), p.isDemoVerified() ? p.getDemoUrl() : null, p.getDocumentationUrl(), shots,
                    p.getSourceCreatedAt(), p.getLastVerifiedAt(), p.getPublishedAt(), similar(p.getId(), 4),
                    false, DEFAULT_PACKAGES);
        });
    }

    /** Published projects in the same category, ranked by number of shared technologies. */
    public List<PublicCard> similar(Long projectId, int limit) {
        List<Long> ids = jdbc.queryForList("""
                SELECT o.id FROM projects p JOIN projects o ON o.id <> p.id AND o.status = 'PUBLISHED'
                  AND (o.category_id = p.category_id OR o.primary_language = p.primary_language)
                WHERE p.id = :id
                ORDER BY (o.category_id <=> p.category_id) DESC,
                  (SELECT COUNT(*) FROM project_technologies a JOIN project_technologies b ON a.technology_id = b.technology_id
                    WHERE a.project_id = p.id AND b.project_id = o.id) DESC, o.stars DESC
                LIMIT :limit""", new MapSqlParameterSource("id", projectId).addValue("limit", limit), Long.class);
        return cards(ids);
    }

    public List<Map<String, Object>> categoriesWithCounts() {
        return jdbc.queryForList("""
                SELECT c.name, c.slug, c.description, COUNT(p.id) AS projectCount FROM categories c
                LEFT JOIN projects p ON p.category_id = c.id AND p.status = 'PUBLISHED'
                WHERE c.enabled = TRUE GROUP BY c.id ORDER BY c.sort_order, c.name""", Map.of());
    }

    public Map<String, Object> facets() {
        Map<String, Object> f = new LinkedHashMap<>();
        f.put("languages", jdbc.queryForList("SELECT primary_language AS name, COUNT(*) AS projectCount FROM projects "
                + "WHERE status = 'PUBLISHED' AND primary_language IS NOT NULL GROUP BY primary_language ORDER BY projectCount DESC LIMIT 30", Map.of()));
        f.put("technologies", jdbc.queryForList("SELECT t.name, t.slug, COUNT(*) AS projectCount FROM technologies t "
                + "JOIN project_technologies pt ON pt.technology_id = t.id JOIN projects p ON p.id = pt.project_id AND p.status = 'PUBLISHED' "
                + "GROUP BY t.id ORDER BY projectCount DESC, t.name LIMIT 40", Map.of()));
        f.put("types", jdbc.queryForList("SELECT project_type AS name, COUNT(*) AS projectCount FROM projects WHERE status = 'PUBLISHED' GROUP BY project_type", Map.of()));
        f.put("platforms", jdbc.queryForList("SELECT sp.code, sp.name, COUNT(*) AS projectCount FROM projects p JOIN source_platforms sp "
                + "ON sp.id = p.source_platform_id WHERE p.status = 'PUBLISHED' GROUP BY sp.id", Map.of()));
        return f;
    }

    public List<String> suggest(String q) {
        if (q == null || q.trim().length() < 2) return List.of();
        return jdbc.queryForList("SELECT title FROM projects WHERE status = 'PUBLISHED' AND title LIKE :like ORDER BY stars DESC LIMIT 6",
                Map.of("like", "%" + q.trim().replace("%", "\\%").replace("_", "\\_") + "%"), String.class);
    }

    public List<Map<String, Object>> sitemap() {
        return jdbc.queryForList("SELECT slug, updated_at AS updatedAt FROM projects WHERE status = 'PUBLISHED' ORDER BY id LIMIT 45000", Map.of());
    }

    private static boolean has(String s) {
        return s != null && !s.isBlank();
    }
}
