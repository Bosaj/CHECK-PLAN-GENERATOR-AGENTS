package com.project.CdgCapitalBackend.repository;

import com.project.CdgCapitalBackend.model.ReglementDeGestion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ReglementDeGestionRepository extends MongoRepository<ReglementDeGestion, String> {

    // Find by name (if you want to allow searching)
    Optional<ReglementDeGestion> findByAgentId(String agentId);
    long deleteByAgentId(String agentId);
}
