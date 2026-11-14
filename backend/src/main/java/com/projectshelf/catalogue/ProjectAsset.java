package com.projectshelf.catalogue;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "project_assets")
@Getter
@Setter
public class ProjectAsset extends BaseEntity {
    private Long projectId;
    private String kind = "SCREENSHOT";
    private String url;
    private String attribution;
    private boolean permitted;
    private int sortOrder;
}
