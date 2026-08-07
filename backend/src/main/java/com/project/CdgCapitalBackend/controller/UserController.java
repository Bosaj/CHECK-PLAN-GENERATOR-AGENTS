package com.project.CdgCapitalBackend.controller;

import com.project.CdgCapitalBackend.model.User;
import com.project.CdgCapitalBackend.model.dto.PasswordChangeRequest;
import com.project.CdgCapitalBackend.model.dto.ProfileUpdateRequest;
import com.project.CdgCapitalBackend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser() {
        return ResponseEntity.ok(userService.getCurrentUser());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<Map<String, Integer>> getUserStats(@PathVariable String id) {
        try {
            // Calculer les statistiques à partir de la base de données
            User user = userService.calculateUserStats(id);

            Map<String, Integer> stats = new HashMap<>();

            // Récupérer les statistiques de l'utilisateur
            stats.put("totalAgents", user.getTotalAgents());
            stats.put("totalExecutions", user.getTotalExecutions());
            stats.put("successfulExecutions", user.getSuccessfulExecutions());
            stats.put("failedExecutions", user.getFailedExecutions());

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            // En cas d'erreur, retourner des statistiques vides avec un code 200 OK
            // pour éviter les erreurs côté client
            Map<String, Integer> emptyStats = new HashMap<>();
            emptyStats.put("totalAgents", 0);
            emptyStats.put("totalExecutions", 0);
            emptyStats.put("successfulExecutions", 0);
            emptyStats.put("failedExecutions", 0);

            return ResponseEntity.ok(emptyStats);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User user) {
        return ResponseEntity.ok(userService.updateUser(id, user));
    }

    @PutMapping("/profile")
    public ResponseEntity<User> updateProfile(@RequestBody ProfileUpdateRequest request) {
        return ResponseEntity.ok(userService.updateProfile(request));
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> changePassword(@RequestBody PasswordChangeRequest request) {
        userService.changePassword(request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Mot de passe modifié avec succès");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/account")
    public ResponseEntity<Map<String, String>> deleteAccount() {
        userService.deleteCurrentUserAccount();
        Map<String, String> response = new HashMap<>();
        response.put("message", "Compte supprimé avec succès");
        return ResponseEntity.ok(response);
    }
}
