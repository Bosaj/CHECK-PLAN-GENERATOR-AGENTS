// Agent Service for API calls

const API_URL = 'http://localhost:8081/api';
const USE_LOCAL_STORAGE = false; // Utiliser l'API pour enregistrer dans la base de données MongoDB

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
  getAllAgents: () => {
    return JSON.parse(localStorage.getItem('agents') || '[]');
  },
  
  getAgentsByUserId: (userId) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    return agents.filter(agent => agent.userId === userId);
  },
  
  getAgentById: (id) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    return agents.find(agent => agent.id === id);
  },
  
  createAgent: (agentData) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    const newAgent = {
      id: Date.now().toString(),
      name: agentData.name,
      role: agentData.role,
      userId: agentData.userId,
      createdAt: new Date().toISOString(),
      invoices: []
    };
    
    const updatedAgents = [newAgent, ...agents];
    localStorage.setItem('agents', JSON.stringify(updatedAgents));
    
    return newAgent;
  },
  
  updateAgent: (id, agentData) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    const updatedAgents = agents.map(agent => {
      if (agent.id === id) {
        return { ...agent, name: agentData.name, role: agentData.role };
      }
      return agent;
    });
    
    localStorage.setItem('agents', JSON.stringify(updatedAgents));
    return updatedAgents.find(agent => agent.id === id);
  },
  
  deleteAgent: (id) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    const updatedAgents = agents.filter(agent => agent.id !== id);
    localStorage.setItem('agents', JSON.stringify(updatedAgents));
    return true;
  },
  
  getInvoicesByAgentId: (agentId) => {
    const agent = localStorageService.getAgentById(agentId);
    return agent ? agent.invoices || [] : [];
  },
  
  addInvoiceToAgent: (agentId, invoiceData) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    const updatedAgents = agents.map(agent => {
      if (agent.id === agentId) {
        const newInvoice = {
          id: Date.now().toString(),
          invoiceNumber: invoiceData.invoiceNumber,
          clientName: invoiceData.clientName,
          amount: invoiceData.amount,
          issueDate: new Date().toISOString(),
          dueDate: invoiceData.dueDate,
          status: 'PENDING',
          description: invoiceData.description
        };
        
        const invoices = agent.invoices || [];
        return { ...agent, invoices: [newInvoice, ...invoices] };
      }
      return agent;
    });
    
    localStorage.setItem('agents', JSON.stringify(updatedAgents));
    return updatedAgents.find(agent => agent.id === agentId);
  },
  
  deleteInvoice: (agentId, invoiceId) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    const updatedAgents = agents.map(agent => {
      if (agent.id === agentId) {
        const invoices = agent.invoices || [];
        return { ...agent, invoices: invoices.filter(invoice => invoice.id !== invoiceId) };
      }
      return agent;
    });
    
    localStorage.setItem('agents', JSON.stringify(updatedAgents));
    return true;
  },
  
  addMissionOrderToAgent: (agentId, missionOrderData) => {
    const agents = JSON.parse(localStorage.getItem('agents') || '[]');
    const agentIndex = agents.findIndex(agent => agent.id === agentId);
    
    if (agentIndex === -1) {
      console.error('Agent non trouvé');
      return null;
    }
    
    // Créer un nouvel ordre de mission
    const newMissionOrder = {
      id: Date.now().toString(),
      missionName: missionOrderData.missionName,
      clientName: missionOrderData.clientName,
      description: missionOrderData.description,
      fileName: missionOrderData.fileName,
      fileType: missionOrderData.fileType,
      uploadDate: new Date().toISOString(),
      agentId: agentId
    };
    
    // Stocker l'ordre de mission dans le localStorage
    localStorage.setItem(`missionOrder_${agentId}`, JSON.stringify(newMissionOrder));
    
    return newMissionOrder;
  },
  
  getMissionOrderByAgentId: (agentId) => {
    const missionOrderStr = localStorage.getItem(`missionOrder_${agentId}`);
    return missionOrderStr ? JSON.parse(missionOrderStr) : null;
  },
  
  deleteMissionOrder: (agentId) => {
    localStorage.removeItem(`missionOrder_${agentId}`);
    return true;
  }
};

export const agentService = {
  // Agent operations
  getAllAgents: async () => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getAllAgents();
    }
    
    try {
      const response = await fetch(`${API_URL}/agents`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des agents');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur:', error);
      return [];
    }
  },
  
  getAgentsByUserId: async (userId = getCurrentUserId()) => {
    if (!userId) return [];
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getAgentsByUserId(userId);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents/user/${userId}`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        console.warn(`Erreur HTTP: ${response.status} ${response.statusText}`);
        return [];
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération des agents:', error);
      return [];
    }
  },
  
  getAgentById: async (id) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getAgentById(id);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents/${id}`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'agent');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur:', error);
      return null;
    }
  },
  
  createAgent: async (agentData) => {
    // Ajouter l'ID de l'utilisateur actuel si disponible
    const userId = getCurrentUserId();
    const agentWithUserId = userId ? { ...agentData, userId } : agentData;
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.createAgent(agentWithUserId);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(agentWithUserId)
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de l\'agent');
      }
      
      // Récupérer les données de l'agent créé
      const createdAgent = await response.json();
      return createdAgent;
    } catch (error) {
      console.error('Erreur:', error);
      return null;
    }
  },
  
  updateAgent: async (id, agentData) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.updateAgent(id, agentData);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(agentData)
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'agent');
      }
      
      // Après la mise à jour réussie, forcer la mise à jour des statistiques utilisateur
      try {
        // Récupérer l'ID de l'utilisateur actuel
        const userId = getCurrentUserId();
        if (userId) {
          // Appeler directement l'API pour forcer le recalcul des statistiques
          await fetch(`${API_URL}/users/${userId}/stats?recalculate=true`, {
            method: 'GET',
            headers: getHeaders()
          });
          console.log('Statistiques utilisateur mises à jour après modification d\'agent');
        }
      } catch (statsError) {
        console.error('Erreur lors de la mise à jour des statistiques:', statsError);
        // Ne pas échouer l'opération principale si la mise à jour des statistiques échoue
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur:', error);
      return null;
    }
  },
  
  deleteAgent: async (id) => {
    if (!id) {
      console.error('ID d\'agent non fourni');
      return false;
    }
    
    try {
      // Utiliser l'API pour supprimer l'agent
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/agents/${id}`;
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la suppression de l'agent: ${response.status}`);
      }
      
      // Mettre à jour les statistiques de l'utilisateur
      try {
        // Récupérer l'ID de l'utilisateur actuel
        const userStr = localStorage.getItem('opti_agent_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          // Rafraîchir les statistiques utilisateur en appelant directement l'API
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}/api/users/${user.id}/stats?recalculate=true`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
          });
        }
      } catch (e) {
        console.error("Erreur lors de la mise à jour des statistiques:", e);
      }
      
      // Vider le cache local des exécutions pour forcer un rafraîchissement
      // lors de la prochaine visite de la page d'historique
      localStorage.removeItem('opti_agent_executions_cache');
      
      return true;
    } catch (error) {
      console.error('Erreur:', error);
      return false;
    }
  },
  
  // Invoice operations
  getInvoicesByAgentId: async (agentId) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getInvoicesByAgentId(agentId);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents/${agentId}/invoices`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des factures');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur:', error);
      return [];
    }
  },
  
  addInvoiceToAgent: async (agentId, invoiceData) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.addInvoiceToAgent(agentId, invoiceData);
    }
    
    try {
      // Ajouter des logs pour déboguer
      console.log("Ajout de la facture à l'agent:", agentId);
      console.log("Données de la facture:", invoiceData);
      
      // S'assurer que les données binaires sont correctement formatées
      let fileData = invoiceData.fileData;
      if (fileData && typeof fileData === 'string' && fileData.includes('base64,')) {
        fileData = fileData.split('base64,')[1];
        invoiceData = { ...invoiceData, fileData };
      }
      
      const response = await fetch(`${API_URL}/agents/${agentId}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify(invoiceData)
      });
      
      if (!response.ok) {
        console.error(`Erreur lors de l'ajout de la facture: ${response.status} ${response.statusText}`);
        // En cas d'erreur, utiliser le localStorage comme fallback
        return localStorageService.addInvoiceToAgent(agentId, invoiceData);
      }
      
      // Vérifier si la réponse est vide
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn("Réponse vide du serveur, utilisation du localStorage comme fallback");
        return localStorageService.addInvoiceToAgent(agentId, invoiceData);
      }
      
      // Essayer de parser le JSON
      try {
        const agent = JSON.parse(text);
        console.log("Agent mis à jour avec la facture:", agent);
        return agent;
      } catch (parseError) {
        console.error('Erreur lors du parsing de la réponse JSON:', parseError);
        // En cas d'erreur de parsing, utiliser le localStorage comme fallback
        return localStorageService.addInvoiceToAgent(agentId, invoiceData);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la facture:', error);
      // En cas d'erreur, utiliser le localStorage comme fallback
      return localStorageService.addInvoiceToAgent(agentId, invoiceData);
    }
  },
  
  deleteInvoice: async (agentId, invoiceId) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.deleteInvoice(agentId, invoiceId);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents/${agentId}/invoices/${invoiceId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de la facture');
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la facture:', error);
      return false;
    }
  },
  
  // Mission Order operations
  getMissionOrderByAgentId: async (agentId) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getMissionOrderByAgentId(agentId);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents/${agentId}/mission-order`, {
        method: 'GET',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Erreur lors de la récupération de l\'ordre de mission');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ordre de mission:', error);
      return null;
    }
  },
  
  addMissionOrderToAgent: async (agentId, missionOrderData) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.addMissionOrderToAgent(agentId, missionOrderData);
    }
    
    try {
      // Ajouter des logs pour déboguer
      console.log("Ajout de l'ordre de mission à l'agent:", agentId);
      console.log("Données de l'ordre de mission:", missionOrderData);
      
      const response = await fetch(`${API_URL}/agents/${agentId}/mission-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify(missionOrderData)
      });
      
      if (!response.ok) {
        console.error(`Erreur lors de l'ajout de l'ordre de mission: ${response.status} ${response.statusText}`);
        // En cas d'erreur, utiliser le localStorage comme fallback
        return localStorageService.addMissionOrderToAgent(agentId, missionOrderData);
      }
      
      // Vérifier si la réponse est vide
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn("Réponse vide du serveur, utilisation du localStorage comme fallback");
        return localStorageService.addMissionOrderToAgent(agentId, missionOrderData);
      }
      
      // Essayer de parser le JSON
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error('Erreur lors du parsing de la réponse JSON:', parseError);
        // En cas d'erreur de parsing, utiliser le localStorage comme fallback
        return localStorageService.addMissionOrderToAgent(agentId, missionOrderData);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'ordre de mission:', error);
      // En cas d'erreur, utiliser le localStorage comme fallback
      return localStorageService.addMissionOrderToAgent(agentId, missionOrderData);
    }
  },
  
  deleteMissionOrder: async (agentId) => {
    if (USE_LOCAL_STORAGE) {
      return localStorageService.deleteMissionOrder(agentId);
    }
    
    try {
      const response = await fetch(`${API_URL}/agents/${agentId}/mission-order`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'ordre de mission');
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'ordre de mission:', error);
      return false;
    }
  }
};
