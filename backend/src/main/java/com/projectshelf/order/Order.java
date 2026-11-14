package com.projectshelf.order;

import com.projectshelf.common.BaseEntity;
import com.projectshelf.common.Types.OrderStatus;
import com.projectshelf.common.Types.PaymentGateway;
import com.projectshelf.common.Types.ServiceType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
public class Order extends BaseEntity {

    @Column(name = "order_reference", nullable = false, unique = true, length = 40)
    private String orderReference;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "package_type", nullable = false, length = 40)
    private ServiceType packageType;

    @Column(name = "amount_inr", nullable = false, precision = 10, scale = 2)
    private BigDecimal amountInr;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrderStatus status = OrderStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_gateway", nullable = false, length = 30)
    private PaymentGateway paymentGateway = PaymentGateway.MOCK_DEMO;

    @Column(name = "gateway_order_id", length = 100)
    private String gatewayOrderId;

    @Column(name = "gateway_payment_id", length = 100)
    private String gatewayPaymentId;

    @Column(name = "student_name", nullable = false, length = 120)
    private String studentName;

    @Column(name = "student_email", nullable = false, length = 190)
    private String studentEmail;

    @Column(name = "student_phone", length = 30)
    private String studentPhone;

    @Column(name = "student_college", length = 160)
    private String studentCollege;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "paid_at")
    private Instant paidAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderDownload> downloads = new ArrayList<>();
}

