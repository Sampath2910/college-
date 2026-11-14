package com.projectshelf.order;

import com.projectshelf.common.BaseEntity;
import com.projectshelf.common.Types.DmcaClaimType;
import com.projectshelf.common.Types.DmcaStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "dmca_requests")
@Getter
@Setter
public class DmcaRequest extends BaseEntity {

    @Column(name = "reference", nullable = false, unique = true, length = 40)
    private String reference;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "claimant_name", nullable = false, length = 120)
    private String claimantName;

    @Column(name = "claimant_email", nullable = false, length = 190)
    private String claimantEmail;

    @Column(name = "original_work_url", nullable = false, length = 500)
    private String originalWorkUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "claim_type", nullable = false, length = 40)
    private DmcaClaimType claimType = DmcaClaimType.ATTRIBUTION;

    @Column(name = "statement", nullable = false, columnDefinition = "TEXT")
    private String statement;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private DmcaStatus status = DmcaStatus.PENDING;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;
}

