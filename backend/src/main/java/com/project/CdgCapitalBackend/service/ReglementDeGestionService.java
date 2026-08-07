package com.project.CdgCapitalBackend.service;

import com.project.CdgCapitalBackend.model.Agent;
import com.project.CdgCapitalBackend.model.ReglementDeGestion;
import com.project.CdgCapitalBackend.repository.AgentRepository;
import com.project.CdgCapitalBackend.repository.ReglementDeGestionRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;

@Service
public class ReglementDeGestionService {

    private final ReglementDeGestionRepository reglementRepo;
    private final AgentRepository agentRepo;

    public ReglementDeGestionService(ReglementDeGestionRepository reglementRepo,
                                     AgentRepository agentRepo) {
        this.reglementRepo = reglementRepo;
        this.agentRepo = agentRepo;
    }

    public ReglementDeGestion saveReglement(String userId,
                                            String agentId,
                                            MultipartFile pdf) {
        if (agentId == null || agentId.isBlank()) {
            throw new IllegalArgumentException("agentId est requis");
        }
        if (pdf == null || pdf.isEmpty()) {
            throw new IllegalArgumentException("Le fichier PDF est requis");
        }
        String contentType = pdf.getContentType();
        String original = pdf.getOriginalFilename() != null ? pdf.getOriginalFilename().toLowerCase() : "";
        boolean looksPdf = (contentType != null && contentType.equalsIgnoreCase("application/pdf")) || original.endsWith(".pdf");
        if (!looksPdf) {
            throw new IllegalArgumentException("Le fichier doit être un PDF");
        }

        Agent agent = agentRepo.findById(agentId)
                .orElseThrow(() -> new NoSuchElementException("Agent introuvable: " + agentId));

        if (userId != null && !userId.isBlank()) {
            if (agent.getUserId() == null || !Objects.equals(agent.getUserId(), userId)) {
                throw new IllegalArgumentException("L'agent ne correspond pas au propriétaire (userId) fourni");
            }
        }

        ReglementDeGestion reg = new ReglementDeGestion();
        reg.setAgentId(agentId);
        reg.setUserId(userId);
        reg.setFileName(pdf.getOriginalFilename());
        reg.setContentType(contentType != null ? contentType : "application/pdf");
        reg.setFileSize(pdf.getSize());
        try {
            reg.setPdfData(pdf.getBytes());
        } catch (IOException e) {
            throw new RuntimeException("Impossible de lire le contenu du PDF", e);
        }

        return reglementRepo.save(reg);
    }
    public Optional<ReglementDeGestion> getByAgent(String agentId) {
        if (agentId == null || agentId.isBlank()) {
            throw new IllegalArgumentException("agentId est requis");
        }
        return reglementRepo.findByAgentId(agentId);
    }
}
