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
    const getLocalStats = () => {
      try {
        const agents = JSON.parse(localStorage.getItem('agents') || '[]');
        const executions = JSON.parse(localStorage.getItem('executions') || '[]');
        const userAgents = userId ? agents.filter(a => a.userId === userId) : agents;
        const userExecutions = userId ? executions.filter(e => e.userId === userId) : executions;
        const successfulExecutions = userExecutions.filter(e => e.status === 'TERMINÉ' || e.status === 'SUCCESS').length;
        const failedExecutions = userExecutions.filter(e => e.status === 'ÉCHOUÉ' || e.status === 'FAILED').length;
        return {
          totalAgents: userAgents.length,
          totalExecutions: userExecutions.length,
          successfulExecutions,
          failedExecutions
        };
      } catch (e) {
        return { totalAgents: 0, totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0 };
      }
    };

    if (!userId) return getLocalStats();
    
    if (USE_LOCAL_STORAGE) {
      return getLocalStats();
    }
    
    try {
      let url = `${API_URL}/users/${userId}/stats`;
      if (forceRecalculate) {
        url += '?recalculate=true';
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 400);

      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return getLocalStats();
      }
      
      return await response.json();
    } catch (error) {
      return getLocalStats();
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
