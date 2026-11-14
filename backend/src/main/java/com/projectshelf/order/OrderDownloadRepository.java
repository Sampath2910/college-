package com.projectshelf.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderDownloadRepository extends JpaRepository<OrderDownload, Long> {
    Optional<OrderDownload> findByDownloadToken(String downloadToken);
    List<OrderDownload> findByOrderId(Long orderId);
}

