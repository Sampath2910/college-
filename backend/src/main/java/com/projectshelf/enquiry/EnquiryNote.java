package com.projectshelf.enquiry;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Private administrator note. Never returned by student endpoints. */
@Entity
@Table(name = "enquiry_notes")
@Getter
@Setter
public class EnquiryNote extends BaseEntity {
    private Long enquiryId;
    private Long authorId;
    private String note;
}
