package com.projectshelf.order;

import com.projectshelf.order.OrderDtos.*;
import com.projectshelf.order.OrderService.DownloadResult;
import com.projectshelf.user.AuthUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicOrderController {

    private final OrderService orderService;

    /** Demo checkout only. No payment gateway is integrated, so this must stay false outside local development. */
    @org.springframework.beans.factory.annotation.Value("${app.payments.mock-enabled:false}")
    private boolean mockPaymentsEnabled;

    @PostMapping("/orders/checkout")
    public OrderResponse checkout(@Valid @RequestBody CreateOrderRequest req,
                                  @AuthenticationPrincipal AuthUser user) {
        Long userId = user != null ? user.id() : null;
        return orderService.createCheckoutOrder(req, userId);
    }

    @PostMapping("/orders/verify")
    public OrderResponse verify(@Valid @RequestBody VerifyPaymentRequest req) {
        // Without a real gateway there is nothing to verify: never unlock downloads on the say-so of the buyer.
        if (!mockPaymentsEnabled)
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                    "Your order request is recorded. We will contact you with payment details, and your downloads unlock once payment is confirmed.");
        return orderService.verifyPayment(req);
    }

    @GetMapping("/orders/{reference}")
    public OrderResponse getOrder(@PathVariable String reference) {
        return orderService.getOrderByReference(reference);
    }

    @GetMapping("/downloads/{token}")
    public ResponseEntity<Resource> download(@PathVariable String token) {
        DownloadResult res = orderService.resolveDownload(token);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(res.contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + res.fileName + "\"")
                .body(res.resource);
    }

    @PostMapping("/dmca")
    public DmcaResponse submitDmca(@Valid @RequestBody DmcaSubmission submission) {
        return orderService.submitDmca(submission);
    }
}

