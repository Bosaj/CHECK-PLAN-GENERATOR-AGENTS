package com.project.CdgCapitalBackend.service;

import com.project.CdgCapitalBackend.model.Execution;
import com.project.CdgCapitalBackend.model.User;
import com.project.CdgCapitalBackend.repository.ExecutionRepository;
import com.project.CdgCapitalBackend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
        return executionRepository.findAll();
    }

    public List<Execution> getExecutionsByUserId(String userId) {
        return executionRepository.findByUserIdOrderByStartTimeDesc(userId);
    }

    public List<Execution> getExecutionsByAgentId(String agentId) {
        return executionRepository.findByAgentIdOrderByStartTimeDesc(agentId);
    }

    public Optional<Execution> getExecutionById(String id) {
        return executionRepository.findById(id);
    }

    public Execution startExecution(String agentId, String userId) {
        // Vérifier si l'agent existe
        if (!agentService.getAgentById(agentId).isPresent()) {
            throw new IllegalArgumentException("Agent non trouvé avec l'ID: " + agentId);
        }

        // Créer une nouvelle exécution avec ou sans userId
        Execution execution;
        if (userId != null && !userId.isEmpty()) {
            execution = new Execution(agentId, userId, "EN_COURS");
            // Mettre à jour les statistiques de l'utilisateur seulement si userId est fourni
            updateUserStats(userId, null);
        } else {
            execution = new Execution(agentId, "EN_COURS");
        }

        return executionRepository.save(execution);
    }

    public Optional<Execution> completeExecution(String executionId, String result, String notes) {
        return executionRepository.findById(executionId)
                .map(execution -> {
                    execution.setStatus("TERMINÉ");
                    execution.setEndTime(LocalDateTime.now());
                    execution.setResult(result);
                    execution.setNotes(notes);

                    // Mettre à jour les statistiques de l'utilisateur
                    updateUserStats(execution.getUserId(), "TERMINÉ");

                    return executionRepository.save(execution);
                });
    }

    public Optional<Execution> failExecution(String executionId, String error) {
        return executionRepository.findById(executionId)
                .map(execution -> {
                    execution.setStatus("ÉCHOUÉ");
                    execution.setEndTime(LocalDateTime.now());
                    execution.setNotes(error);

                    // Mettre à jour les statistiques de l'utilisateur
                    updateUserStats(execution.getUserId(), "ÉCHOUÉ");

                    return executionRepository.save(execution);
                });
    }

    public boolean deleteExecution(String id) {
        if (executionRepository.existsById(id)) {
            executionRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // Supprimer toutes les exécutions d'un utilisateur
    public void deleteExecutionsByUserId(String userId) {
        List<Execution> userExecutions = executionRepository.findByUserIdOrderByStartTimeDesc(userId);
        executionRepository.deleteAll(userExecutions);
    }

    // Méthode privée pour mettre à jour les statistiques de l'utilisateur
    private void updateUserStats(String userId, String executionStatus) {
        // Ne rien faire si userId est null ou vide
        if (userId == null || userId.isEmpty()) return;

        // Vérifier si l'utilisateur existe avant de mettre à jour ses statistiques
        Optional<User> userOptional = userRepository.findById(userId);
        if (!userOptional.isPresent()) {
            // Logger que l'utilisateur n'existe pas mais ne pas lever d'exception
            System.out.println("Utilisateur non trouvé avec l'ID: " + userId);
            return;
        }

        User user = userOptional.get();
        // Incrémenter le nombre total d'exécutions
        user.incrementTotalExecutions();

        // Mettre à jour le statut spécifique si nécessaire
        if (executionStatus != null) {
            if (executionStatus.equals("TERMINÉ")) {
                user.incrementSuccessfulExecutions();
            } else if (executionStatus.equals("ÉCHOUÉ")) {
                user.incrementFailedExecutions();
            }
        }

        // Sauvegarder les modifications
        userRepository.save(user);
    }
}
