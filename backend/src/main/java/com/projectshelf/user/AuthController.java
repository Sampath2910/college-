package com.projectshelf.user;

import com.projectshelf.engagement.ConsentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthenticationManager authManager;
    private final SecurityContextRepository contextRepo;
    private final AuthService auth;
    private final UserRepo users;
    private final ConsentService consent;

    public record LoginRequest(@NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {}

    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 120) String fullName,
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters") String password,
            @Pattern(regexp = "^$|^\\+?[0-9 ()-]{7,20}$", message = "Enter a valid phone number") String phone,
            @Size(max = 160) String college,
            @AssertTrue(message = "Please accept the terms to create an account") boolean acceptTerms,
            boolean activityConsent, boolean emailConsent, boolean whatsappConsent) {}

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest body, HttpServletRequest req, HttpServletResponse res) {
        return signIn(body.email(), body.password(), req, res);
    }

    @PostMapping("/register")
    @Transactional
    public Map<String, Object> register(@Valid @RequestBody RegisterRequest b, HttpServletRequest req, HttpServletResponse res) {
        if (users.findByEmail(b.email().trim().toLowerCase()).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists. Try signing in.");
        if (b.whatsappConsent() && (b.phone() == null || b.phone().isBlank()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add a WhatsApp number to receive WhatsApp messages.");
        User u = auth.create(b.email(), b.password(), b.fullName(), b.phone(), b.college(), "STUDENT");
        consent.set(u, ConsentService.ACTIVITY, b.activityConsent(), "REGISTRATION");
        consent.set(u, ConsentService.EMAIL, b.emailConsent(), "REGISTRATION");
        consent.set(u, ConsentService.WHATSAPP, b.whatsappConsent(), "REGISTRATION");
        return signIn(b.email(), b.password(), req, res);
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal AuthUser me) {
        if (me == null) return Map.of("authenticated", false);
        return describe(me, users.findById(me.id()).map(User::getFullName).orElse(""));
    }

    private Map<String, Object> signIn(String email, String password, HttpServletRequest req, HttpServletResponse res) {
        Authentication a;
        try {
            a = authManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email.trim().toLowerCase(), password));
        } catch (AuthenticationException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        HttpSession old = req.getSession(false);
        if (old != null) old.invalidate();   // session-fixation protection
        SecurityContext ctx = SecurityContextHolder.createEmptyContext();
        ctx.setAuthentication(a);
        SecurityContextHolder.setContext(ctx);
        contextRepo.saveContext(ctx, req, res);
        AuthUser me = (AuthUser) a.getPrincipal();
        User u = users.findById(me.id()).orElseThrow();
        u.setLastLoginAt(Instant.now());
        users.save(u);
        return describe(me, u.getFullName());
    }

    private Map<String, Object> describe(AuthUser me, String fullName) {
        List<String> roles = me.authorities().stream().map(GrantedAuthority::getAuthority)
                .filter(s -> s.startsWith("ROLE_")).map(s -> s.substring(5)).toList();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("authenticated", true);
        m.put("id", me.id());
        m.put("email", me.email());
        m.put("fullName", fullName);
        m.put("roles", roles);
        return m;
    }
}
