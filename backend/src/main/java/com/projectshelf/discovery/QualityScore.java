package com.projectshelf.discovery;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "quality_scores")
@Getter
@Setter
public class QualityScore extends BaseEntity {
    private Long projectId;
    private BigDecimal total;
    @JdbcTypeCode(SqlTypes.JSON) private List<Map<String, Object>> breakdown;
}
