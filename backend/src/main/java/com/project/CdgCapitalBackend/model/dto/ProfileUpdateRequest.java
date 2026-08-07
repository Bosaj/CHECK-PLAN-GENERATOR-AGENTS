package com.project.CdgCapitalBackend.model.dto;

import jakarta.validation.constraints.Email;
import lombok.Data;

@Data
public class ProfileUpdateRequest {
    private String name;
    
    @Email(message = "Email should be valid")
    private String email;
    
    private String profileImage;
}
