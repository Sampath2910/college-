package com.projectshelf.order;

import com.projectshelf.common.Types.DmcaClaimType;
import com.projectshelf.common.Types.DmcaStatus;
import com.projectshelf.common.Types.DownloadFileType;
import com.projectshelf.common.Types.OrderStatus;
import com.projectshelf.common.Types.PaymentGateway;
import com.projectshelf.common.Types.ServiceType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class OrderDtos {
    private OrderDtos() {}

    @Data
    public static class CreateOrderRequest {
        @NotNull
        private Long projectId;

        @NotNull
        private ServiceType packageType;

        @NotBlank
        private String studentName;

        @NotBlank
        @Email
        private String studentEmail;

        private String studentPhone;
        private String studentCollege;
        private PaymentGateway paymentGateway = PaymentGateway.MOCK_DEMO;
        private String notes;
    }

    @Data
    public static class VerifyPaymentRequest {
        @NotBlank
        private String orderReference;

        private String gatewayPaymentId;
        private String gatewaySignature;
        private boolean mockSuccess = true;
    }

    @Data
    @Builder
    public static class OrderResponse {
        private Long id;
        private String orderReference;
        private Long projectId;
        private String projectTitle;
        private String projectSlug;
        private ServiceType packageType;
        private BigDecimal amountInr;
        private String currency;
        private OrderStatus status;
        private PaymentGateway paymentGateway;
        private String studentName;
        private String studentEmail;
        private String studentPhone;
        private String studentCollege;
        private Instant paidAt;
        private Instant createdAt;
        private List<DownloadItem> downloads;
    }

    @Data
    @Builder
    public static class DownloadItem {
        private String downloadToken;
        private DownloadFileType fileType;
        private String fileName;
        private Long fileSizeBytes;
        private int downloadCount;
        private int maxDownloads;
        private Instant expiresAt;
        private String downloadUrl;
    }

    @Data
    public static class DmcaSubmission {
        private Long projectId;

        @NotBlank
        private String claimantName;

        @NotBlank
        @Email
        private String claimantEmail;

        @NotBlank
        private String originalWorkUrl;

        private DmcaClaimType claimType = DmcaClaimType.ATTRIBUTION;

        @NotBlank
        private String statement;
    }

    @Data
    @Builder
    public static class DmcaResponse {
        private Long id;
        private String reference;
        private Long projectId;
        private String claimantName;
        private String claimantEmail;
        private String originalWorkUrl;
        private DmcaClaimType claimType;
        private String statement;
        private DmcaStatus status;
        private String adminNotes;
        private Instant createdAt;
    }
}

