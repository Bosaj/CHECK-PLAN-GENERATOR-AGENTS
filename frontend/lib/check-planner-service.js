// Service for Check Planner FastAPI integration
import { planDeControleApi } from "./api-service";
import { fileService } from "./file-service";

const API_BASE_URL = process.env.NEXT_PUBLIC_CHECK_PLANNER_API_URL || 'http://localhost:8057/check-planner/api/v1';

export const checkPlannerService = {
  // Call the /generate endpoint with regulation files
  // @param {File|File[]} reglementFiles - Fichier(s) de règlement à traiter
  // @param {string} agentId - ID de l'agent
  generateCheckPlan: async (reglementFiles, agentId) => {
    try {
      const formData = new FormData();
      const files = Array.isArray(reglementFiles) ? reglementFiles : [reglementFiles];
      
      // Log file info before processing
      console.log("=== FILE UPLOAD DEBUG ===");
      console.log("Files to upload:", files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        constructor: f.constructor.name
      })));
      
      // Add files to FormData with proper filename
      files.forEach((file, index) => {
        if (!(file instanceof File)) {
          console.error(`ERROR: File ${index + 1} is not a proper File object:`, file);
          throw new Error('Invalid file object provided');
        }
        
        // Ensure we're sending the file with the correct field name and filename
        formData.append('reglements', file, file.name);
        console.log(`Added file to FormData: ${file.name} (${file.size} bytes)`);
      });
      
      // Log FormData contents for debugging
      console.log("=== FORM DATA CONTENTS ===");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
          if (value.size < 100) {
            console.warn(`WARNING: File ${value.name} is very small (${value.size} bytes) - possible upload issue`);
          }
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      console.log(`Attempting to fetch from: ${API_BASE_URL}/generate`);
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/generate`, {
          method: "POST",
          body: formData,
          // Don't set Content-Type header when using FormData
          // The browser will set it with the correct boundary
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include', // Include cookies if needed
        });
      } catch (error) {
        console.error('=== NETWORK ERROR DETAILS ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Is CORS error:', error.name === 'TypeError' && error.message.includes('fetch'));
        console.error('API URL being called:', `${API_BASE_URL}/generate`);
        console.error('===========================');
        throw new Error(`Network error: ${error.message}. Please check console for details.`);
      }
      
      console.log("=== RESPONSE RECEIVED ===");
      console.log("Status:", response.status, response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      // /generate returns JSON (AgentResult: rg_path, max_pages, max_rgs, output_file) —
      // output_file is only a server-side filesystem path, never the file bytes. The actual
      // spreadsheet has to be fetched separately from /download/{filename}.
      const agentResult = await response.json();
      console.log("Agent result:", agentResult);

      if (!agentResult.output_file) {
        throw new Error(agentResult.error || "Aucun fichier de plan de contrôle généré");
      }

      const filename = agentResult.output_file.split(/[\\/]/).pop();
      const downloadResponse = await fetch(`${API_BASE_URL}/download/${encodeURIComponent(filename)}`);
      if (!downloadResponse.ok) {
        throw new Error(`Impossible de récupérer le fichier généré: ${downloadResponse.status}`);
      }

      // Get the blob from the response
      const blob = await downloadResponse.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Créer le fichier Excel
      const excelFile = new File(
        [blob], 
        filename, 
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      // Télécharger immédiatement le fichier
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      
      // Add the link to the DOM (required for Firefox)
      document.body.appendChild(link);
      
      // Trigger the download
      link.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
      
      console.log('Avant la définition de sendToBackend');
      
      // Fonction pour envoyer le fichier au backend Spring en arrière-plan
      // NOTE: /api/plan-controle/upload/{id} n'existe pas côté backend Spring (aucune
      // route "plan-controle" dans backend/src) et la réponse de getReglementByAgent
      // n'expose ni id/_id/fileId — cette fonction ne peut donc pas réussir tant que ce
      // endpoint n'est pas implémenté. Les échecs sont attendus ici : console.warn (pas
      // console.error) pour ne pas déclencher l'overlay d'erreur Next.js en dev pour une
      // branche déjà catchée et non bloquante pour le flux principal.
      const sendToBackend = async (excelFile, agentId) => {
        console.log('=== DÉBUT - sendToBackend ===');
        try {
          console.log('Récupération des informations du règlement...');
          
          if (!agentId) {
            console.warn("Aucun ID d'agent fourni");
            return;
          }
          
          console.log('ID de l\'agent trouvé:', agentId);
          
          // 2. Récupérer les informations du règlement pour cet agent
          console.log('Appel à fileService.getReglementByAgent avec agentId:', agentId);
          let reglementInfo;
          try {
            reglementInfo = await fileService.getReglementByAgent(agentId);
            console.log('Réponse de getReglementByAgent:', reglementInfo);
          } catch (error) {
            console.warn('Erreur lors de l\'appel à getReglementByAgent:', error);
            return;
          }

          if (!reglementInfo || Object.keys(reglementInfo).length === 0) {
            console.warn('Aucun règlement trouvé pour cet agent, impossible de procéder à l\'upload');
            console.log('Agent ID utilisé:', agentId);
            return;
          }

          // getReglementByAgent ne renvoie ni id/_id/fileId (voir note ci-dessus) : cette
          // branche est donc toujours prise pour l'instant, tant que le backend n'exposera
          // pas un identifiant de règlement dédié.
          const reglementId = reglementInfo.fileId || reglementInfo._id || reglementInfo.id;
          console.log('ID du règlement trouvé:', reglementId);

          if (!reglementId) {
            console.warn('Aucun ID de règlement valide trouvé dans la réponse (endpoint backend pas encore implémenté):', reglementInfo);
            return;
          }

          // Vérifier que le fichier Excel existe
          if (!excelFile) {
            console.warn('Aucun fichier Excel à envoyer');
            return;
          }
          
          console.log('Fichier Excel à envoyer:', {
            name: excelFile.name,
            size: excelFile.size,
            type: excelFile.type
          });
          
          // Envoyer le fichier Excel au backend Spring avec le reglementId
          console.log('Envoi du fichier Excel au backend Spring avec reglementId:', reglementId);
          console.log('Type de excelFile:', typeof excelFile);
          console.log('Contenu de excelFile:', excelFile);
          
          try {
            console.log('=== AVANT APPEL planDeControleApi.upload ===');
            console.log('Vérification des paramètres:');
            console.log('- excelFile existe:', !!excelFile);
            console.log('- excelFile est un objet File:', excelFile instanceof File);
            console.log('- reglementId:', reglementId);
            console.log('- planDeControleApi.upload est une fonction:', typeof planDeControleApi.upload === 'function');
            
            if (!excelFile || !(excelFile instanceof File) || !reglementId) {
              console.warn('Paramètres invalides pour l\'upload');
              return;
            }

            console.log('Appel à planDeControleApi.upload...');
            const result = await planDeControleApi.upload(excelFile, reglementId);
            console.log('=== APRÈS APPEL planDeControleApi.upload ===');
            console.log('Réponse de planDeControleApi.upload:', result);
          } catch (uploadError) {
            console.warn('Erreur lors de l\'appel à planDeControleApi.upload:', uploadError);
            throw uploadError;
          }

        } catch (error) {
          console.warn('Erreur lors de l\'envoi au backend Spring (arrière-plan):', error);
          if (error.response) {
            console.warn('Détails de l\'erreur:', {
              status: error.response.status,
              statusText: error.response.statusText,
              headers: error.response.headers,
              data: error.response.data
            });
          }
          // Ne pas arrêter le processus même en cas d'échec de l'envoi au backend Spring
        } finally {
          console.log('=== FIN - sendToBackend ===');
        }
      };
      
      console.log('Début de l\'appel à sendToBackend');
      
      // Démarrer l'envoi en arrière-plan sans attendre la fin
      sendToBackend(excelFile, agentId)
        .then(() => console.log('sendToBackend terminé avec succès'))
        .catch(error => {
          console.error('Erreur dans la fonction d\'envoi en arrière-plan:', error);
        });
        
      console.log('Appel à sendToBackend lancé');
      
      return { success: true, filename, url, ...agentResult };
    } catch (error) {
      console.error("Error in generateCheckPlan:", error);
      
      // Log detailed error information
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
        
        try {
          const errorText = await error.response.text();
          console.error("Error response body:", errorText);
        } catch (e) {
          console.error("Could not read error response body:", e);
        }
      }
      
      throw error;
    }
  },
  
  // Test connection to Check Planner API
  testConnection: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      
      if (!response.ok) {
        throw new Error(`API not reachable: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Check Planner API connection test failed:", error);
      throw error;
    }
  }
};
