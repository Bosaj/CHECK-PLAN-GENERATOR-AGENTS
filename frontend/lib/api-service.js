"use client"

import { getUser } from "./user-store";

const API_URL = "http://localhost:8081/api";

// Fonction utilitaire pour les requêtes API
async function fetchWithAuth(url, options = {}) {
  const user = getUser();
  
  if (!user || !user.token) {
    throw new Error("Non authentifié");
  }
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${user.token}`,
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("API Error:", {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      errorData
    });
    throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Services d'API pour les utilisateurs
export const userApi = {
  // Récupérer le profil de l'utilisateur courant
  getCurrentUser: async () => {
    return fetchWithAuth(`${API_URL}/users/me`);
  },
  
  // Mettre à jour le profil utilisateur
  updateProfile: async (profileData) => {
    return fetchWithAuth(`${API_URL}/users/profile`, {
      method: "PUT",
      body: JSON.stringify(profileData)
    });
  },
  
  // Changer le mot de passe
  changePassword: async (passwordData) => {
    return fetchWithAuth(`${API_URL}/users/password`, {
      method: "PUT",
      body: JSON.stringify(passwordData)
    });
  },
  
  // Supprimer le compte
  deleteAccount: async () => {
    return fetchWithAuth(`${API_URL}/users/account`, {
      method: "DELETE"
    });
  }
};

// Services d'API pour les plans de contrôle
export const planDeControleApi = {
  // Upload un plan de contrôle vers le backend Spring
  // @param {File} file - Le fichier à uploader
  // @param {string} reglementId - L'ID du règlement associé
  upload: async (file, reglementId) => {
    console.log('=== DÉBUT - planDeControleApi.upload ===');
    console.log('Fichier reçu:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    console.log('reglementId:', reglementId);
    
    try {
      const user = getUser();
      console.log('Utilisateur connecté:', user ? 'Oui' : 'Non');
      
      if (!user || !user.token) {
        throw new Error("Non authentifié");
      }
      
      if (!reglementId) {
        throw new Error("ID du règlement manquant");
      }
      
      const formData = new FormData();
      formData.append('file', file, file.name || 'plan-de-controle.xlsx');
      
      // Afficher le contenu de FormData pour le débogage
      console.log('Contenu de FormData:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      
      // URL du backend Spring sur le port 8081
      const SPRING_API_URL = process.env.NEXT_PUBLIC_SPRING_API_URL || 'http://localhost:8081/api';
      const uploadUrl = `${SPRING_API_URL}/plan-controle/upload/${reglementId}`;
      console.log('URL d\'upload:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          // Ne pas définir Content-Type pour FormData, laisser le navigateur le gérer
        },
        body: formData,
      });
      
      console.log('Réponse du serveur:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur lors de l\'upload:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(errorData.message || `Erreur lors du téléversement du plan de contrôle`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur dans uploadPlanDeControle:', error);
      throw error;
    }
  },
};

// Services d'API pour l'authentification
export const authApi = {
  // Connexion
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Login Error:", {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || "Échec de la connexion");
      }
      
      return response.json();
    } catch (error) {
      console.error("Login Exception:", error);
      throw error;
    }
  },
  
  // Inscription
  register: async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Register Error:", {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || "Échec de l'inscription");
      }
      
      return response.json();
    } catch (error) {
      console.error("Register Exception:", error);
      throw error;
    }
  }
};
