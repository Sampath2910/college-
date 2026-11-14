package com.projectshelf.catalogue;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "categories")
@Getter
@Setter
public class Category extends BaseEntity {
    private String name;
    private String slug;
    private String description;
    private String keywords;
    private int sortOrder;
    private boolean enabled = true;
}
