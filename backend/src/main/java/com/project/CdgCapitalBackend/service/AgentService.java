package com.project.CdgCapitalBackend.service;

import com.project.CdgCapitalBackend.model.Agent;
import com.project.CdgCapitalBackend.model.dto.AgentRequest;
import com.project.CdgCapitalBackend.repository.AgentRepository;
import com.project.CdgCapitalBackend.repository.ExecutionRepository;
import com.project.CdgCapitalBackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class AgentService {

    private final AgentRepository agentRepository;
    private final UserRepository userRepository;
    private final ExecutionRepository executionRepository;

    public AgentService(AgentRepository agentRepository,
                        UserRepository userRepository,
                        ExecutionRepository executionRepository) {
        this.agentRepository = agentRepository;
        this.userRepository = userRepository;
        this.executionRepository = executionRepository;
    }

    public List<Agent> getAllAgents() {
        return agentRepository.findAll();
    }

    public List<Agent> getAgentsByUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            return Collections.emptyList();
        }
        return agentRepository.findByUserId(userId);
    }

    public Optional<Agent> getAgentById(String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        return agentRepository.findById(id);
    }

    public Agent createAgent(AgentRequest agentRequest) {
        if (agentRequest == null) {
            throw new IllegalArgumentException("La requête de création d'agent ne peut pas être nulle");
        }
        String userId = agentRequest.getUserId();

        Agent agent = new Agent(agentRequest.getName(), agentRequest.getRole(), userId);

        if (userId != null && !userId.isBlank()) {
            userRepository.findById(userId).ifPresent(user -> {
                user.incrementTotalAgents();
                userRepository.save(user);
            });
        }

        return agentRepository.save(agent);
    }

    public Optional<Agent> updateAgent(String id, AgentRequest agentRequest) {
        if (id == null || agentRequest == null) {
            return Optional.empty();
        }
        return agentRepository.findById(id)
                .map(agent -> {
                    if (agentRequest.getName() != null) {
                        agent.setName(agentRequest.getName());
                    }
                    if (agentRequest.getRole() != null) {
                        agent.setRole(agentRequest.getRole());
                    }
                    return agentRepository.save(agent);
                });
    }

    public boolean deleteAgent(String id) {
        if (id == null || id.isBlank()) {
            return false;
        }
        return agentRepository.findById(id).map(agent -> {
            String userId = agent.getUserId();
            if (userId != null && !userId.isBlank()) {
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

    public void deleteAgentsByUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        List<Agent> userAgents = agentRepository.findByUserId(userId);
        if (userAgents != null && !userAgents.isEmpty()) {
            for (Agent agent : userAgents) {
                if (agent != null && agent.getId() != null) {
                    executionRepository.deleteByAgentId(agent.getId());
                }
            }
            agentRepository.deleteAll(userAgents);
        }
    }
}
