package com.projectshelf.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService implements UserDetailsService, ApplicationRunner {
    private final UserRepo users;
    private final RoleRepo roles;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    @Value("${app.admin.email}") private String adminEmail;
    @Value("${app.admin.password}") private String adminPassword;

    @Override
    @Transactional(readOnly = true)
    public AuthUser loadUserByUsername(String email) {
        User u = users.findByEmail(email.trim().toLowerCase(Locale.ROOT)).orElseThrow(() -> new UsernameNotFoundException("not found"));
        List<SimpleGrantedAuthority> auth = new ArrayList<>();
        u.getRoles().forEach(r -> auth.add(new SimpleGrantedAuthority("ROLE_" + r.getName())));
        jdbc.queryForList("SELECT DISTINCT p.name FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id "
                + "JOIN user_roles ur ON ur.role_id = rp.role_id WHERE ur.user_id = ?", String.class, u.getId())
                .forEach(p -> auth.add(new SimpleGrantedAuthority(p)));
        return new AuthUser(u.getId(), u.getEmail(), u.getPasswordHash(), u.isEnabled(), List.copyOf(auth));
    }

    @Transactional
    public User create(String email, String rawPassword, String fullName, String phone, String college, String role) {
        User u = new User();
        u.setEmail(email.trim().toLowerCase(Locale.ROOT));
        u.setPasswordHash(encoder.encode(rawPassword));
        u.setFullName(fullName.trim());
        u.setPhone(phone);
        u.setCollege(college);
        u.getRoles().add(roles.findByName(role).orElseThrow());
        return users.save(u);
    }

    /** Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD. There is no default account. */
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            log.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set: no administrator account was bootstrapped.");
            return;
        }
        if (users.findByEmail(adminEmail.trim().toLowerCase(Locale.ROOT)).isEmpty()) {
            if (adminPassword.length() < 12) throw new IllegalStateException("ADMIN_PASSWORD must be at least 12 characters.");
            create(adminEmail, adminPassword, "Administrator", null, null, "ADMIN");
            log.info("Administrator account created for {}", adminEmail);
        }
    }
}
