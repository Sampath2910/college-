package com.projectshelf.enquiry;

import com.projectshelf.common.BaseEntity;
import com.projectshelf.common.Types.Channel;
import com.projectshelf.common.Types.EnquiryStatus;
import com.projectshelf.common.Types.ServiceType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "enquiries")
@Getter
@Setter
public class Enquiry extends BaseEntity {
    private String reference;
    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String college;
    private Long projectId;
    @Enumerated(EnumType.STRING) private ServiceType serviceType;
    private String preferredTechnology;
    private String requirements;
    private String notes;
    @Enumerated(EnumType.STRING) private Channel preferredChannel;
    @Enumerated(EnumType.STRING) private EnquiryStatus status = EnquiryStatus.NEW;
    private LocalDate followUpDate;
}
