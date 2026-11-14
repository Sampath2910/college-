package com.projectshelf.discovery;

import com.projectshelf.common.Types.ProjectType;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * One implementation per source platform. To add a platform: implement this interface as a Spring bean and
 * insert a row in source_platforms + integrations with the same code. Adapters must use official APIs only.
 */
public interface SourceAdapter {
    String code();

    /** True when credentials are present. Some platforms also allow limited unauthenticated access. */
    boolean credentialsConfigured();

    List<DiscoveredItem> search(String keyword, int limit);

    /** README / long-form documentation where the platform exposes it. */
    default Optional<String> readme(DiscoveredItem item) { return Optional.empty(); }

    /** Whether {@link #fetch} is implemented for single-record refreshes. */
    default boolean supportsRefresh() { return false; }

    /** Current state of one record; empty means the source reports it no longer exists. */
    default Optional<DiscoveredItem> fetch(String kind, String externalId) { throw new UnsupportedOperationException(); }

    /** Performs a real request and returns a short human-readable result. Throws on failure. */
    String testConnection();

    record DiscoveredItem(String kind, String externalId, String title, String description, String authorName, String authorUrl,
                          String url, String primaryLanguage, List<String> topics, Integer stars, Integer forks,
                          String licenceSpdx, String licenceName, Instant createdAt, Instant updatedAt, String homepage,
                          boolean archived, ProjectType type, Map<String, Object> raw) {}

    /** The platform asked us to slow down; the job stops cleanly and resumes on its next run. */
    class RateLimitedException extends RuntimeException {
        public RateLimitedException(String message) { super(message); }
    }
}
