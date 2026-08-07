package com.project.CdgCapitalBackend.service;


import com.project.CdgCapitalBackend.model.User;
import com.project.CdgCapitalBackend.model.dto.PasswordChangeRequest;
import com.project.CdgCapitalBackend.model.dto.ProfileUpdateRequest;
import com.project.CdgCapitalBackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AgentService agentService;
    private final ExecutionService executionService;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            log.error("Aucune authentification trouvée dans le contexte de sécurité");
            throw new RuntimeException("Utilisateur non authentifié");
        }

        String email = authentication.getName();
        log.info("Tentative de récupération de l'utilisateur avec l'email: {}", email);

        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            log.error("Utilisateur avec l'email {} non trouvé dans la base de données", email);

            // Si l'utilisateur n'existe pas, créons-le (uniquement pour la démo)
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName("Utilisateur");
            newUser.setPassword(passwordEncoder.encode("password"));
            newUser.setCreatedAt(LocalDateTime.now());
            newUser.setUpdatedAt(LocalDateTime.now());

            log.info("Création d'un nouvel utilisateur avec l'email: {}", email);
            return userRepository.save(newUser);
        }

        return userOptional.get();
    }

    public User getUserById(String id) {
        log.info("Récupération de l'utilisateur avec l'ID: {}", id);
        return userRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Utilisateur avec l'ID {} non trouvé", id);
                    return new RuntimeException("Utilisateur non trouvé");
                });
    }

    public User getUserByEmail(String email) {
        log.info("Récupération de l'utilisateur avec l'email: {}", email);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Utilisateur avec l'email {} non trouvé", email);
                    return new RuntimeException("Utilisateur non trouvé");
                });
    }

    public User updateUser(String id, User userUpdates) {
        User user = getUserById(id);

        if (userUpdates.getName() != null) {
            user.setName(userUpdates.getName());
        }

        if (userUpdates.getProfileImage() != null) {
            user.setProfileImage(userUpdates.getProfileImage());
        }

        user.setUpdatedAt(LocalDateTime.now());
        log.info("Mise à jour de l'utilisateur avec l'ID: {}", id);
        return userRepository.save(user);
    }

    public User updateProfile(ProfileUpdateRequest request) {
        User currentUser = getCurrentUser();
        log.info("Mise à jour du profil pour l'utilisateur: {}", currentUser.getEmail());

        if (request.getName() != null && !request.getName().isEmpty()) {
            currentUser.setName(request.getName());
            log.info("Nom mis à jour: {}", request.getName());
        }

        if (request.getEmail() != null && !request.getEmail().isEmpty()
                && !request.getEmail().equals(currentUser.getEmail())) {
            // Vérifier si l'email est déjà utilisé
            if (userRepository.existsByEmail(request.getEmail())) {
                log.error("Email déjà utilisé: {}", request.getEmail());
                throw new RuntimeException("Cet email est déjà utilisé");
            }
            currentUser.setEmail(request.getEmail());
            log.info("Email mis à jour: {}", request.getEmail());
        }

        if (request.getProfileImage() != null) {
            currentUser.setProfileImage(request.getProfileImage());
            log.info("Image de profil mise à jour");
        }

        currentUser.setUpdatedAt(LocalDateTime.now());
        return userRepository.save(currentUser);
    }

    public void changePassword(PasswordChangeRequest request) {
        User currentUser = getCurrentUser();
        log.info("Changement de mot de passe pour l'utilisateur: {}", currentUser.getEmail());

        // Vérifier que le mot de passe actuel est correct
        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            log.error("Mot de passe actuel incorrect pour l'utilisateur: {}", currentUser.getEmail());
            throw new BadCredentialsException("Le mot de passe actuel est incorrect");
        }

        // Vérifier que le nouveau mot de passe et la confirmation correspondent
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            log.error("Le nouveau mot de passe et la confirmation ne correspondent pas");
            throw new RuntimeException("Le nouveau mot de passe et la confirmation ne correspondent pas");
        }

        // Mettre à jour le mot de passe
        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        currentUser.setUpdatedAt(LocalDateTime.now());
        userRepository.save(currentUser);
        log.info("Mot de passe changé avec succès pour l'utilisateur: {}", currentUser.getEmail());
    }

    public void deleteCurrentUserAccount() {
        User currentUser = getCurrentUser();
        String userId = currentUser.getId();
        log.info("Suppression du compte pour l'utilisateur: {}", currentUser.getEmail());

        // Supprimer tous les agents de l'utilisateur
        try {
            log.info("Suppression des agents pour l'utilisateur: {}", userId);
            agentService.deleteAgentsByUserId(userId);
        } catch (Exception e) {
            log.error("Erreur lors de la suppression des agents: {}", e.getMessage());
        }

        // Supprimer toutes les exécutions de l'utilisateur
        try {
            log.info("Suppression des exécutions pour l'utilisateur: {}", userId);
            executionService.deleteExecutionsByUserId(userId);
        } catch (Exception e) {
            log.error("Erreur lors de la suppression des exécutions: {}", e.getMessage());
        }

        // Supprimer l'utilisateur
        userRepository.delete(currentUser);
        log.info("Compte supprimé avec succès pour l'utilisateur: {}", currentUser.getEmail());
    }

    // Méthode pour calculer les statistiques d'un utilisateur
    public User calculateUserStats(String userId) {
        User user = getUserById(userId);

        // Calculer le nombre total d'agents
        int totalAgents = agentService.getAgentsByUserId(userId).size();
        user.setTotalAgents(totalAgents);

        // Pour l'instant, nous ne pouvons pas calculer les exécutions car elles sont stockées dans localStorage
        // Mais nous pouvons au moins mettre à jour le nombre d'agents

        // Sauvegarder les statistiques mises à jour
        return userRepository.save(user);
    }
}
