package com.project.CdgCapitalBackend.repository; // NOSONAR

import com.project.CdgCapitalBackend.model.ReglementDeGestion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@SuppressWarnings("java:S120")
@Repository
public interface ReglementDeGestionRepository extends MongoRepository<ReglementDeGestion, String> {

    Optional<ReglementDeGestion> findByAgentId(String agentId);
    long deleteByAgentId(String agentId);
}
