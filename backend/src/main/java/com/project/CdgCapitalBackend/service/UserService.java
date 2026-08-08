package com.project.CdgCapitalBackend.service; // NOSONAR

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
import java.time.ZoneId;
import java.util.NoSuchElementException;
import java.util.Optional;

@SuppressWarnings({"java:S120", "java:S112", "java:S5411"})
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
        if (authentication == null || authentication.getName() == null) {
            log.error("Aucune authentification trouvée dans le contexte de sécurité");
            throw new BadCredentialsException("Utilisateur non authentifié");
        }

        String email = authentication.getName();
        log.info("Tentative de récupération de l'utilisateur avec l'email: {}", email);

        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            log.error("Utilisateur avec l'email {} non trouvé dans la base de données", email);

            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName("Utilisateur");
            newUser.setPassword(passwordEncoder.encode("password"));
            newUser.setCreatedAt(LocalDateTime.now(ZoneId.systemDefault()));
            newUser.setUpdatedAt(LocalDateTime.now(ZoneId.systemDefault()));

            log.info("Création d'un nouvel utilisateur avec l'email: {}", email);
            return userRepository.save(newUser);
        }

        return userOptional.get();
    }

    public User getUserById(String id) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("ID utilisateur ne peut pas être nul");
        }
        log.info("Récupération de l'utilisateur avec l'ID: {}", id);
        return userRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Utilisateur avec l'ID {} non trouvé", id);
                    return new NoSuchElementException("Utilisateur non trouvé");
                });
    }

    public User getUserByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email ne peut pas être nul");
        }
        log.info("Récupération de l'utilisateur avec l'email: {}", email);
        return userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Utilisateur avec l'email {} non trouvé", email);
                    return new NoSuchElementException("Utilisateur non trouvé");
                });
    }

    public User updateUser(String id, User userUpdates) {
        if (userUpdates == null) {
            throw new IllegalArgumentException("Les données de mise à jour ne peuvent pas être nulles");
        }
        User user = getUserById(id);

        if (userUpdates.getName() != null) {
            user.setName(userUpdates.getName());
        }

        if (userUpdates.getProfileImage() != null) {
            user.setProfileImage(userUpdates.getProfileImage());
        }

        user.setUpdatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        log.info("Mise à jour de l'utilisateur avec l'ID: {}", id);
        return userRepository.save(user);
    }

    public User updateProfile(ProfileUpdateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("La requête de mise à jour ne peut pas être nulle");
        }
        User currentUser = getCurrentUser();
        log.info("Mise à jour du profil pour l'utilisateur: {}", currentUser.getEmail());

        if (request.getName() != null && !request.getName().isEmpty()) {
            currentUser.setName(request.getName());
            log.info("Nom mis à jour: {}", request.getName());
        }

        if (request.getEmail() != null && !request.getEmail().isEmpty()
                && !request.getEmail().equals(currentUser.getEmail())) {
            boolean emailExists = userRepository.existsByEmail(request.getEmail());
            if (emailExists) {
                log.error("Email déjà utilisé: {}", request.getEmail());
                throw new IllegalArgumentException("Cet email est déjà utilisé");
            }
            currentUser.setEmail(request.getEmail());
            log.info("Email mis à jour: {}", request.getEmail());
        }

        if (request.getProfileImage() != null) {
            currentUser.setProfileImage(request.getProfileImage());
            log.info("Image de profil mise à jour");
        }

        currentUser.setUpdatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        return userRepository.save(currentUser);
    }

    public void changePassword(PasswordChangeRequest request) {
        if (request == null || request.getCurrentPassword() == null || request.getNewPassword() == null || request.getConfirmPassword() == null) {
            throw new IllegalArgumentException("Tous les champs du mot de passe sont requis");
        }
        User currentUser = getCurrentUser();
        log.info("Changement de mot de passe pour l'utilisateur: {}", currentUser.getEmail());

        if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
            log.error("Mot de passe actuel incorrect pour l'utilisateur: {}", currentUser.getEmail());
            throw new BadCredentialsException("Le mot de passe actuel est incorrect");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            log.error("Le nouveau mot de passe et la confirmation ne correspondent pas");
            throw new IllegalArgumentException("Le nouveau mot de passe et la confirmation ne correspondent pas");
        }

        currentUser.setPassword(passwordEncoder.encode(request.getNewPassword()));
        currentUser.setUpdatedAt(LocalDateTime.now(ZoneId.systemDefault()));
        userRepository.save(currentUser);
        log.info("Mot de passe changé avec succès pour l'utilisateur: {}", currentUser.getEmail());
    }

    public void deleteCurrentUserAccount() {
        User currentUser = getCurrentUser();
        String userId = currentUser.getId();
        log.info("Suppression du compte pour l'utilisateur: {}", currentUser.getEmail());

        if (userId != null) {
            try {
                log.info("Suppression des agents pour l'utilisateur: {}", userId);
                agentService.deleteAgentsByUserId(userId);
            } catch (Exception e) {
                log.error("Erreur lors de la suppression des agents: {}", e.getMessage());
            }

            try {
                log.info("Suppression des exécutions pour l'utilisateur: {}", userId);
                executionService.deleteExecutionsByUserId(userId);
            } catch (Exception e) {
                log.error("Erreur lors de la suppression des exécutions: {}", e.getMessage());
            }
        }

        userRepository.delete(currentUser);
        log.info("Compte supprimé avec succès pour l'utilisateur: {}", currentUser.getEmail());
    }

    public User calculateUserStats(String userId) {
        User user = getUserById(userId);

        if (user != null) {
            var agents = agentService.getAgentsByUserId(userId);
            int totalAgents = agents != null ? agents.size() : 0;
            user.setTotalAgents(totalAgents);
            return userRepository.save(user);
        }
        return null;
    }
}
