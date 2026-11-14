package com.projectshelf.discovery;

import com.fasterxml.jackson.core.type.TypeReference;
import com.projectshelf.catalogue.Project;
import com.projectshelf.common.SettingsService;
import com.projectshelf.discovery.DiscoveryRepos.AiAnalysisRepo;
import com.projectshelf.discovery.DiscoveryRepos.ExternalSourceRecordRepo;
import com.projectshelf.discovery.DiscoveryRepos.QualityScoreRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

/**
 * Transparent internal ranking. Each criterion yields a value in 0..1 with a written evidence line; the total is the
 * weighted average (0-100) using admin-configurable weights. Unknown information scores 0 and is labelled unknown;
 * stars and recency are treated as weak signals only, never as proof of quality or correctness.
 */
@Component
@RequiredArgsConstructor
public class QualityScorer {
    private final SettingsService settings;
    private final ExternalSourceRecordRepo records;
    private final AiAnalysisRepo analyses;
    private final QualityScoreRepo scores;

    public QualityScore score(Project p) {
        Map<String, Double> weights = settings.get("quality.weights", new TypeReference<>() {});
        String readme = records.findFirstByProjectId(p.getId()).map(ExternalSourceRecord::getReadme).orElse(null);
        Map<String, Object> ai = analyses.findFirstByProjectIdAndAnalysisKindOrderByIdDesc(p.getId(), "AI").map(AiAnalysis::getResult).orElse(Map.of());
        int readmeLen = readme == null ? 0 : readme.length();
        int descLen = p.getShortDescription() == null ? 0 : p.getShortDescription().length();
        List<Map<String, Object>> rows = new ArrayList<>();

        Double aiDoc = rating(ai, "documentation_quality");
        if (aiDoc != null) add(rows, weights, "documentation", aiDoc, "AI rating of the README/description: " + Math.round(aiDoc * 10) + "/10");
        else if (readmeLen > 0) add(rows, weights, "documentation", readmeLen < 500 ? 0.3 : readmeLen < 2000 ? 0.6 : readmeLen < 6000 ? 0.8 : 1.0, "README length " + readmeLen + " characters (length only; content not rated)");
        else add(rows, weights, "documentation", descLen >= 80 ? 0.4 : descLen > 0 ? 0.2 : 0, "No README available from the source; description length " + descLen);

        Double aiComplete = rating(ai, "completeness");
        if (aiComplete != null) add(rows, weights, "completeness", aiComplete, "AI estimate from documentation: " + Math.round(aiComplete * 10) + "/10 (the project was not executed or tested)");
        else {
            int present = (descLen > 0 ? 1 : 0) + (readmeLen > 1000 ? 1 : 0) + (p.getTechnologies().isEmpty() ? 0 : 1) + (p.getLicence() != null ? 1 : 0) + (p.getDemoUrl() != null ? 1 : 0);
            add(rows, weights, "completeness", present / 5.0, present + " of 5 signals present (description, substantial README, technologies, licence, website). Not executed or tested");
        }

        Double aiRel = rating(ai, "student_relevance");
        if (aiRel != null) add(rows, weights, "studentRelevance", aiRel, "AI estimate of suitability as a college project: " + Math.round(aiRel * 10) + "/10");
        else {
            String t = (p.getTitle() + " " + p.getShortDescription()).toLowerCase(Locale.ROOT);
            boolean learning = t.matches("(?s).*(project|tutorial|beginner|student|final.year|course|example|learn|management system|clone).*");
            add(rows, weights, "studentRelevance", (p.getCategory() != null ? 0.5 : 0.2) + (learning ? 0.3 : 0), "Rule-based: " + (p.getCategory() != null ? "matches a catalogue category" : "no category match") + (learning ? "; learning/project wording in title or description" : ""));
        }

        int techs = p.getTechnologies().size();
        add(rows, weights, "technologyRelevance", Math.min(1.0, techs / 3.0), techs + " recognised technologies");
        add(rows, weights, "sourceAvailability", p.isSourceAvailable() ? 1 : 0, p.isSourceAvailable() ? "Source page reachable at last check" : "Source reported unavailable");

        if (p.getSourceUpdatedAt() == null) add(rows, weights, "maintenance", 0, "Last update date unknown");
        else {
            long months = Duration.between(p.getSourceUpdatedAt(), Instant.now()).toDays() / 30;
            add(rows, weights, "maintenance", months <= 12 ? 1 : months <= 24 ? 0.6 : months <= 36 ? 0.3 : 0.1, "Last source update about " + months + " months ago (activity is not proof of correctness)");
        }

        if (p.getStars() == null) add(rows, weights, "popularity", 0, "Popularity unknown");
        else add(rows, weights, "popularity", Math.min(1.0, Math.log10(p.getStars() + 1) / 4.0), p.getStars() + " stars/votes on the source (popularity is not proof of quality)");

        add(rows, weights, "licenceClarity", p.getLicence() != null ? 1 : 0, p.getLicence() != null ? "Licence reported: " + p.getLicence().getName() : "No licence reported: reuse rights unknown");
        add(rows, weights, "demoEvidence", p.isDemoVerified() ? 1 : p.getDemoUrl() != null ? 0.3 : 0,
                p.isDemoVerified() ? "Website/demo link responded at last check" : p.getDemoUrl() != null ? "Website link listed but not yet checked" : "No demo link listed");

        double sumW = 0, sum = 0;
        for (Map<String, Object> r : rows) { sumW += (double) r.get("weight"); sum += (double) r.get("weight") * (double) r.get("value"); }
        QualityScore qs = new QualityScore();
        qs.setProjectId(p.getId());
        qs.setTotal(BigDecimal.valueOf(sumW == 0 ? 0 : sum / sumW * 100).setScale(2, RoundingMode.HALF_UP));
        qs.setBreakdown(rows);
        p.setQualityScore(qs.getTotal());
        return scores.save(qs);
    }

    private static void add(List<Map<String, Object>> rows, Map<String, Double> weights, String criterion, double value, String evidence) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("criterion", criterion);
        r.put("weight", weights.getOrDefault(criterion, 0d));
        r.put("value", Math.round(value * 100) / 100.0);
        r.put("evidence", evidence);
        rows.add(r);
    }

    /** AI ratings are 0-10 or null (unknown). */
    private static Double rating(Map<String, Object> ai, String key) {
        return ai.get(key) instanceof Number n ? Math.max(0, Math.min(10, n.doubleValue())) / 10.0 : null;
    }
}
