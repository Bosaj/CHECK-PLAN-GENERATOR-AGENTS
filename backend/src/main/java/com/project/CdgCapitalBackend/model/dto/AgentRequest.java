package com.project.CdgCapitalBackend.model.dto;

public class AgentRequest {
    private String name;
    private String role;
    private String userId;


    public AgentRequest() {
    }

    public AgentRequest(String name, String role, String userId) {
        this.name = name;
        this.role = role;
        this.userId = userId;
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

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
