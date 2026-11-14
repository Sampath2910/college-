package com.projectshelf.discovery;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "ai_analyses")
@Getter
@Setter
public class AiAnalysis extends BaseEntity {
    private Long projectId;
    private String analysisKind;   // AI | HEURISTIC
    private String provider;
    private String model;
    private String inputHash;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> result;
}
