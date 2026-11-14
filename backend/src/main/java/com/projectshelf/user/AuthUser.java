package com.projectshelf.user;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

/** The authenticated principal held in the session. */
public record AuthUser(Long id, String email, String passwordHash, boolean enabled, List<SimpleGrantedAuthority> authorities) implements UserDetails {
    @Override public List<SimpleGrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return passwordHash; }
    @Override public String getUsername() { return email; }
    @Override public boolean isEnabled() { return enabled; }

    public boolean isAdmin() {
        return authorities.contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
