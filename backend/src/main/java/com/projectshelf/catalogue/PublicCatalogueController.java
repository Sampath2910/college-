package com.projectshelf.catalogue;

import com.projectshelf.catalogue.CatalogueService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicCatalogueController {
    private final CatalogueService catalogue;

    @GetMapping("/projects")
    public Page<PublicCard> projects(@RequestParam(required = false) String q, @RequestParam(required = false) String category,
                                     @RequestParam(required = false) String language, @RequestParam(required = false) String technology,
                                     @RequestParam(required = false) String difficulty, @RequestParam(required = false) String type,
                                     @RequestParam(required = false) String platform, @RequestParam(required = false) String sort,
                                     @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
        return catalogue.search(new Search(q, category, language, technology, difficulty, type, platform, sort), page, size);
    }

    @GetMapping("/projects/suggest")
    public List<String> suggest(@RequestParam String q) {
        return catalogue.suggest(q);
    }

    @GetMapping("/projects/{slug}")
    public PublicDetail project(@PathVariable String slug) {
        return catalogue.detail(slug).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found."));
    }

    @GetMapping("/categories")
    public List<Map<String, Object>> categories() {
        return catalogue.categoriesWithCounts();
    }

    @GetMapping("/facets")
    public Map<String, Object> facets() {
        return catalogue.facets();
    }

    @GetMapping("/home")
    public Map<String, Object> home() {
        Map<String, Object> m = new LinkedHashMap<>();
        Page<PublicCard> featured = catalogue.search(new Search(null, null, null, null, null, null, null, null), 0, 6);
        m.put("featured", featured.items().stream().filter(PublicCard::featured).toList());
        m.put("recent", catalogue.search(new Search(null, null, null, null, null, null, null, "newest"), 0, 6).items());
        m.put("categories", catalogue.categoriesWithCounts());
        m.put("technologies", catalogue.facets().get("technologies"));
        m.put("totalPublished", featured.total());
        return m;
    }

    @GetMapping("/sitemap")
    public List<Map<String, Object>> sitemap() {
        return catalogue.sitemap();
    }
}
