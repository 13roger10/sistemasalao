package com.belezza.api;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashTest {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

        String password = "Admin@123";
        String storedHash = "$2a$12$Bv0aLZ8G43.UM95pJQTBfu9SOymoCNc1dsojBLxAhjCfPWw1m8J.C";

        // Test if hash matches
        boolean matches = encoder.matches(password, storedHash);
        System.out.println("Password 'Admin@123' matches hash: " + matches);

        // Generate new hash if needed
        if (!matches) {
            String newHash = encoder.encode(password);
            System.out.println("New hash for Admin@123: " + newHash);
        }
    }
}
