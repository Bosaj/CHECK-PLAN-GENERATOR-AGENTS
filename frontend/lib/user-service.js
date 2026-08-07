// Service pour la gestion des utilisateurs

const API_URL = 'http://localhost:8081/api';
const USE_LOCAL_STORAGE = false; // Mettre à false pour utiliser l'API au lieu du localStorage

// Fonction utilitaire pour obtenir les en-têtes
const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Fonction utilitaire pour obtenir l'ID de l'utilisateur actuel
const getCurrentUserId = () => {
  // Récupérer l'utilisateur depuis le localStorage avec la clé correcte
  const userStr = localStorage.getItem('opti_agent_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id;
    } catch (e) {
      console.error("Erreur lors du parsing de l'utilisateur:", e);
    }
  }
  return null;
};

// Fonctions pour le localStorage
const localStorageService = {
  getCurrentUser: () => {
    const userData = localStorage.getItem('currentUser');
    if (!userData) return null;
    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error('Erreur lors de la lecture des données utilisateur:', error);
      return null;
    }
  },
  
  getUserById: (id) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    return users.find(user => user.id === id);
  },
  
  updateUserStats: (userId, stats) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { ...user, ...stats };
      }
      return user;
    });
    
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    // Mettre à jour l'utilisateur courant si nécessaire
    const currentUser = localStorageService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...stats }));
    }
    
    return updatedUsers.find(user => user.id === userId);
  }
};

export const userService = {
  // Récupérer l'utilisateur courant
  getCurrentUser: async () => {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getCurrentUser();
    }
    
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        console.error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur courant:', error);
      return null;
    }
  },
  
  // Récupérer un utilisateur par son ID
  getUserById: async (id) => {
    if (!id) return null;
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getUserById(id);
    }
    
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        console.error(`Erreur HTTP: ${response.status} ${response.statusText}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  },
  
  // Récupérer les statistiques d'un utilisateur
  getUserStats: async (userId = getCurrentUserId(), forceRecalculate = false) => {
    if (!userId) return null;
    
    if (USE_LOCAL_STORAGE) {
      const user = localStorageService.getUserById(userId);
      if (!user) return null;
      
      return {
        totalAgents: user.totalAgents || 0,
        totalExecutions: user.totalExecutions || 0,
        successfulExecutions: user.successfulExecutions || 0,
        failedExecutions: user.failedExecutions || 0
      };
    }
    
    try {
      // Construire l'URL avec le paramètre de recalcul si nécessaire
      let url = `${API_URL}/users/${userId}/stats`;
      if (forceRecalculate) {
        url += '?recalculate=true';
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        console.warn(`Erreur HTTP: ${response.status} ${response.statusText}`);
        // Retourner un objet de statistiques vide en cas d'erreur
        return {
          totalAgents: 0,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0
        };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques utilisateur:', error);
      // Retourner un objet de statistiques vide en cas d'erreur
      return {
        totalAgents: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0
      };
    }
  },
  
  // Mettre à jour les statistiques d'un utilisateur (pour le mode localStorage)
  updateUserStats: async (userId, stats) => {
    if (!userId || !stats) return null;
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.updateUserStats(userId, stats);
    }
    
    // Cette fonction n'est pas nécessaire en mode API car les statistiques sont mises à jour par le backend
    return null;
  },
  
  // Définir l'utilisateur courant (pour la simulation de connexion)
  setCurrentUser: (user) => {
    if (!user || !user.id) return;
    
    localStorage.setItem('userId', user.id);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
};
