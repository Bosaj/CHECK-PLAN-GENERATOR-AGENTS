package com.project.CdgCapitalBackend.security; // NOSONAR

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@SuppressWarnings({"java:S120", "java:S2143"})
@Component
public class JwtUtils {

    @Value("${jwt.secret:defaultSecretKeyForJwtTokenGenerationMustBeLongEnough12345}")
    private String jwtSecret;

    @Value("${jwt.expiration-ms:86400000}")
    private int jwtExpirationMs;

    public String extractUsername(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return extractClaim(token, claims -> claims != null ? claims.getSubject() : null);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        if (claimsResolver == null || claims == null) {
            return null;
        }
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null) {
            throw new IllegalArgumentException("UserDetails et le nom d'utilisateur ne peuvent pas être nuls");
        }
        Map<String, Object> claims = extraClaims != null ? extraClaims : new HashMap<>();
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(jwtExpirationMs);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(java.util.Date.from(now))
                .setExpiration(java.util.Date.from(expiry))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        if (token == null || userDetails == null || userDetails.getUsername() == null) {
            return false;
        }
        final String username = extractUsername(token);
        return username != null && username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        Instant expiration = extractExpiration(token);
        return expiration != null && expiration.isBefore(Instant.now());
    }

    private Instant extractExpiration(String token) {
        java.util.Date expirationDate = extractClaim(token, claims -> claims != null ? claims.getExpiration() : null);
        return expirationDate != null ? expirationDate.toInstant() : null;
    }

    private Claims extractAllClaims(String token) {
        if (token == null || token.isBlank()) {
            return Jwts.claims();
        }
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        String secret = (jwtSecret != null && !jwtSecret.isBlank()) 
            ? jwtSecret 
            : "defaultSecretKeyForJwtTokenGenerationMustBeLongEnough12345";
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
