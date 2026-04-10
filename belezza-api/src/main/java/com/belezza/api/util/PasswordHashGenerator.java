package com.belezza.api.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility class to generate BCrypt password hashes.
 * Run as: mvn exec:java -Dexec.mainClass="com.belezza.api.util.PasswordHashGenerator"
 */
public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

        String[] passwords = {"admin123", "Admin@123", "prof123", "cliente123"};

        System.out.println("BCrypt Password Hashes (cost=10):");
        System.out.println("=================================");
        for (String pwd : passwords) {
            String hash = encoder.encode(pwd);
            System.out.println(pwd + " -> " + hash);

            // Verify
            boolean matches = encoder.matches(pwd, hash);
            System.out.println("  Verified: " + matches);
        }
    }
}
