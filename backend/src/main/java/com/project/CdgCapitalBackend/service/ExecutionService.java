package com.project.CdgCapitalBackend.service;

import com.project.CdgCapitalBackend.model.Execution;
import com.project.CdgCapitalBackend.model.User;
import com.project.CdgCapitalBackend.repository.ExecutionRepository;
import com.project.CdgCapitalBackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@SuppressWarnings("java:S120")
@Service
public class ExecutionService {
    private static final String STATUS_TERMINE = "TERMINÉ";
    private static final String STATUS_ECHQUE = "ÉCHOUÉ";
    private static final String STATUS_EN_COURS = "EN_COURS";

    private final ExecutionRepository executionRepository;
    private final AgentService agentService;
    private final UserRepository userRepository;

    public ExecutionService(ExecutionRepository executionRepository, AgentService agentService, UserRepository userRepository) {
        this.executionRepository = executionRepository;
        this.agentService = agentService;
        this.userRepository = userRepository;
    }

    public List<Execution> getAllExecutions() {
        return executionRepository.findAll();
    }

    public List<Execution> getExecutionsByUserId(String userId) {
        if (userId == null || userId.isBlank()) return Collections.emptyList();
        return executionRepository.findByUserIdOrderByStartTimeDesc(userId);
    }

    public List<Execution> getExecutionsByAgentId(String agentId) {
        if (agentId == null || agentId.isBlank()) return Collections.emptyList();
        return executionRepository.findByAgentIdOrderByStartTimeDesc(agentId);
    }

    public Optional<Execution> getExecutionById(String id) {
        if (id == null || id.isBlank()) return Optional.empty();
        return executionRepository.findById(id);
    }

    public Execution startExecution(String agentId, String userId) {
        if (agentId == null || agentId.isBlank()) {
            throw new IllegalArgumentException("agentId ne peut pas être nul");
        }
        if (agentService.getAgentById(agentId).isEmpty()) {
            throw new IllegalArgumentException("Agent non trouvé avec l'ID: " + agentId);
        }

        Execution execution;
        if (userId != null && !userId.isBlank()) {
            execution = new Execution(agentId, userId, STATUS_EN_COURS);
            updateUserStats(userId, null);
        } else {
            execution = new Execution(agentId, STATUS_EN_COURS);
        }

        return executionRepository.save(execution);
    }

    public Optional<Execution> completeExecution(String executionId, String result, String notes) {
        if (executionId == null || executionId.isBlank()) return Optional.empty();
        return executionRepository.findById(executionId)
                .map(execution -> {
                    execution.setStatus(STATUS_TERMINE);
                    execution.setEndTime(LocalDateTime.now(ZoneId.systemDefault()));
                    execution.setResult(result);
                    execution.setNotes(notes);

                    if (execution.getUserId() != null) {
                        updateUserStats(execution.getUserId(), STATUS_TERMINE);
                    }

                    return executionRepository.save(execution);
                });
    }

    public Optional<Execution> failExecution(String executionId, String error) {
        if (executionId == null || executionId.isBlank()) return Optional.empty();
        return executionRepository.findById(executionId)
                .map(execution -> {
                    execution.setStatus(STATUS_ECHQUE);
                    execution.setEndTime(LocalDateTime.now(ZoneId.systemDefault()));
                    execution.setNotes(error);

                    if (execution.getUserId() != null) {
                        updateUserStats(execution.getUserId(), STATUS_ECHQUE);
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
        if (!userExecutions.isEmpty()) {
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
            if (STATUS_TERMINE.equals(executionStatus)) {
                user.incrementSuccessfulExecutions();
            } else if (STATUS_ECHQUE.equals(executionStatus)) {
                user.incrementFailedExecutions();
            }
        }

        userRepository.save(user);
    }
}
