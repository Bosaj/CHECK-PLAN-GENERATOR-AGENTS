package com.project.CdgCapitalBackend.controller;

import com.project.CdgCapitalBackend.model.Agent;
import com.project.CdgCapitalBackend.model.dto.AgentRequest;
import com.project.CdgCapitalBackend.service.AgentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/agents")
@CrossOrigin(origins = "http://localhost:3000", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class AgentController {

    private final AgentService agentService;

    public AgentController(AgentService agentService) {
        this.agentService = agentService;
    }

    // Agent endpoints
    @GetMapping
    public ResponseEntity<List<Agent>> getAllAgents() {
        return ResponseEntity.ok(agentService.getAllAgents());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Agent>> getAgentsByUserId(@PathVariable String userId) {
        try {
            List<Agent> agents = agentService.getAgentsByUserId(userId);
            return ResponseEntity.ok(agents);
        } catch (Exception e) {
            // En cas d'erreur, retourner une liste vide avec un code 200 OK
            // pour éviter les erreurs côté client
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Agent> getAgentById(@PathVariable String id) {
        return agentService.getAgentById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Agent> createAgent(@RequestBody AgentRequest agentRequest) {
        Agent createdAgent = agentService.createAgent(agentRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdAgent);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Agent> updateAgent(@PathVariable String id, @RequestBody AgentRequest agentRequest) {
        return agentService.updateAgent(id, agentRequest)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAgent(@PathVariable String id) {
        if (agentService.deleteAgent(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}