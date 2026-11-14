package com.projectshelf.discovery;

import com.projectshelf.catalogue.Project;
import com.projectshelf.common.SettingsService;
import com.projectshelf.common.Text;
import com.projectshelf.discovery.DiscoveryRepos.DuplicateCandidateRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Flags likely duplicates for manual review; it never merges anything.
 * Exact duplicates cannot exist (unique canonical URL and unique source id). This looks for the same project
 * re-published elsewhere: similarity = 0.45 title + 0.35 description + 0.20 technologies, and a similar title alone is never enough.
 * ponytail: compares against every project (O(n) per check, lexical only); add an embedding index if the catalogue passes ~20k rows.
 */
@Component
@RequiredArgsConstructor
public class DuplicateDetector {
    private final JdbcTemplate jdbc;
    private final DuplicateCandidateRepo candidates;
    private final SettingsService settings;

    public record Similarity(double total, double title, double description, double technology) {}

    public static Similarity similarity(String titleA, String descA, Set<String> techA, String titleB, String descB, Set<String> techB) {
        String na = Text.normalizeTitle(titleA), nb = Text.normalizeTitle(titleB);
        double title = na.equals(nb) ? 1 : Text.jaccard(Text.tokens(na), Text.tokens(nb));
        double desc = Text.jaccard(Text.tokens(descA), Text.tokens(descB));
        double tech = Text.jaccard(techA, techB);
        return new Similarity(0.45 * title + 0.35 * desc + 0.20 * tech, title, desc, tech);
    }

    public static boolean isCandidate(Similarity s, double threshold) {
        return s.total() >= threshold && (s.description() >= 0.3 || s.technology() >= 0.5);
    }

    /** Compares one project with all others and stores new candidates. Returns how many were added. */
    public int check(Project p) {
        double threshold = settings.getDouble("duplicates.threshold");
        Set<String> tech = p.getTechnologies().stream().map(t -> t.getId().toString()).collect(Collectors.toSet());
        int added = 0;
        for (Map<String, Object> o : jdbc.queryForList("""
                SELECT p.id, p.title, p.short_description AS descr, GROUP_CONCAT(pt.technology_id) AS techs
                FROM projects p LEFT JOIN project_technologies pt ON pt.project_id = p.id
                WHERE p.id <> ? AND p.status NOT IN ('REJECTED','ARCHIVED') GROUP BY p.id""", p.getId())) {
            Set<String> otherTech = o.get("techs") == null ? Set.of() : new HashSet<>(Arrays.asList(o.get("techs").toString().split(",")));
            Similarity s = similarity(p.getTitle(), p.getShortDescription(), tech, (String) o.get("title"), (String) o.get("descr"), otherTech);
            if (!isCandidate(s, threshold)) continue;
            long other = ((Number) o.get("id")).longValue(), a = Math.min(p.getId(), other), b = Math.max(p.getId(), other);
            if (candidates.existsByProjectIdAndOtherProjectId(a, b)) continue;
            DuplicateCandidate c = new DuplicateCandidate();
            c.setProjectId(a);
            c.setOtherProjectId(b);
            c.setSimilarity(BigDecimal.valueOf(s.total()).setScale(3, RoundingMode.HALF_UP));
            c.setReasons(Map.of("title", round(s.title()), "description", round(s.description()), "technology", round(s.technology())));
            candidates.saveAndFlush(c);
            added++;
        }
        return added;
    }

    public boolean hasPending(Long projectId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM duplicate_candidates WHERE status = 'PENDING' AND (project_id = ? OR other_project_id = ?)",
                Integer.class, projectId, projectId);
        return n != null && n > 0;
    }

    private static double round(double d) {
        return Math.round(d * 100) / 100.0;
    }
}
