// Service pour la gestion des règlements de gestion

const API_URL = 'http://localhost:8081/api';
const USE_LOCAL_STORAGE = false; // Utiliser l'API pour enregistrer dans la base de données MongoDB

// Fonction utilitaire pour obtenir les en-têtes d'authentification
const getAuthHeaders = () => {
  const headers = {};
  
  const token = localStorage.getItem('token');
  console.log("DEBUG: Token from localStorage:", token ? `${token.substring(0, 20)}...` : 'null');
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log("DEBUG: Authorization header set");
  } else {
    console.log("DEBUG: No token found, request will be anonymous");
  }
  
  return headers;
};

// Fonctions pour le localStorage (mode dégradé)
const localStorageService = {
  // Règlements de gestion
  uploadReglement: (file, agentId) => {
    const reglement = {
      id: Date.now().toString(),
      fileName: file.name,
      fileType: file.type,
      agentId: agentId,
      uploadDate: new Date().toISOString()
    };
    
    localStorage.setItem(`reglement_${agentId}`, JSON.stringify(reglement));
    return reglement;
  },
  
  getReglementByAgentId: (agentId) => {
    const reglement = localStorage.getItem(`reglement_${agentId}`);
    return reglement ? JSON.parse(reglement) : null;
  }
};

export const fileService = {
  // Upload a single PDF to /api/reglements (multipart/form-data)
  uploadReglementByAgent: async (pdfFile, agentId, userId) => {
    if (!pdfFile) {
      throw new Error('Le fichier PDF est requis');
    }
    if (!agentId) {
      throw new Error("L'agentId est requis");
    }
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.uploadReglement(pdfFile, agentId);
    }
    
    try {
      const formData = new FormData();
      // Ensure the file is properly appended with correct field name and filename
      formData.append('pdf', pdfFile, pdfFile.name);
      formData.append('agentId', String(agentId));
      if (userId) {
        formData.append('userId', String(userId));
      }
      
      // Log FormData contents for debugging
      console.log("=== UPLOAD REGLEMENT DEBUG ===");
      console.log("File:", pdfFile.name, pdfFile.type, pdfFile.size);
      console.log("Agent ID:", agentId);
      console.log("User ID:", userId);
      console.log("API URL:", `${API_URL}/reglements/upload-by-agent`);
      
      // Detailed FormData logging
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(name: ${value.name}, size: ${value.size} bytes, type: ${value.type})`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      console.log("Auth Headers:", getAuthHeaders());
      
      const headers = {
        ...getAuthHeaders(),
        // Accept JSON response
        'Accept': 'application/json',
        // DO NOT set Content-Type for FormData - browser sets it automatically with boundary
        // Ensure proper encoding for file upload
        'Accept-Encoding': 'gzip, deflate, br'
      };
      
      console.log("Final headers being sent:", headers);
      
      const response = await fetch(`${API_URL}/reglements/upload-by-agent`, {
        method: 'POST',
        headers: headers,
        body: formData,
        // Add credentials for CORS and ensure proper file transfer
        credentials: 'include'
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error("=== UPLOAD ERROR ===");
        console.error("Status:", response.status, response.statusText);
        console.error("Error body:", errorText);
        console.error("Request URL:", `${API_URL}/reglements/upload-by-agent`);
        console.error("Request method: POST");
        console.error("FormData was:", formData);
        throw new Error(`Erreur lors de l'upload du règlement: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log("=== UPLOAD SUCCESS ===");
      console.log("Upload result:", result);
      return result;
    } catch (error) {
      console.error("Exception pendant l'upload du règlement:", error);
      throw error;
    }
  },
  
  // Get a ReglementDeGestion by agentId
  getReglementByAgent: async (agentId) => {
    if (!agentId) {
      throw new Error("L'agentId est requis");
    }
    
    if (USE_LOCAL_STORAGE) {
      return localStorageService.getReglementByAgentId(agentId);
    }
    
    try {
      const url = `${API_URL}/reglements/by-agent?agentId=${encodeURIComponent(String(agentId))}`;
      console.log('Envoi de la requête GET...');
      console.log('URL complète:', url);
      console.log('En-têtes de la requête:', getAuthHeaders());
      
      let response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            ...getAuthHeaders(),
            'Accept': 'application/json'
          },
          credentials: 'include' // Important pour les cookies d'authentification
        });
      } catch (networkError) {
        console.warn('Backend 8081 indisponible, fallback vers localStorage:', networkError);
        return localStorageService.getReglementByAgentId(agentId);
      }
      
      console.log('Réponse reçue:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      // Lire le corps de la réponse une seule fois
      const responseText = await response.text().catch(() => 'Impossible de lire la réponse');
      console.log('Corps de la réponse brute:', responseText);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Aucun règlement trouvé pour cet agent (404)');
          return null;
        }
        console.error("Erreur lors de la récupération du règlement:", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers.entries()]),
          body: responseText
        });
        throw new Error(`Erreur lors de la récupération du règlement: ${response.status} ${response.statusText}`);
      }
      
      // Essayer de parser la réponse en JSON
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : null;
        console.log('Données JSON parsées:', data);
      } catch (parseError) {
        console.error('Erreur lors du parsing JSON:', parseError);
        console.error('Contenu qui a échoué au parsing:', responseText);
        throw new Error('Format de réponse invalide du serveur');
      }
      
      // Vérifier si les données sont valides
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        console.log('Aucune donnée valide dans la réponse');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error("Exception pendant la récupération du règlement:", error);
      throw error;
    }
  },

  // Récupérer les informations du règlement
  getReglementInfo: async (agentId) => {
    try {
      console.log("Récupération des informations du règlement pour l'agent:", agentId);
      
      const response = await fetch(`${API_URL}/reglements/by-agent?agentId=${encodeURIComponent(agentId)}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...getAuthHeaders(),
          'Accept': 'application/json'
        }
      });

      if (response.status === 404) {
        console.log(`Aucun règlement trouvé pour l'agent ${agentId}`);
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur lors de la récupération:`, errorText);
        throw new Error('Impossible de récupérer les informations du règlement');
      }
      
      const data = await response.json();
      console.log("Informations du règlement reçues:", data);
      return data;
      
    } catch (error) {
      console.error("Erreur lors de la récupération des informations:", error);
      throw error;
    }
  },

  // Télécharger le fichier de règlement pour un agent
  downloadReglementFile: async (agentId) => {
    try {
      console.log("Tentative de téléchargement du règlement pour l'agent:", agentId);
      
      // 1. D'abord, obtenir les informations du règlement
      const reglementInfo = await fileService.getReglementInfo(agentId);
      
      if (!reglementInfo) {
        console.log("Aucun règlement trouvé pour l'agent:", agentId);
        return { success: false, error: 'Aucun règlement trouvé pour cet agent' };
      }
      
        const byteCharacters = atob(reglementInfo.pdfData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Create a Blob and trigger download
    const blob = new Blob([byteArray], { type: reglementInfo.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = reglementInfo.fileName || `reglement-${agentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true, fileName: reglementInfo.fileName, message: 'Téléchargement réussi' };
  } catch (error) {
    console.error("Erreur lors du téléchargement du fichier:", error);
    throw error;
  }
  }
};
