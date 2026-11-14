package com.projectshelf.integration;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/** Connection status for an external service. Credentials are never stored here. */
@Entity
@Table(name = "integrations")
@Getter
@Setter
public class Integration extends BaseEntity {
    private String code;
    private String name;
    private boolean enabled = true;
    private Instant lastSuccessAt;
    private Instant lastFailureAt;
    private String lastFailureMessage;
    private Instant lastSyncAt;
}
