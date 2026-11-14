package com.projectshelf.catalogue;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "licences")
@Getter
@Setter
public class Licence extends BaseEntity {
    private String spdxId;
    private String name;
    private String url;
}
