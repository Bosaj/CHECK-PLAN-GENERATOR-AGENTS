package com.project.CdgCapitalBackend.service;

import com.project.CdgCapitalBackend.model.Agent;
import com.project.CdgCapitalBackend.model.dto.AgentRequest;
import com.project.CdgCapitalBackend.repository.AgentRepository;
import com.project.CdgCapitalBackend.repository.ExecutionRepository;
import com.project.CdgCapitalBackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AgentService {

    private final AgentRepository agentRepository;

    private final UserRepository userRepository;
    private final ExecutionRepository executionRepository;


    public AgentService(AgentRepository agentRepository
                        ,
                        UserRepository userRepository, ExecutionRepository executionRepository ){
        this.agentRepository = agentRepository;

        this.userRepository = userRepository;
        this.executionRepository=executionRepository;
    }

    // Agent operations
    public List<Agent> getAllAgents() {
        return agentRepository.findAll();
    }

    public List<Agent> getAgentsByUserId(String userId) {
        return agentRepository.findByUserId(userId);
    }

    public Optional<Agent> getAgentById(String id) {
        return agentRepository.findById(id);
    }

    public Agent createAgent(AgentRequest agentRequest) {
        // Récupérer l'ID de l'utilisateur depuis la requête
        String userId = agentRequest.getUserId();

        // Créer un nouvel agent avec l'ID de l'utilisateur
        Agent agent = new Agent(agentRequest.getName(), agentRequest.getRole(), userId);

        // Mettre à jour les statistiques de l'utilisateur si l'ID est fourni
        if (userId != null && !userId.isEmpty()) {
            userRepository.findById(userId).ifPresent(user -> {
                // Incrémenter le nombre total d'agents de l'utilisateur
                user.incrementTotalAgents();
                userRepository.save(user);
            });
        }

        // Sauvegarder et retourner l'agent créé
        return agentRepository.save(agent);
    }

    public Optional<Agent> updateAgent(String id, AgentRequest agentRequest) {
        return agentRepository.findById(id)
                .map(agent -> {
                    agent.setName(agentRequest.getName());
                    agent.setRole(agentRequest.getRole());
                    return agentRepository.save(agent);
                });
    }

    public boolean deleteAgent(String id) {
        return agentRepository.findById(id).map(agent -> {
            // Mettre à jour les statistiques de l'utilisateur si l'agent a un propriétaire
            String userId = agent.getUserId();
            if (userId != null && !userId.isEmpty()) {
                userRepository.findById(userId).ifPresent(user -> {
                    user.decrementTotalAgents();
                    userRepository.save(user);
                });
            }
            executionRepository.deleteByAgentId(id);

            agentRepository.deleteById(id);
            return true;
        }).orElse(false);
    }

    // Supprimer tous les agents d'un utilisateur
    public void deleteAgentsByUserId(String userId) {
        List<Agent> userAgents = agentRepository.findByUserId(userId);


    }




}
