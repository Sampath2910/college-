package com.projectshelf.discovery;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

/** Original metadata exactly as reported by the source. Generated summaries never overwrite this. */
@Entity
@Table(name = "external_source_records")
@Getter
@Setter
public class ExternalSourceRecord extends BaseEntity {
    private Long projectId;
    private Long sourcePlatformId;
    private String resourceKind;
    private String externalId;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> rawMetadata;
    private String readme;
    private String contentHash;
    private Instant fetchedAt;
}
