package com.projectshelf.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepo extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    @Query("select u from User u join u.roles r where r.name = 'STUDENT' order by u.id desc")
    List<User> findStudents();
}
