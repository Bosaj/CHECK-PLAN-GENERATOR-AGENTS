package com.project.CdgCapitalBackend.controller;

import com.project.CdgCapitalBackend.model.ReglementDeGestion;
import com.project.CdgCapitalBackend.service.ReglementDeGestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

@RestController
@RequestMapping("/api/reglements")
@RequiredArgsConstructor
@Slf4j
public class ReglementDeGestionController {

    private final ReglementDeGestionService reglementService;

    // Upload d’un PDF lié à un agentId
    @PostMapping(value = "/upload-by-agent", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReglementDeGestion> uploadByAgent(
            @RequestParam("pdf") MultipartFile pdf,
            @RequestParam("agentId") String agentId,
            @RequestParam(value = "userId", required = false) String userId
    ) {
        if (pdf == null || pdf.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (!StringUtils.hasText(agentId)) {
            return ResponseEntity.badRequest().build();
        }
        ReglementDeGestion saved = reglementService.saveReglement(userId, agentId, pdf);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // Liste paginée par agentId
    @GetMapping("/by-agent")
    public ResponseEntity<Optional<ReglementDeGestion>> getByAgent(
            @RequestParam("agentId") String agentId
    ) {
        if (!StringUtils.hasText(agentId)) {
            return ResponseEntity.badRequest().build();
        }
        Optional<ReglementDeGestion> result = reglementService.getByAgent(agentId);
        return ResponseEntity.ok(result);
    }
}
