package com.projectshelf.enquiry;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public final class EnquiryRepos {
    private EnquiryRepos() {}

    public interface EnquiryRepo extends JpaRepository<Enquiry, Long> {
        List<Enquiry> findByUserIdOrderByIdDesc(Long userId);
        boolean existsByReference(String reference);
    }

    public interface EnquiryNoteRepo extends JpaRepository<EnquiryNote, Long> {
        List<EnquiryNote> findByEnquiryIdOrderByIdDesc(Long enquiryId);
    }

    public interface QuotationRepo extends JpaRepository<Quotation, Long> {
        List<Quotation> findByEnquiryIdOrderByIdDesc(Long enquiryId);
    }
}
