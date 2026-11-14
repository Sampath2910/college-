package com.projectshelf.order;

import com.projectshelf.order.OrderDtos.DmcaResponse;
import com.projectshelf.order.OrderDtos.OrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import com.projectshelf.order.OrderDtos.VerifyPaymentRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;

    @GetMapping("/orders")
    public Page<OrderResponse> listOrders(@PageableDefault(size = 20) Pageable pageable) {
        return orderService.listOrdersAdmin(pageable);
    }

    /** An administrator confirms a payment received outside the site (UPI or bank transfer) and releases the downloads. */
    @PostMapping("/orders/{reference}/mark-paid")
    public OrderResponse markPaid(@PathVariable String reference) {
        VerifyPaymentRequest req = new VerifyPaymentRequest();
        req.setOrderReference(reference);
        req.setGatewayPaymentId("manual_admin_confirmed");
        return orderService.verifyPayment(req);
    }

    @GetMapping("/dmca")
    public Page<DmcaResponse> listDmca(@PageableDefault(size = 20) Pageable pageable) {
        return orderService.listDmcaAdmin(pageable);
    }
}

