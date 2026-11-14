package com.projectshelf.discovery;

import com.projectshelf.common.BaseEntity;
import com.projectshelf.common.Types.JobStatus;
import com.projectshelf.common.Types.JobType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "discovery_jobs")
@Getter
@Setter
public class DiscoveryJob extends BaseEntity {
    @Enumerated(EnumType.STRING) private JobType jobType;
    private String triggerType;
    @Enumerated(EnumType.STRING) private JobStatus status;
    private Instant startedAt;
    private Instant endedAt;
    private int recordsDiscovered;
    private int recordsProcessed;
    private int recordsRejected;
    private int recordsUpdated;
    private int recordsPublished;
    private int errorCount;
    private int retryCount;
    private String errorMessage;
}
