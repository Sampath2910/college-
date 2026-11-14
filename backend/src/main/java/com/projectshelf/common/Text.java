package com.projectshelf.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.*;

/** Small text helpers shared by slugs, classification and duplicate detection. */
public final class Text {
    private Text() {}

    private static final Set<String> STOP = Set.of("a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "with", "using",
            "based", "by", "is", "this", "that", "from", "app", "application", "project", "system", "simple", "my");

    public static String slugify(String s) {
        String n = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFKD).replaceAll("\\p{M}", "");
        n = n.toLowerCase(Locale.ROOT).replace("c++", "cpp").replace("c#", "csharp")
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        return n.length() > 120 ? n.substring(0, 120).replaceAll("-+$", "") : n;
    }

    /** Lower-case, punctuation-free title used for duplicate lookups. */
    public static String normalizeTitle(String s) {
        return slugify(s).replace('-', ' ').trim();
    }

    public static Set<String> tokens(String s) {
        Set<String> out = new HashSet<>();
        if (s == null) return out;
        for (String t : s.toLowerCase(Locale.ROOT).split("[^a-z0-9+#]+"))
            if (t.length() > 1 && !STOP.contains(t)) out.add(t);
        return out;
    }

    public static double jaccard(Set<?> a, Set<?> b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        long inter = a.stream().filter(b::contains).count();
        return (double) inter / (a.size() + b.size() - inter);
    }

    public static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    /** Removes GitHub emoji shortcodes such as ":fire:" that render as literal text outside GitHub. */
    public static String stripShortcodes(String s) {
        return s == null ? null : s.replaceAll(":[a-z0-9_+-]{2,40}:", "").replaceAll("\\s{2,}", " ").trim();
    }

    public static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
