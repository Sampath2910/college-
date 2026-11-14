package com.projectshelf.catalogue;

import com.projectshelf.common.BaseEntity;
import com.projectshelf.common.Types.Difficulty;
import com.projectshelf.common.Types.ProjectStatus;
import com.projectshelf.common.Types.ProjectType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A catalogue entry. Text fields here are the catalogue's own presentation (source description or generated summary);
 * the untouched source metadata is kept in external_source_records.
 */
@Entity
@Table(name = "projects")
@Getter
@Setter
public class Project extends BaseEntity {
    private String slug;
    private String title;
    private String titleNormalized;
    private String shortDescription;
    private String overview;
    private String problemStatement;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> objectives = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) private List<String> features = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) private List<String> modules = new ArrayList<>();

    @ManyToOne @JoinColumn(name = "category_id") private Category category;
    @Enumerated(EnumType.STRING) private ProjectType projectType;
    @Enumerated(EnumType.STRING) private Difficulty difficulty;

    private String authorName;
    private String authorUrl;
    @ManyToOne(optional = false) @JoinColumn(name = "source_platform_id") private SourcePlatform sourcePlatform;
    private String sourceUrl;
    private String canonicalUrl;
    @ManyToOne @JoinColumn(name = "licence_id") private Licence licence;
    private Integer stars;
    private Integer forks;
    private String primaryLanguage;
    private String demoUrl;
    private boolean demoVerified;
    private String documentationUrl;
    private boolean sourceAvailable = true;
    private Instant sourceCreatedAt;
    private Instant sourceUpdatedAt;
    private Instant lastVerifiedAt;
    private Instant discoveredAt;
    private Instant publishedAt;

    // internal only: never mapped into public responses
    private BigDecimal qualityScore;
    private String analysisStatus = "NONE";
    @Enumerated(EnumType.STRING) private ProjectStatus status;
    private String reviewNote;

    private boolean featured;
    @Column(insertable = false, updatable = false) private long viewCount;

    @ManyToMany
    @JoinTable(name = "project_technologies", joinColumns = @JoinColumn(name = "project_id"), inverseJoinColumns = @JoinColumn(name = "technology_id"))
    private Set<Technology> technologies = new HashSet<>();
}
