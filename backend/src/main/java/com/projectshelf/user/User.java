package com.projectshelf.user;

import com.projectshelf.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User extends BaseEntity {
    private String email;
    private String passwordHash;
    private String fullName;
    private String phone;
    private String college;
    private boolean enabled = true;
    private Instant deletionRequestedAt;
    private Instant lastLoginAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    public boolean hasRole(String name) {
        return roles.stream().anyMatch(r -> r.getName().equals(name));
    }
}
