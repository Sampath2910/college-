package com.projectshelf.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fixed-window rate limiting per client IP and endpoint group.
 * ponytail: in-memory, so limits are per backend instance; move the counters to Redis when running more than one instance.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {
    private record Rule(String name, int limit, long windowMs) {}

    private final ConcurrentHashMap<String, long[]> windows = new ConcurrentHashMap<>();
    private final boolean enabled;

    public RateLimitFilter(@Value("${app.rate-limit.enabled}") boolean enabled) {
        this.enabled = enabled;
    }

    static Rule ruleFor(String method, String path) {
        boolean post = "POST".equals(method);
        if (post && (path.equals("/api/auth/login") || path.equals("/api/auth/register"))) return new Rule("auth", 10, 60_000);
        if (post && path.equals("/api/public/enquiries")) return new Rule("enquiry", 5, 600_000);
        if (post && path.equals("/api/public/track")) return new Rule("track", 120, 60_000);
        return new Rule("api", 600, 60_000);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !enabled || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        Rule rule = ruleFor(req.getMethod(), req.getRequestURI());
        long now = System.currentTimeMillis();
        if (windows.size() > 20_000) windows.entrySet().removeIf(e -> now - e.getValue()[0] > 600_000);
        long[] w = windows.compute(rule.name + "|" + req.getRemoteAddr(), (k, v) ->
                v == null || now - v[0] >= rule.windowMs ? new long[]{now, 1} : new long[]{v[0], v[1] + 1});
        if (w[1] > rule.limit) {
            res.setStatus(429);
            res.setHeader("Retry-After", String.valueOf(Math.max(1, (rule.windowMs - (now - w[0])) / 1000)));
            res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Too many requests. Please wait a moment and try again.\"}");
            return;
        }
        chain.doFilter(req, res);
    }
}
