package com.project.CdgCapitalBackend.repository;

import com.project.CdgCapitalBackend.model.Execution;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExecutionRepository extends MongoRepository<Execution, String> {
    List<Execution> findByAgentId(String agentId);
    List<Execution> findByAgentIdOrderByStartTimeDesc(String agentId);
    List<Execution> findByUserId(String userId);
    List<Execution> findByUserIdOrderByStartTimeDesc(String userId);
    long countByAgentId(String agentId); // total exécutions liées [12]
    long countByAgentIdAndStatus(String agentId, String status); // succès/échecs [12]
    long deleteByAgentId(String agentId);
}
