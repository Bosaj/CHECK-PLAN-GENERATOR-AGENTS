package com.project.CdgCapitalBackend.service;

import com.project.CdgCapitalBackend.model.Execution;
import com.project.CdgCapitalBackend.model.User;
import com.project.CdgCapitalBackend.repository.ExecutionRepository;
import com.project.CdgCapitalBackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class ExecutionService {
    private final ExecutionRepository executionRepository;
    private final AgentService agentService;
    private final UserRepository userRepository;

    public ExecutionService(ExecutionRepository executionRepository, AgentService agentService, UserRepository userRepository) {
        this.executionRepository = executionRepository;
        this.agentService = agentService;
        this.userRepository = userRepository;
    }

    public List<Execution> getAllExecutions() {
        List<Execution> list = executionRepository.findAll();
        return list != null ? list : Collections.emptyList();
    }

    public List<Execution> getExecutionsByUserId(String userId) {
        if (userId == null || userId.isBlank()) return Collections.emptyList();
        List<Execution> list = executionRepository.findByUserIdOrderByStartTimeDesc(userId);
        return list != null ? list : Collections.emptyList();
    }

    public List<Execution> getExecutionsByAgentId(String agentId) {
        if (agentId == null || agentId.isBlank()) return Collections.emptyList();
        List<Execution> list = executionRepository.findByAgentIdOrderByStartTimeDesc(agentId);
        return list != null ? list : Collections.emptyList();
    }

    public Optional<Execution> getExecutionById(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        return executionRepository.findById(id);
    }

    public Execution startExecution(String agentId, String userId) {
        if (agentId == null || agentId.isBlank()) {
            throw new IllegalArgumentException("agentId ne peut pas être nul");
        }
        if (!agentService.getAgentById(agentId).isPresent()) {
            throw new IllegalArgumentException("Agent non trouvé avec l'ID: " + agentId);
        }

        Execution execution;
        if (userId != null && !userId.isBlank()) {
            execution = new Execution(agentId, userId, "EN_COURS");
            updateUserStats(userId, null);
        } else {
            execution = new Execution(agentId, "EN_COURS");
        }

        return executionRepository.save(execution);
    }

    public Optional<Execution> completeExecution(String executionId, String result, String notes) {
        if (executionId == null || executionId.isBlank()) return Optional.empty();
        return executionRepository.findById(executionId)
                .map(execution -> {
                    execution.setStatus("TERMINÉ");
                    execution.setEndTime(LocalDateTime.now());
                    execution.setResult(result);
                    execution.setNotes(notes);

                    if (execution.getUserId() != null) {
                        updateUserStats(execution.getUserId(), "TERMINÉ");
                    }

                    return executionRepository.save(execution);
                });
    }

    public Optional<Execution> failExecution(String executionId, String error) {
        if (executionId == null || executionId.isBlank()) return Optional.empty();
        return executionRepository.findById(executionId)
                .map(execution -> {
                    execution.setStatus("ÉCHOUÉ");
                    execution.setEndTime(LocalDateTime.now());
                    execution.setNotes(error);

                    if (execution.getUserId() != null) {
                        updateUserStats(execution.getUserId(), "ÉCHOUÉ");
                    }

                    return executionRepository.save(execution);
                });
    }

    public boolean deleteExecution(String id) {
        if (id == null || id.isBlank()) return false;
        if (executionRepository.existsById(id)) {
            executionRepository.deleteById(id);
            return true;
        }
        return false;
    }

    public void deleteExecutionsByUserId(String userId) {
        if (userId == null || userId.isBlank()) return;
        List<Execution> userExecutions = executionRepository.findByUserIdOrderByStartTimeDesc(userId);
        if (userExecutions != null && !userExecutions.isEmpty()) {
            executionRepository.deleteAll(userExecutions);
        }
    }

    private void updateUserStats(String userId, String executionStatus) {
        if (userId == null || userId.isBlank()) return;

        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return;
        }

        User user = userOptional.get();
        user.incrementTotalExecutions();

        if (executionStatus != null) {
            if ("TERMINÉ".equals(executionStatus)) {
                user.incrementSuccessfulExecutions();
            } else if ("ÉCHOUÉ".equals(executionStatus)) {
                user.incrementFailedExecutions();
            }
        }

        userRepository.save(user);
    }
}
