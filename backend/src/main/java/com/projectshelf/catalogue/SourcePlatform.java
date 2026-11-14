package com.projectshelf.catalogue;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "source_platforms")
@Getter
@Setter
public class SourcePlatform extends BaseEntity {
    private String code;
    private String name;
    private String baseUrl;
    private boolean enabled = true;
    private boolean autoPublish;
    private BigDecimal autoPublishThreshold = new BigDecimal("80.00");
}
