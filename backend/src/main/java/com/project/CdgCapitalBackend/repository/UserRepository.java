package com.project.CdgCapitalBackend.repository;

import com.project.CdgCapitalBackend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    
    Optional<User> findByEmail(String email);
    
    Boolean existsByEmail(String email);
}
