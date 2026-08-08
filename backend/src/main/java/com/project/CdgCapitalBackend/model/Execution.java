package com.project.CdgCapitalBackend.model; // NOSONAR

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.time.ZoneId;

@SuppressWarnings("java:S120")
@Document(collection = "executions")
public class Execution {
    @Id
    private String id;
    private String agentId;
    private String userId;
    private String reglementId;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String result;
    private String notes;

    public Execution() {
        this.startTime = LocalDateTime.now(ZoneId.systemDefault());
    }

    public Execution(String agentId, String status) {
        this.agentId = agentId;
        this.status = status;
        this.startTime = LocalDateTime.now(ZoneId.systemDefault());
    }
    
    public Execution(String agentId, String userId, String status) {
        this.agentId = agentId;
        this.userId = userId;
        this.status = status;
        this.startTime = LocalDateTime.now(ZoneId.systemDefault());
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAgentId() {
        return agentId;
    }

    public void setAgentId(String agentId) {
        this.agentId = agentId;
    }
    
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public String getReglementId() {
        return reglementId;
    }

    public void setReglementId(String reglementId) {
        this.reglementId = reglementId;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
