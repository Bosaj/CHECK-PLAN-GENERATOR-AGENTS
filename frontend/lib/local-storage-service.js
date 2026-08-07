// Service pour la gestion des données en localStorage
// Ce service sera utilisé temporairement jusqu'à ce que l'API REST soit connectée

// Fonction utilitaire pour obtenir l'ID de l'utilisateur actuel
const getCurrentUserId = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
  }
  return null;
};

// Service pour le localStorage
const localStorageService = {
  // Agents
  getAgents: () => {
    try {
      const agentsStr = localStorage.getItem('agents');
      return agentsStr ? JSON.parse(agentsStr) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des agents:', error);
      return [];
    }
  },
  
  getAgentsByUserId: (userId) => {
    try {
      const agents = localStorageService.getAgents();
      return agents.filter(agent => agent.userId === userId);
    } catch (error) {
      console.error('Erreur lors de la récupération des agents par utilisateur:', error);
      return [];
    }
  },
  
  getAgentById: (id) => {
    try {
      const agents = localStorageService.getAgents();
      return agents.find(agent => agent.id === id) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'agent:', error);
      return null;
    }
  },
  
  saveAgent: (agent) => {
    try {
      const agents = localStorageService.getAgents();
      const existingIndex = agents.findIndex(a => a.id === agent.id);
      
      if (existingIndex >= 0) {
        agents[existingIndex] = agent;
      } else {
        agents.push(agent);
      }
      
      localStorage.setItem('agents', JSON.stringify(agents));
      return agent;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'agent:', error);
      return null;
    }
  },
  
  deleteAgent: (id) => {
    try {
      // Supprimer l'agent
      const agents = localStorageService.getAgents();
      const filteredAgents = agents.filter(agent => agent.id !== id);
      localStorage.setItem('agents', JSON.stringify(filteredAgents));
      
      // Supprimer toutes les exécutions associées à cet agent
      const executions = localStorageService.getExecutions();
      const filteredExecutions = executions.filter(execution => execution.agentId !== id);
      localStorage.setItem('executions', JSON.stringify(filteredExecutions));
      
      console.log(`Agent ${id} et son historique d'exécutions supprimés avec succès`);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'agent:', error);
      return false;
    }
  },
  
  // Exécutions
  getExecutions: () => {
    try {
      const executionsStr = localStorage.getItem('executions');
      return executionsStr ? JSON.parse(executionsStr) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des exécutions:', error);
      return [];
    }
  },
  
  getExecutionsByUserId: (userId) => {
    try {
      const executions = localStorageService.getExecutions();
      return executions.filter(execution => execution.userId === userId);
    } catch (error) {
      console.error('Erreur lors de la récupération des exécutions par utilisateur:', error);
      return [];
    }
  },
  
  getExecutionsByAgentId: (agentId) => {
    try {
      const executions = localStorageService.getExecutions();
      return executions.filter(execution => execution.agentId === agentId);
    } catch (error) {
      console.error('Erreur lors de la récupération des exécutions par agent:', error);
      return [];
    }
  },
  
  getExecutionById: (id) => {
    try {
      const executions = localStorageService.getExecutions();
      return executions.find(execution => execution.id === id) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'exécution:', error);
      return null;
    }
  },
  
  saveExecution: (execution) => {
    try {
      const executions = localStorageService.getExecutions();
      const existingIndex = executions.findIndex(e => e.id === execution.id);
      
      // Ajouter l'ID de l'utilisateur actuel si non défini
      if (!execution.userId) {
        execution.userId = getCurrentUserId();
      }
      
      if (existingIndex >= 0) {
        executions[existingIndex] = execution;
      } else {
        executions.push(execution);
      }
      
      localStorage.setItem('executions', JSON.stringify(executions));
      
      // Mettre à jour les statistiques de l'utilisateur
      if (execution.userId) {
        const user = localStorageService.getUserById(execution.userId);
        if (user) {
          user.totalExecutions = (user.totalExecutions || 0) + 1;
          if (execution.status === 'SUCCESS') {
            user.successfulExecutions = (user.successfulExecutions || 0) + 1;
          } else if (execution.status === 'FAILED') {
            user.failedExecutions = (user.failedExecutions || 0) + 1;
          }
          localStorageService.saveUser(user);
        }
      }
      
      return execution;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'exécution:', error);
      return null;
    }
  },
  
  deleteExecution: (id) => {
    try {
      const executions = localStorageService.getExecutions();
      const filteredExecutions = executions.filter(execution => execution.id !== id);
      localStorage.setItem('executions', JSON.stringify(filteredExecutions));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'exécution:', error);
      return false;
    }
  },
  
  // Utilisateurs
  getUsers: () => {
    try {
      const usersStr = localStorage.getItem('users');
      return usersStr ? JSON.parse(usersStr) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  },
  
  getUserById: (id) => {
    try {
      const users = localStorageService.getUsers();
      return users.find(user => user.id === id) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  },
  
  saveUser: (user) => {
    try {
      const users = localStorageService.getUsers();
      const existingIndex = users.findIndex(u => u.id === user.id);
      
      if (existingIndex >= 0) {
        users[existingIndex] = user;
      } else {
        // Initialiser les statistiques à 0 pour les nouveaux utilisateurs
        if (!user.totalAgents) user.totalAgents = 0;
        if (!user.totalExecutions) user.totalExecutions = 0;
        if (!user.successfulExecutions) user.successfulExecutions = 0;
        if (!user.failedExecutions) user.failedExecutions = 0;
        
        users.push(user);
      }
      
      localStorage.setItem('users', JSON.stringify(users));
      return user;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
      return null;
    }
  },
  
  updateUserStats: (userId, stats) => {
    try {
      const user = localStorageService.getUserById(userId);
      if (!user) return null;
      
      Object.assign(user, stats);
      return localStorageService.saveUser(user);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des statistiques utilisateur:', error);
      return null;
    }
  },
  
  deleteUser: (id) => {
    try {
      const users = localStorageService.getUsers();
      const updatedUsers = users.filter(user => user.id !== id);
      localStorage.setItem('users', JSON.stringify(updatedUsers));
      
      // Supprimer également les agents associés à cet utilisateur
      const agents = localStorageService.getAgents();
      const updatedAgents = agents.filter(agent => agent.userId !== id);
      localStorage.setItem('agents', JSON.stringify(updatedAgents));
      
      // Supprimer également les exécutions associées à cet utilisateur
      const executions = localStorageService.getExecutions();
      const updatedExecutions = executions.filter(execution => execution.userId !== id);
      localStorage.setItem('executions', JSON.stringify(updatedExecutions));
      
      // Supprimer également les résultats d'analyse associés à cet utilisateur
      const analysisResults = localStorageService.getAnalysisResults();
      const updatedAnalysisResults = analysisResults.filter(result => result.userId !== id);
      localStorage.setItem('analysis_results', JSON.stringify(updatedAnalysisResults));
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      return false;
    }
  },
  
  // Résultats d'analyse
  getAnalysisResults: () => {
    try {
      const resultsStr = localStorage.getItem('analysis_results');
      return resultsStr ? JSON.parse(resultsStr) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats d\'analyse:', error);
      return [];
    }
  },
  
  getAnalysisResultsByExecutionId: (executionId) => {
    try {
      const results = localStorageService.getAnalysisResults();
      return results.filter(result => result.executionId === executionId);
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats d\'analyse par exécution:', error);
      return [];
    }
  },
  
  getAnalysisResultsByAgentId: (agentId) => {
    try {
      const results = localStorageService.getAnalysisResults();
      return results.filter(result => result.agentId === agentId);
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats d\'analyse par agent:', error);
      return [];
    }
  },
  
  getAnalysisResultsByUserId: (userId) => {
    try {
      const results = localStorageService.getAnalysisResults();
      return results.filter(result => result.userId === userId);
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats d\'analyse par utilisateur:', error);
      return [];
    }
  },
  
  getAnalysisResultById: (id) => {
    try {
      const results = localStorageService.getAnalysisResults();
      return results.find(result => result.id === id) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération du résultat d\'analyse:', error);
      return null;
    }
  },
  
  saveAnalysisResult: (analysisResult) => {
    try {
      // Vérifier si l'ID est fourni
      if (!analysisResult.id) {
        analysisResult.id = `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Vérifier si la date de création est fournie
      if (!analysisResult.createdAt) {
        analysisResult.createdAt = new Date().toISOString();
      }
      
      // Récupérer les résultats existants
      const results = localStorageService.getAnalysisResults();
      
      // Vérifier si le résultat existe déjà
      const existingIndex = results.findIndex(result => result.id === analysisResult.id);
      
      if (existingIndex >= 0) {
        // Mettre à jour le résultat existant
        results[existingIndex] = { ...results[existingIndex], ...analysisResult };
      } else {
        // Ajouter le nouveau résultat
        results.push(analysisResult);
      }
      
      // Sauvegarder les résultats mis à jour
      localStorage.setItem('analysis_results', JSON.stringify(results));
      
      return analysisResult;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du résultat d\'analyse:', error);
      return null;
    }
  },
  
  deleteAnalysisResult: (id) => {
    try {
      const results = localStorageService.getAnalysisResults();
      const updatedResults = results.filter(result => result.id !== id);
      localStorage.setItem('analysis_results', JSON.stringify(updatedResults));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du résultat d\'analyse:', error);
      return false;
    }
  },
  
  deleteAnalysisResultsByExecutionId: (executionId) => {
    try {
      const results = localStorageService.getAnalysisResults();
      const updatedResults = results.filter(result => result.executionId !== executionId);
      localStorage.setItem('analysis_results', JSON.stringify(updatedResults));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression des résultats d\'analyse par exécution:', error);
      return false;
    }
  },
  
  deleteAnalysisResultsByAgentId: (agentId) => {
    try {
      const results = localStorageService.getAnalysisResults();
      const updatedResults = results.filter(result => result.agentId !== agentId);
      localStorage.setItem('analysis_results', JSON.stringify(updatedResults));
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression des résultats d\'analyse par agent:', error);
      return false;
    }
  }
};

export default localStorageService;
