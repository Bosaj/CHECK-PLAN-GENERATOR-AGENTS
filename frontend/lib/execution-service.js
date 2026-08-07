// Service pour la gestion des exécutions

// Importer le service d'agent pour récupérer les informations de l'agent
import { agentService } from './agent-service';
// Importer le service localStorage
import localStorageService from './local-storage-service';

const API_URL = 'http://localhost:8081/api';
const USE_LOCAL_STORAGE = false; // Mettre à false pour utiliser l'API backend au lieu du localStorage

// Fonction utilitaire pour obtenir les en-têtes d'authentification
const getAuthHeaders = () => {
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
  try {
    const userStr = localStorage.getItem('opti_agent_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'ID utilisateur:', error);
  }
  return null;
};

// Service d'exécution
const _formatAnalysisResults = (analysisResults) => {
  let formattedResults = {
    fraude: "Non",
    "Nom du commerce": "inconnu",
    "Date de la facture": "",
    "Montant total": 0,
    "Ville": "",
    "Adresse complète": "",
    raison: []
  };

  if (!analysisResults || typeof analysisResults !== 'object') {
    formattedResults.timestamp = new Date().toISOString();
    return formattedResults;
  }

  if (analysisResults.fraude !== undefined) {
    formattedResults = { ...analysisResults };
  } else if (Array.isArray(analysisResults) && analysisResults.length > 0) {
    formattedResults = { ...analysisResults[0] };
  } else if (Array.isArray(analysisResults.résultats) && analysisResults.résultats.length > 0) {
    formattedResults = { ...analysisResults.résultats[0] };
  } else {
    Object.keys(analysisResults).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('fraude')) formattedResults.fraude = analysisResults[key];
      if (lowerKey.includes('commerce')) formattedResults["Nom du commerce"] = analysisResults[key];
      if (lowerKey.includes('date')) formattedResults["Date de la facture"] = analysisResults[key];
      if (lowerKey.includes('montant')) formattedResults["Montant total"] = analysisResults[key];
      if (lowerKey.includes('ville')) formattedResults.Ville = analysisResults[key];
      if (lowerKey.includes('adresse')) formattedResults["Adresse complète"] = analysisResults[key];
      if (lowerKey.includes('raison') && Array.isArray(analysisResults[key])) {
        formattedResults.raison = analysisResults[key];
      }
    });
  }

  formattedResults.timestamp = new Date().toISOString();
  return formattedResults;
};

const executionService = {
  // Récupérer toutes les exécutions
  getAllExecutions: async () => {
    const cachedData = localStorage.getItem('opti_agent_executions_cache');
    const cacheTimestamp = localStorage.getItem('opti_agent_executions_cache_timestamp');
    const now = Date.now();
    
    if (cachedData && cacheTimestamp && (now - Number.parseInt(cacheTimestamp, 10)) < 300000) {
      try {
        const parsedData = JSON.parse(cachedData);
        return parsedData;
      } catch (e) {
        console.error('Erreur lors de la lecture du cache:', e);
      }
    }
    
    if (USE_LOCAL_STORAGE) {
      const executions = localStorageService.getExecutions();
      localStorage.setItem('opti_agent_executions_cache', JSON.stringify(executions));
      localStorage.setItem('opti_agent_executions_cache_timestamp', now.toString());
      return executions;
    }
    
    try {
      const response = await fetch(`${API_URL}/executions`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        return localStorageService.getExecutions();
      }
      
      const data = await response.json();
      localStorage.setItem('opti_agent_executions_cache', JSON.stringify(data));
      localStorage.setItem('opti_agent_executions_cache_timestamp', now.toString());
      return data;
    } catch (error) {
      console.warn("Backend 8081 indisponible for getAllExecutions, using localStorage fallback:", error.message);
      return localStorageService.getExecutions();
    }
  },
  
  getExecutionsByUserId: async (userId = getCurrentUserId()) => {
    if (!userId) return localStorageService.getExecutions();
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getExecutionsByUserId(userId);
    }
    
    try {
      const response = await fetch(`${API_URL}/executions/user/${userId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        return localStorageService.getExecutionsByUserId(userId);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("Backend 8081 indisponible for getExecutionsByUserId, using localStorage fallback:", error.message);
      return localStorageService.getExecutionsByUserId(userId);
    }
  },
  
  // Récupérer les exécutions d'un agent
  getExecutionsByAgentId: async (agentId) => {
    if (!agentId) {
      console.error('ID d\'agent non fourni');
      return [];
    }
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getExecutionsByAgentId(agentId);
    }
    
    try {
      const response = await fetch(`${API_URL}/executions/agent/${agentId}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.warn(`Erreur HTTP: ${response.status} ${response.statusText}`);
        // Utiliser le localStorage comme solution de secours
        return localStorageService.getExecutionsByAgentId(agentId);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des exécutions de l\'agent:', error);
      // Utiliser le localStorage comme solution de secours
      return localStorageService.getExecutionsByAgentId(agentId);
    }
  },
  
  // Récupérer une exécution par son ID
  getExecutionById: async (id) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getExecutionById(id);
    }
    
    try {
      const response = await fetch(`${API_URL}/executions/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.warn(`Erreur HTTP: ${response.status} ${response.statusText}`);
        // Utiliser le localStorage comme solution de secours
        return localStorageService.getExecutionById(id);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'exécution:', error);
      // Utiliser le localStorage comme solution de secours
      return localStorageService.getExecutionById(id);
    }
  },
  
  // Démarrer une nouvelle exécution
  startExecution: async (agentId, userId = getCurrentUserId()) => {
    if (!agentId) {
      console.error('ID d\'agent non fourni');
      return null;
    }
    
    // Récupérer l'agent pour avoir ses informations
    const agent = await agentService.getAgentById(agentId);
    if (!agent) {
      console.error('Agent non trouvé');
      return null;
    }

    const localExecution = {
      id: Date.now().toString(),
      agentId,
      userId: userId || getCurrentUserId(),
      status: 'RUNNING',
      startTime: new Date().toISOString(),
      endTime: null,
      results: {}
    };
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.saveExecution(localExecution);
    }
    
    try {
      // Utiliser l'endpoint correct du backend Spring Boot
      const url = new URL(`${API_URL}/executions/start/${agentId}`);
      if (userId) {
        url.searchParams.append('userId', userId);
      }
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        console.warn(`Erreur HTTP: ${response.status} ${response.statusText}, fallback local`);
        return localStorageService.saveExecution(localExecution);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("Backend 8081 indisponible for startExecution, using localStorage fallback:", error.message);
      return localStorageService.saveExecution(localExecution);
    }
  },
  
  completeExecution: async (id, message = 'Exécution terminée avec succès', notes = '') => {
    if (!id) return null;
    return await executionService.updateExecutionStatus(id, 'TERMINÉ', { message, notes });
  },

  // Mettre à jour le statut d'une exécution
  updateExecutionStatus: async (id, status, results = {}) => {
    if (!id) {
      console.error('ID d\'exécution non fourni');
      return null;
    }
    
    if (USE_LOCAL_STORAGE) {
      const execution = localStorageService.getExecutionById(id);
      if (!execution) return null;
      
      execution.status = status;
      execution.endTime = new Date().toISOString();
      execution.results = { ...execution.results, ...results };
      
      return localStorageService.saveExecution(execution);
    }
    
    try {
      const execution = await executionService.getExecutionById(id);
      if (!execution) return null;
      
      execution.status = status;
      execution.endTime = new Date().toISOString();
      execution.results = { ...execution.results, ...results };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      
      const response = await fetch(`${API_URL}/executions/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(execution),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return localStorageService.saveExecution(execution);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("Backend 8081 indisponible for updateExecutionStatus, using localStorage fallback:", error.message);
      try {
        const execution = localStorageService.getExecutionById(id) || { id, status, endTime: new Date().toISOString(), results };
        execution.status = status;
        execution.endTime = new Date().toISOString();
        execution.results = { ...execution.results, ...results };
        return localStorageService.saveExecution(execution);
      } catch (e) {
        return null;
      }
    }
  },
  
  // Enregistrer les résultats d'analyse d'une exécution
  saveAnalysisResults: async (id, analysisResults) => {
    if (!id) {
      console.error('ID d\'exécution non fourni');
      return null;
    }
    
    if (!analysisResults) {
      console.error('Résultats d\'analyse non fournis');
      return null;
    }
    
    console.log('Enregistrement des résultats d\'analyse pour l\'exécution:', id);
    console.log('Résultats:', analysisResults);
    
    // Si nous utilisons le localStorage, mettre à jour l'exécution localement
    if (USE_LOCAL_STORAGE) {
      const execution = localStorageService.getExecutionById(id);
      if (!execution) {
        console.error('Exécution non trouvée dans le localStorage');
        return null;
      }
      
      execution.status = 'TERMINÉ';
      execution.endTime = new Date().toISOString();
      
      // Stocker les résultats d'analyse dans une collection séparée dans le localStorage
      const analysisResult = {
        id: `analysis_${Date.now()}`,
        executionId: id,
        agentId: execution.agentId,
        userId: execution.userId,
        createdAt: new Date().toISOString(),
        results: analysisResults
      };
      
      // Sauvegarder le résultat d'analyse dans le localStorage
      localStorageService.saveAnalysisResult(analysisResult);
      
      // Mettre à jour l'exécution
      return localStorageService.saveExecution(execution);
    }
    
    // Sinon, envoyer les résultats au backend
    try {
      // Envoyer les résultats au format JSON via l'endpoint complete execution
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/executions/${id}/complete`;
      console.log('Envoi des résultats au backend:', apiUrl);
      console.log('Résultats envoyés:', JSON.stringify(analysisResults, null, 2));
      
      const formattedResults = _formatAnalysisResults(analysisResults);
      console.log('Résultats formatés:', JSON.stringify(formattedResults, null, 2));
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('opti_agent_token') || ''}`
        },
        body: JSON.stringify({
          result: JSON.stringify(formattedResults),
          notes: `Analyse terminée le ${new Date().toLocaleString()}`
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur lors de l'enregistrement des résultats: ${response.status} - ${errorText}`);
        
        // Utiliser le localStorage comme solution de secours
        const execution = localStorageService.getExecutionById(id);
        if (execution) {
          execution.status = 'TERMINÉ';
          execution.endTime = new Date().toISOString();
          localStorageService.saveExecution(execution);
          
          // Stocker les résultats d'analyse dans une collection séparée dans le localStorage
          const analysisResult = {
            id: `analysis_${Date.now()}`,
            executionId: id,
            agentId: execution.agentId,
            userId: execution.userId,
            createdAt: new Date().toISOString(),
            results: analysisResults
          };
          
          // Sauvegarder le résultat d'analyse dans le localStorage
          return localStorageService.saveAnalysisResult(analysisResult);
        }
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des résultats d\'analyse:', error);
      
      // Essayer de mettre à jour en localStorage comme solution de secours
      try {
        const execution = localStorageService.getExecutionById(id);
        if (execution) {
          execution.status = 'TERMINÉ';
          execution.endTime = new Date().toISOString();
          localStorageService.saveExecution(execution);
          
          // Stocker les résultats d'analyse dans une collection séparée dans le localStorage
          const analysisResult = {
            id: `analysis_${Date.now()}`,
            executionId: id,
            agentId: execution.agentId,
            userId: execution.userId,
            createdAt: new Date().toISOString(),
            results: analysisResults
          };
          
          // Sauvegarder le résultat d'analyse dans le localStorage
          return localStorageService.saveAnalysisResult(analysisResult);
        }
        return null;
      } catch (e) {
        console.error('Erreur lors de la mise à jour en localStorage:', e);
        return null;
      }
    }
  },
  
  // Marquer une exécution comme échouée
  failExecution: async (id, errorMessage) => {
    if (!id) {
      console.error('ID d\'exécution non fourni');
      return null;
    }
    
    console.log('Marquage de l\'exécution comme échouée:', id);
    console.log('Message d\'erreur:', errorMessage);
    
    // Si nous utilisons le localStorage, mettre à jour l'exécution localement
    if (USE_LOCAL_STORAGE) {
      const execution = localStorageService.getExecutionById(id);
      if (!execution) {
        console.error('Exécution non trouvée dans le localStorage');
        return null;
      }
      
      execution.status = 'ÉCHOUÉ';
      execution.endTime = new Date().toISOString();
      execution.notes = errorMessage || 'Erreur inconnue';
      
      return localStorageService.saveExecution(execution);
    }
    
    // Sinon, envoyer la mise à jour au backend
    try {
      // Utiliser l'endpoint correct pour marquer une exécution comme échouée
      const apiUrl = `${API_URL}/executions/${id}/fail`;
      console.log('Envoi de la mise à jour au backend:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ error: errorMessage || 'Erreur inconnue' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur lors de la mise à jour de l'exécution: ${response.status} - ${errorText}`);
        
        // Essayer l'ancien endpoint comme solution de secours
        try {
          const oldApiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/executions/${id}/fail`;
          console.log('Tentative avec l\'ancien endpoint:', oldApiUrl);
          
          const oldResponse = await fetch(oldApiUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('opti_agent_token') || ''}`
            },
            body: JSON.stringify({ error: errorMessage || 'Erreur inconnue' })
          });
          
          if (oldResponse.ok) {
            return await oldResponse.json();
          }
        } catch (oldError) {
          console.error('Erreur avec l\'ancien endpoint:', oldError);
        }
        
        // Utiliser le localStorage comme solution de secours finale
        const execution = localStorageService.getExecutionById(id) || {
          id,
          status: 'ÉCHOUÉ',
          endTime: new Date().toISOString(),
          notes: errorMessage || 'Erreur inconnue'
        };
        
        return localStorageService.saveExecution(execution);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'exécution:', error);
      
      // Essayer de mettre à jour en localStorage comme solution de secours
      try {
        const execution = localStorageService.getExecutionById(id) || {
          id,
          status: 'ÉCHOUÉ',
          endTime: new Date().toISOString(),
          notes: errorMessage || 'Erreur inconnue'
        };
        
        return localStorageService.saveExecution(execution);
      } catch (e) {
        console.error('Erreur lors de la mise à jour en localStorage:', e);
        return null;
      }
    }
  },

  // Marquer une exécution comme terminée
  completeExecution: async (id, result, notes) => {
    if (!id) {
      console.error('ID d\'exécution non fourni');
      return null;
    }

    // Vérifier si on utilise le localStorage
    if (USE_LOCAL_STORAGE) {
      const execution = localStorageService.getExecutionById(id);
      if (execution) {
        execution.status = 'TERMINÉ';
        execution.endTime = new Date().toISOString();
        execution.result = result || 'Exécution terminée';
        execution.notes = notes || '';
        
        return localStorageService.saveExecution(execution);
      }
    }
    
    // Sinon, envoyer la mise à jour au backend
    try {
      const apiUrl = `${API_URL}/executions/${id}/complete`;
      console.log('Finalisation de l\'exécution:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          result: result || 'Exécution terminée',
          notes: notes || ''
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur lors de la finalisation de l'exécution: ${response.status} - ${errorText}`);
        
        // Utiliser le localStorage comme solution de secours
        const execution = localStorageService.getExecutionById(id);
        if (execution) {
          execution.status = 'TERMINÉ';
          execution.endTime = new Date().toISOString();
          execution.result = result || 'Exécution terminée';
          execution.notes = notes || '';
          
          return localStorageService.saveExecution(execution);
        }
        return null;
      }
      
      const updatedExecution = await response.json();
      console.log('Exécution finalisée avec succès:', updatedExecution);
      return updatedExecution;
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'exécution:', error);
      
      // Utiliser le localStorage comme solution de secours
      try {
        const execution = localStorageService.getExecutionById(id);
        if (execution) {
          execution.status = 'TERMINÉ';
          execution.endTime = new Date().toISOString();
          execution.result = result || 'Exécution terminée';
          execution.notes = notes || '';
          
          return localStorageService.saveExecution(execution);
        }
      } catch (e) {
        console.error('Erreur lors de la mise à jour en localStorage:', e);
        return null;
      }
    }
  },

  // Supprimer une exécution
  deleteExecution: async (id) => {
    if (!id) {
      console.error('ID d\'exécution non fourni');
      return false;
    }

    if (USE_LOCAL_STORAGE) {
      return localStorageService.deleteExecution(id);
    }

    try {
      const response = await fetch(`${API_URL}/executions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        console.error(`Erreur lors de la suppression: ${response.status} ${response.statusText}`);
        return false;
      }

      console.log('Exécution supprimée avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'exécution:', error);
      return false;
    }
  }
};

export { executionService };
