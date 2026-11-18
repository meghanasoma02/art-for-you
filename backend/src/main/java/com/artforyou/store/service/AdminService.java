
package com.artforyou.store.service;

import com.artforyou.store.entity.AdminEntity;
import com.artforyou.store.repository.AdminRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminService {

    private final AdminRepository adminRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public AdminService(AdminRepository adminRepository) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public AdminEntity register(String username, String password) {

        if (adminRepository.count() > 0) {
            throw new RuntimeException("Admin account already exists");
        }

        if (username == null || username.isBlank()
                || password == null || password.length() < 8) {
            throw new RuntimeException(
                "Username is required and password must be at least 8 characters"
            );
        }

        AdminEntity admin = new AdminEntity();
        admin.setUsername(username);
        admin.setPassword(passwordEncoder.encode(password));

        return adminRepository.save(admin);
    }

    public boolean login(String username, String password) {

        return adminRepository.findByUsername(username)
                .map(admin -> passwordEncoder.matches(
                        password, admin.getPassword()))
                .orElse(false);
    }
}
