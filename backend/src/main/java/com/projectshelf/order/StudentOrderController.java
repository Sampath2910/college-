package com.projectshelf.order;

import com.projectshelf.order.OrderDtos.OrderResponse;
import com.projectshelf.user.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/orders")
@RequiredArgsConstructor
public class StudentOrderController {

    private final OrderService orderService;

    @GetMapping
    public List<OrderResponse> getMyOrders(@AuthenticationPrincipal AuthUser user) {
        return orderService.getOrdersForUser(user.id(), user.email());
    }
}

