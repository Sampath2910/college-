package com.projectshelf.discovery;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.Map;

@Entity
@Table(name = "duplicate_candidates")
@Getter
@Setter
public class DuplicateCandidate extends BaseEntity {
    private Long projectId;
    private Long otherProjectId;
    private BigDecimal similarity;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> reasons;
    private String status = "PENDING";
}
