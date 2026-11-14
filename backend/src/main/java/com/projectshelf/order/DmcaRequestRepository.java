package com.projectshelf.order;

import com.projectshelf.common.Types.DmcaStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DmcaRequestRepository extends JpaRepository<DmcaRequest, Long> {
    Optional<DmcaRequest> findByReference(String reference);
    Page<DmcaRequest> findByStatusOrderByCreatedAtDesc(DmcaStatus status, Pageable pageable);
    Page<DmcaRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);
}

