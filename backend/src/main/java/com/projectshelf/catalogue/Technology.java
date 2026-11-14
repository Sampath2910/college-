package com.projectshelf.catalogue;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "technologies")
@Getter
@Setter
public class Technology extends BaseEntity {
    private String name;
    private String slug;
    private String aliases;
    @Column(name = "is_language")
    private boolean language;
}
