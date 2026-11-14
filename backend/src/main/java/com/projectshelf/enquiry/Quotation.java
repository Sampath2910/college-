package com.projectshelf.enquiry;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/** A price recorded by an administrator. Quotations are always entered by a person, never generated. */
@Entity
@Table(name = "quotations")
@Getter
@Setter
public class Quotation extends BaseEntity {
    private Long enquiryId;
    private BigDecimal amount;
    private String currency = "INR";
    private String description;
    private LocalDate validUntil;
    private Long createdBy;
}
