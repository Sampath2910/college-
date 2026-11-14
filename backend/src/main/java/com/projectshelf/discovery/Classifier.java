package com.projectshelf.discovery;

import com.projectshelf.catalogue.Category;
import com.projectshelf.catalogue.Repos.CategoryRepo;
import com.projectshelf.catalogue.Repos.TechnologyRepo;
import com.projectshelf.catalogue.Technology;
import com.projectshelf.common.Text;
import com.projectshelf.discovery.SourceAdapter.DiscoveredItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Rule-based classification from topics, language and words in the title/description.
 * Always runs (free, deterministic); AI analysis refines it when available. It only matches evidence that is present:
 * no match means the field stays empty.
 */
@Component
@RequiredArgsConstructor
public class Classifier {
    private final CategoryRepo categories;
    private final TechnologyRepo technologies;

    public record Result(Category category, Set<Technology> technologies, List<String> evidence) {}

    public Result classify(DiscoveredItem item) {
        Set<String> topics = new HashSet<>();
        item.topics().forEach(t -> topics.add(t.toLowerCase(Locale.ROOT)));
        String lang = item.primaryLanguage() == null ? "" : item.primaryLanguage().toLowerCase(Locale.ROOT);
        String text = " " + ((item.title() == null ? "" : item.title()) + " " + (item.description() == null ? "" : item.description()))
                .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#.]+", " ") + " ";
        List<String> evidence = new ArrayList<>();

        Set<Technology> techs = new LinkedHashSet<>();
        for (Technology t : technologies.findAll()) {
            for (String term : terms(t.getAliases())) {
                boolean hit = topics.contains(term) || lang.equals(term) || (term.length() >= 3 && text.contains(" " + term + " "));
                if (hit) { techs.add(t); break; }
            }
        }
        if (!techs.isEmpty()) evidence.add("Technologies matched in topics/language/description: " + techs.stream().map(Technology::getName).toList());

        Category best = null;
        int bestScore = 0;
        for (Category c : categories.findAllByOrderBySortOrderAscNameAsc()) {
            if (!c.isEnabled()) continue;
            int score = 0;
            for (String k : terms(c.getKeywords())) {
                if (topics.contains(k)) score += 3;
                else if (lang.equals(k)) score += 2;
                else if (k.length() >= 3 && text.contains(" " + k.replace('-', ' ') + " ")) score += 1;
            }
            if (score > bestScore) { bestScore = score; best = c; }
        }
        if (best != null) evidence.add("Category '" + best.getName() + "' chosen by keyword score " + bestScore);
        else {
            String fallback = switch (item.kind()) {
                case "dataset" -> "data-science";
                case "notebook", "model", "competition" -> "machine-learning";
                default -> null;
            };
            if (fallback != null) {
                best = categories.findBySlug(fallback).filter(Category::isEnabled).orElse(null);
                if (best != null) evidence.add("No keyword match; default category for Kaggle " + item.kind());
            } else evidence.add("No category keywords matched: left uncategorised for manual review");
        }
        return new Result(best, techs, evidence);
    }

    /** Resolves free-text technology names (e.g. from AI output) to known catalogue technologies. Unknown names are ignored. */
    public Set<Technology> resolve(Collection<String> names) {
        Set<Technology> out = new LinkedHashSet<>();
        List<Technology> all = technologies.findAll();
        for (String n : names) {
            String s = n == null ? "" : n.trim().toLowerCase(Locale.ROOT);
            for (Technology t : all)
                if (t.getName().equalsIgnoreCase(s) || terms(t.getAliases()).contains(s)) { out.add(t); break; }
        }
        return out;
    }

    private static List<String> terms(String csv) {
        if (Text.blank(csv)) return List.of();
        return Arrays.stream(csv.toLowerCase(Locale.ROOT).split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
