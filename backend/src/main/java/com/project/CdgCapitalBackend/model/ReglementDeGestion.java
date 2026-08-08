package com.project.CdgCapitalBackend.model;

import lombok.Data;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.time.ZoneId;

@SuppressWarnings("java:S120")
@Data
@Document(collection = "reglements")
public class ReglementDeGestion {
    private String agentId;
    private String userId;          // optionnel mais recommandé
    private String fileName;        // nom original
    private String contentType;     // ex: application/pdf
    private long fileSize;          // en octets
    private byte[] pdfData;         // binaire du PDF stocké en base

    private LocalDateTime uploadedAt;
    public ReglementDeGestion() {
        this.uploadedAt = LocalDateTime.now(ZoneId.systemDefault());
    }
}
