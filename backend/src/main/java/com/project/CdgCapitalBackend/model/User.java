package com.project.CdgCapitalBackend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true)
    private String email;

    private String password;

    private String profileImage;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Statistiques utilisateur
    private int totalAgents = 0;
    private int totalExecutions = 0;
    private int successfulExecutions = 0;
    private int failedExecutions = 0;

    // Constructeur pour la création d'un nouvel utilisateur
    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Méthodes pour mettre à jour les statistiques
    public void incrementTotalAgents() {
        this.totalAgents++;
    }

    public void decrementTotalAgents() {
        if (this.totalAgents > 0) {
            this.totalAgents--;
        }
    }

    public void incrementTotalExecutions() {
        this.totalExecutions++;
    }

    public void incrementSuccessfulExecutions() {
        this.successfulExecutions++;
    }

    public void incrementFailedExecutions() {
        this.failedExecutions++;
    }
}

