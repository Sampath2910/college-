package com.projectshelf.order;

import com.projectshelf.catalogue.Project;
import com.projectshelf.catalogue.Repos.ProjectRepo;
import com.projectshelf.common.AuditService;
import com.projectshelf.common.Types.DmcaClaimType;
import com.projectshelf.common.Types.DmcaStatus;
import com.projectshelf.common.Types.DownloadFileType;
import com.projectshelf.common.Types.OrderStatus;
import com.projectshelf.common.Types.PaymentGateway;
import com.projectshelf.common.Types.ServiceType;
import com.projectshelf.integration.EmailClient;
import com.projectshelf.order.OrderDtos.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    private final OrderRepository orderRepo;
    private final OrderDownloadRepository downloadRepo;
    private final DmcaRequestRepository dmcaRepo;
    private final ProjectRepo projectRepo;
    private final PackageBundleService bundleService;
    private final EmailClient emailClient;
    private final AuditService audit;

    @Transactional
    public OrderResponse createCheckoutOrder(CreateOrderRequest req, Long userId) {
        Project project = projectRepo.findById(req.getProjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        BigDecimal amount = getPriceForPackage(req.getPackageType());

        Order order = new Order();
        order.setOrderReference(generateReference("ORD"));
        order.setUserId(userId);
        order.setProjectId(project.getId());
        order.setPackageType(req.getPackageType());
        order.setAmountInr(amount);
        order.setCurrency("INR");
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentGateway(req.getPaymentGateway() != null ? req.getPaymentGateway() : PaymentGateway.MOCK_DEMO);
        order.setStudentName(req.getStudentName().trim());
        order.setStudentEmail(req.getStudentEmail().trim().toLowerCase());
        order.setStudentPhone(req.getStudentPhone() != null ? req.getStudentPhone().trim() : null);
        order.setStudentCollege(req.getStudentCollege() != null ? req.getStudentCollege().trim() : null);
        order.setNotes(req.getNotes());

        Order saved = orderRepo.save(order);
        audit.log("ORDER_CREATED", "Order", saved.getId(), "Created " + saved.getOrderReference() + " for " + project.getTitle());

        return toOrderResponse(saved, project);
    }

    @Transactional
    public OrderResponse verifyPayment(VerifyPaymentRequest req) {
        Order order = orderRepo.findByOrderReference(req.getOrderReference())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));

        Project project = projectRepo.findById(order.getProjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        if (order.getStatus() == OrderStatus.PAID) {
            return toOrderResponse(order, project);
        }

        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(Instant.now());
        order.setGatewayPaymentId(req.getGatewayPaymentId() != null ? req.getGatewayPaymentId() : "mock_pay_" + System.currentTimeMillis());

        // Generate download tokens and file bundles
        List<OrderDownload> downloads = bundleService.generateOrderDownloads(order, project);
        for (OrderDownload d : downloads) {
            order.getDownloads().add(d);
        }

        Order updated = orderRepo.save(order);
        audit.log("ORDER_PAID", "Order", updated.getId(), "Fulfilled payment for " + updated.getOrderReference());

        // Send confirmation email
        trySendConfirmationEmail(updated, project);

        return toOrderResponse(updated, project);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByReference(String orderReference) {
        Order order = orderRepo.findByOrderReference(orderReference)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        Project project = projectRepo.findById(order.getProjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        return toOrderResponse(order, project);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersForUser(Long userId, String email) {
        List<Order> orders = userId != null ? orderRepo.findByUserIdOrderByCreatedAtDesc(userId)
                : orderRepo.findByStudentEmailOrderByCreatedAtDesc(email);

        return orders.stream().map(o -> {
            Project p = projectRepo.findById(o.getProjectId()).orElse(null);
            return toOrderResponse(o, p);
        }).collect(Collectors.toList());
    }

    public static class DownloadResult {
        public final String fileName;
        public final String contentType;
        public final Resource resource;

        public DownloadResult(String fileName, String contentType, Resource resource) {
            this.fileName = fileName;
            this.contentType = contentType;
            this.resource = resource;
        }
    }

    @Transactional
    public DownloadResult resolveDownload(String downloadToken) {
        OrderDownload download = downloadRepo.findByDownloadToken(downloadToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid or expired download token"));

        if (download.isExpired()) {
            throw new ResponseStatusException(HttpStatus.GONE, "This download link has expired (7-day validity). Please contact support.");
        }

        if (download.isDownloadLimitReached()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Download limit reached (" + download.getMaxDownloads() + " downloads).");
        }

        download.setDownloadCount(download.getDownloadCount() + 1);
        downloadRepo.save(download);

        Resource res = bundleService.getDownloadResource(download);
        String mime = getMimeType(download.getFileType());

        return new DownloadResult(download.getFileName(), mime, res);
    }

    @Transactional
    public DmcaResponse submitDmca(DmcaSubmission submission) {
        DmcaRequest req = new DmcaRequest();
        req.setReference(generateReference("DMCA"));
        req.setProjectId(submission.getProjectId());
        req.setClaimantName(submission.getClaimantName().trim());
        req.setClaimantEmail(submission.getClaimantEmail().trim().toLowerCase());
        req.setOriginalWorkUrl(submission.getOriginalWorkUrl().trim());
        req.setClaimType(submission.getClaimType() != null ? submission.getClaimType() : DmcaClaimType.ATTRIBUTION);
        req.setStatement(submission.getStatement().trim());
        req.setStatus(DmcaStatus.PENDING);

        DmcaRequest saved = dmcaRepo.save(req);
        audit.log("DMCA_SUBMITTED", "DmcaRequest", saved.getId(), "DMCA notice " + saved.getReference() + " submitted");

        return DmcaResponse.builder()
                .id(saved.getId())
                .reference(saved.getReference())
                .projectId(saved.getProjectId())
                .claimantName(saved.getClaimantName())
                .claimantEmail(saved.getClaimantEmail())
                .originalWorkUrl(saved.getOriginalWorkUrl())
                .claimType(saved.getClaimType())
                .statement(saved.getStatement())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> listOrdersAdmin(Pageable pageable) {
        return orderRepo.findAllByOrderByCreatedAtDesc(pageable)
                .map(o -> {
                    Project p = projectRepo.findById(o.getProjectId()).orElse(null);
                    return toOrderResponse(o, p);
                });
    }

    @Transactional(readOnly = true)
    public Page<DmcaResponse> listDmcaAdmin(Pageable pageable) {
        return dmcaRepo.findAllByOrderByCreatedAtDesc(pageable)
                .map(d -> DmcaResponse.builder()
                        .id(d.getId())
                        .reference(d.getReference())
                        .projectId(d.getProjectId())
                        .claimantName(d.getClaimantName())
                        .claimantEmail(d.getClaimantEmail())
                        .originalWorkUrl(d.getOriginalWorkUrl())
                        .claimType(d.getClaimType())
                        .statement(d.getStatement())
                        .status(d.getStatus())
                        .adminNotes(d.getAdminNotes())
                        .createdAt(d.getCreatedAt())
                        .build());
    }

    private BigDecimal getPriceForPackage(ServiceType pack) {
        if (pack == ServiceType.REPORT_PACK) {
            return new BigDecimal("1299.00");
        } else if (pack == ServiceType.VIVA_MENTORSHIP) {
            return new BigDecimal("2499.00");
        } else {
            return new BigDecimal("699.00");
        }
    }

    private String generateReference(String prefix) {
        String month = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyyMM"));
        StringBuilder sb = new StringBuilder(prefix).append("-").append(month).append("-");
        for (int i = 0; i < 6; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    private OrderResponse toOrderResponse(Order order, Project project) {
        List<DownloadItem> downloads = new ArrayList<>();
        if (order.getStatus() == OrderStatus.PAID && order.getDownloads() != null) {
            for (OrderDownload d : order.getDownloads()) {
                downloads.add(DownloadItem.builder()
                        .downloadToken(d.getDownloadToken())
                        .fileType(d.getFileType())
                        .fileName(d.getFileName())
                        .fileSizeBytes(d.getFileSizeBytes())
                        .downloadCount(d.getDownloadCount())
                        .maxDownloads(d.getMaxDownloads())
                        .expiresAt(d.getExpiresAt())
                        .downloadUrl("/api/public/downloads/" + d.getDownloadToken())
                        .build());
            }
        }

        return OrderResponse.builder()
                .id(order.getId())
                .orderReference(order.getOrderReference())
                .projectId(order.getProjectId())
                .projectTitle(project != null ? project.getTitle() : "Project #" + order.getProjectId())
                .projectSlug(project != null ? project.getSlug() : null)
                .packageType(order.getPackageType())
                .amountInr(order.getAmountInr())
                .currency(order.getCurrency())
                .status(order.getStatus())
                .paymentGateway(order.getPaymentGateway())
                .studentName(order.getStudentName())
                .studentEmail(order.getStudentEmail())
                .studentPhone(order.getStudentPhone())
                .studentCollege(order.getStudentCollege())
                .paidAt(order.getPaidAt())
                .createdAt(order.getCreatedAt())
                .downloads(downloads)
                .build();
    }

    private void trySendConfirmationEmail(Order order, Project project) {
        if (!emailClient.configured()) return;
        try {
            String subject = "Your Project Package is Ready: " + project.getTitle() + " [" + order.getOrderReference() + "]";
            String body = "Hi " + order.getStudentName() + ",\n\n" +
                    "Thank you for ordering the " + order.getPackageType() + " for " + project.getTitle() + ".\n\n" +
                    "Your payment of ₹" + order.getAmountInr() + " has been successfully verified.\n" +
                    "Your instant academic package and documentation have been generated.\n\n" +
                    "You can access your verified download package anytime at:\n" +
                    "http://localhost:3000/order/" + order.getOrderReference() + "\n\n" +
                    "Best regards,\nAcademic Success Team";
            emailClient.send(order.getStudentEmail(), subject, body, null);
        } catch (Exception e) {
            log.warn("Could not send order confirmation email: {}", e.getMessage());
        }
    }

    private String getMimeType(DownloadFileType type) {
        if (type == DownloadFileType.FULL_BUNDLE_ZIP) {
            return "application/zip";
        } else if (type == DownloadFileType.IEEE_REPORT_DOCX) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else if (type == DownloadFileType.PRESENTATION_PPTX) {
            return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        } else {
            return "application/octet-stream";
        }
    }
}

