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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepo;
    @Mock private OrderDownloadRepository downloadRepo;
    @Mock private DmcaRequestRepository dmcaRepo;
    @Mock private ProjectRepo projectRepo;
    @Mock private PackageBundleService bundleService;
    @Mock private EmailClient emailClient;
    @Mock private AuditService audit;

    private OrderService orderService;

    @BeforeEach
    void setup() {
        orderService = new OrderService(orderRepo, downloadRepo, dmcaRepo, projectRepo, bundleService, emailClient, audit);
    }

    @Test
    void testCreateCheckoutOrderSuccess() {
        Project p = new Project();
        p.setId(10L);
        p.setTitle("Distributed Task Queue");
        p.setSlug("distributed-task-queue");

        when(projectRepo.findById(10L)).thenReturn(Optional.of(p));
        when(orderRepo.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(101L);
            return o;
        });

        CreateOrderRequest req = new CreateOrderRequest();
        req.setProjectId(10L);
        req.setPackageType(ServiceType.REPORT_PACK);
        req.setStudentName("Kavya Sharma");
        req.setStudentEmail("kavya@example.com");
        req.setStudentCollege("IIT Bombay");
        req.setPaymentGateway(PaymentGateway.MOCK_DEMO);

        OrderResponse res = orderService.createCheckoutOrder(req, 5L);

        assertNotNull(res);
        assertEquals(101L, res.getId());
        assertTrue(res.getOrderReference().startsWith("ORD-"));
        assertEquals(new BigDecimal("1299.00"), res.getAmountInr());
        assertEquals(OrderStatus.PENDING, res.getStatus());
        assertEquals("Kavya Sharma", res.getStudentName());
        verify(audit).log(eq("ORDER_CREATED"), eq("Order"), eq(101L), anyString());
    }

    @Test
    void testVerifyPaymentGeneratesDownloadsAndFulfills() {
        Project p = new Project();
        p.setId(10L);
        p.setTitle("Distributed Task Queue");

        Order order = new Order();
        order.setId(101L);
        order.setOrderReference("ORD-202611-TEST01");
        order.setProjectId(10L);
        order.setPackageType(ServiceType.REPORT_PACK);
        order.setAmountInr(new BigDecimal("1299.00"));
        order.setStatus(OrderStatus.PENDING);
        order.setStudentName("Kavya Sharma");
        order.setStudentEmail("kavya@example.com");

        when(orderRepo.findByOrderReference("ORD-202611-TEST01")).thenReturn(Optional.of(order));
        when(projectRepo.findById(10L)).thenReturn(Optional.of(p));

        OrderDownload dl = new OrderDownload();
        dl.setOrder(order);
        dl.setDownloadToken("dl_token_123");
        dl.setFileType(DownloadFileType.FULL_BUNDLE_ZIP);
        dl.setFileName("Distributed_Task_Queue_Academic_Bundle.zip");
        dl.setFileSizeBytes(1024L);
        dl.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));

        when(bundleService.generateOrderDownloads(order, p)).thenReturn(List.of(dl));
        when(orderRepo.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        VerifyPaymentRequest vReq = new VerifyPaymentRequest();
        vReq.setOrderReference("ORD-202611-TEST01");
        vReq.setGatewayPaymentId("pay_gateway_abc");

        OrderResponse res = orderService.verifyPayment(vReq);

        assertEquals(OrderStatus.PAID, res.getStatus());
        assertNotNull(res.getPaidAt());
        assertEquals(1, res.getDownloads().size());
        assertEquals("dl_token_123", res.getDownloads().get(0).getDownloadToken());
        verify(audit).log(eq("ORDER_PAID"), eq("Order"), eq(101L), anyString());
    }

    @Test
    void testResolveDownloadChecksExpiration() {
        OrderDownload dl = new OrderDownload();
        dl.setDownloadToken("expired_token");
        dl.setExpiresAt(Instant.now().minus(1, ChronoUnit.DAYS)); // Expired yesterday

        when(downloadRepo.findByDownloadToken("expired_token")).thenReturn(Optional.of(dl));

        assertThrows(ResponseStatusException.class, () -> orderService.resolveDownload("expired_token"));
    }

    @Test
    void testResolveDownloadIncrementsCount() {
        OrderDownload dl = new OrderDownload();
        dl.setDownloadToken("valid_token");
        dl.setFileName("Academic_Bundle.zip");
        dl.setFileType(DownloadFileType.FULL_BUNDLE_ZIP);
        dl.setDownloadCount(2);
        dl.setMaxDownloads(10);
        dl.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));

        when(downloadRepo.findByDownloadToken("valid_token")).thenReturn(Optional.of(dl));
        when(bundleService.getDownloadResource(dl)).thenReturn(new ByteArrayResource(new byte[]{1, 2, 3}));

        OrderService.DownloadResult res = orderService.resolveDownload("valid_token");

        assertEquals("Academic_Bundle.zip", res.fileName);
        assertEquals("application/zip", res.contentType);
        assertEquals(3, dl.getDownloadCount());
        verify(downloadRepo).save(dl);
    }

    @Test
    void testSubmitDmcaRequest() {
        when(dmcaRepo.save(any(DmcaRequest.class))).thenAnswer(inv -> {
            DmcaRequest d = inv.getArgument(0);
            d.setId(50L);
            return d;
        });

        DmcaSubmission sub = new DmcaSubmission();
        sub.setClaimantName("Original Author");
        sub.setClaimantEmail("author@source.org");
        sub.setOriginalWorkUrl("https://github.com/author/original-project");
        sub.setClaimType(DmcaClaimType.ATTRIBUTION);
        sub.setStatement("Please ensure my author credit is prominently displayed in the academic license.");

        DmcaResponse res = orderService.submitDmca(sub);

        assertNotNull(res);
        assertTrue(res.getReference().startsWith("DMCA-"));
        assertEquals(DmcaStatus.PENDING, res.getStatus());
        assertEquals("Original Author", res.getClaimantName());
        verify(audit).log(eq("DMCA_SUBMITTED"), eq("DmcaRequest"), eq(50L), anyString());
    }
}

