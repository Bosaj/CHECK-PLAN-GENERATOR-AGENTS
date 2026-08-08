package com.project.CdgCapitalBackend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.time.ZoneId;

@SuppressWarnings("java:S120")
@Document(collection = "agents")
public class Agent {
    @Id
    private String id;
    private String name;
    private String role;
    private LocalDateTime createdAt;

    private String userId; // ID de l'utilisateur propriétaire

    public Agent() {
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    public Agent(String name, String role, String userId) {
        this.name = name;
        this.role = role;
        this.userId = userId;
        this.createdAt = LocalDateTime.now(ZoneId.systemDefault());
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
