"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, CheckCircle, FileText, Eye } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { agentService } from "@/lib/agent-service"
import { fileService } from "@/lib/file-service"
import { executionService } from "@/lib/execution-service"
import { checkPlannerService } from "@/lib/check-planner-service"
import { userService } from "@/lib/user-service"

export default function ExecuteAgentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentId = searchParams.get("agentId")

  const [agent, setAgent] = useState(null)
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionProgress, setExecutionProgress] = useState(0)
  const [executionResults, setExecutionResults] = useState(null)
  const [checkPlanResults, setCheckPlanResults] = useState(null)
  const [currentExecution, setCurrentExecution] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("documents")

  // Effet pour basculer vers l'onglet Résultats lorsque les résultats sont disponibles
  useEffect(() => {
    if (executionResults) {
      console.log("Résultats disponibles, basculement vers l'onglet Résultats");
      setActiveTab("results");
    }
  }, [executionResults]);

  // Effet pour charger les données de l'agent et les documents
  useEffect(() => {
    const fetchData = async () => {
      // Récupérer l'ID de l'agent depuis les paramètres d'URL ou le localStorage
      let currentAgentId = agentId;
      
      // Si l'ID n'est pas disponible dans l'URL, essayer de le récupérer depuis le localStorage
      if (!currentAgentId) {
        currentAgentId = localStorage.getItem('lastCreatedAgentId');
        console.log("ID d'agent récupéré depuis localStorage:", currentAgentId);
        
        // Si un ID a été récupéré du localStorage, mettre à jour l'URL pour refléter cet ID
        if (currentAgentId) {
          window.history.replaceState(
            null, 
            '', 
            `/dashboard/execute-agent?agentId=${currentAgentId}`
          );
        }
      }
      
      if (!currentAgentId) {
        setError("ID d'agent non spécifié");
        setIsLoading(false);
        return;
      }
      
      // Vérifier d'abord si nous avons des fichiers originaux dans localStorage
      let originalDocuments = [];
      
      if (typeof window !== 'undefined') {
        // Récupérer les documents originaux depuis localStorage
        const storedDocuments = localStorage.getItem('executeAgent_documents');
        if (storedDocuments) {
          try {
            const parsedDocuments = JSON.parse(storedDocuments);
            originalDocuments = parsedDocuments.map(doc => ({
              id: `original_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              name: doc.name, // Nom original du fichier
              fileType: doc.fileType,
              fileDataBase64: doc.fileDataBase64,
              isOriginal: true
            }));
            console.log("Documents originaux récupérés depuis localStorage:", originalDocuments.map(f => f.name));
          } catch (error) {
            console.error("Erreur lors de la récupération des documents depuis localStorage:", error);
          }
        }
      }

      try {
        // Charger les données de l'agent
        const agentData = await agentService.getAgentById(currentAgentId);
        setAgent(agentData);
        console.log("Agent chargé:", agentData);

        // Charger le règlement associé à l'agent
        const reglementData = await fileService.getReglementByAgent(currentAgentId);
        console.log("Règlement chargé:", reglementData);
        
        // Convertir le règlement en format document si disponible
        const documentsData = reglementData ? [reglementData] : [];
        console.log("Documents chargés:", documentsData);

        // Combiner les documents originaux avec ceux de la base de données
        const allDocuments = [...originalDocuments, ...documentsData];
        setDocuments(allDocuments);
        
        console.log("Documents combinés:", allDocuments);

      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setError("Erreur lors du chargement des données de l'agent");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [agentId]);

  const handleExecuteAgent = async () => {
    if (!agent || documents.length === 0) {
      setError("Agent ou documents manquants");
      return;
    }

    setIsExecuting(true);
    setError("");
    setExecutionProgress(0);
    setExecutionResults(null);
    setCheckPlanResults(null);

    try {
      console.log("Début de l'exécution de l'agent:", agent.id);
      console.log("Documents à traiter:", documents);

      // Étape 1: Démarrer l'exécution via Spring Boot API
      setExecutionProgress(10);
      console.log("Démarrage de l'exécution via Spring Boot API...");
      
      const userStr = localStorage.getItem('opti_agent_user');
      if (!userStr) {
        console.error("Utilisateur non connecté");
        router.push('/auth/login');
        return;
      }

      const user = JSON.parse(userStr);
      const userId = user?.id;

      const execution = await executionService.startExecution(agent.id, userId);
      setCurrentExecution(execution);
      console.log("Exécution démarrée:", execution);

      setExecutionProgress(25);

      // Préparer les fichiers pour l'API - utiliser directement les fichiers de l'agent
      const documentFiles = [];
      
      // Check for file in this order:
      // 1. Directly in agent object
      // 2. In session storage (from create page)
      // 3. From server
      let fileProcessed = false;

      // 1. Check direct file in agent object
      if (agent.reglementFile && agent.reglementFile instanceof File) {
        console.log("Using regulation file directly from agent object:", agent.reglementFile.name);
        console.log("File details:", {
          name: agent.reglementFile.name,
          type: agent.reglementFile.type,
          size: agent.reglementFile.size,
          lastModified: agent.reglementFile.lastModified
        });
        documentFiles.push(agent.reglementFile);
        fileProcessed = true;
      } 
      // 2. Check session storage for file data from create page
      else {
        const fileDataStr = sessionStorage.getItem(`agent_${agent.id}_file`);
        if (fileDataStr) {
          try {
            const fileData = JSON.parse(fileDataStr);
            if (fileData && fileData.data) {
              console.log("Found file data in session storage");
              // Convert base64 to blob
              const byteString = atob(fileData.data.split(',')[1]);
              const mimeType = fileData.type || 'application/pdf';
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const blob = new Blob([ab], { type: mimeType });
              const file = new File([blob], fileData.name || 'reglement.pdf', { type: mimeType });
              
              console.log("Created file from session storage:", {
                name: file.name,
                type: file.type,
                size: file.size
              });
              
              documentFiles.push(file);
              // Clean up session storage
              sessionStorage.removeItem(`agent_${agent.id}_file`);
              fileProcessed = true;
            }
          } catch (e) {
            console.error("Error processing file from session storage:", e);
          }
        }
      }
      
      // 3. If no file processed yet, try to get from server
      if (!fileProcessed) {
        console.log("No direct file found, attempting to fetch regulation file from server...");
        try {
          const reglement = await fileService.getReglementByAgent(agent.id);
          console.log("Regulation data from server:", reglement);
          
          if (reglement && reglement.id) {
            console.log("Regulation found, downloading file...");
            try {
              const fileBlob = await fileService.downloadReglementFile(reglement.id);
              console.log("Downloaded blob:", fileBlob);
              
              if (fileBlob && fileBlob.size > 0) {
                const file = new File([fileBlob], reglement.fileName || 'reglement.pdf', { 
                  type: 'application/pdf' 
                });
                documentFiles.push(file);
                console.log(`Successfully downloaded regulation file, size: ${file.size} bytes`);
              } else {
                throw new Error("Downloaded file is empty or invalid");
              }
            } catch (downloadError) {
              console.error("Error downloading file:", downloadError);
              throw new Error("Failed to download regulation file");
            }
          } else {
            console.error("No regulation file found in server response");
            console.error("Agent data:", agent);
            console.error("Regulation data:", reglement);
            throw new Error("No regulation file was found for this agent. Please upload a regulation file first.");
          }
        } catch (error) {
          console.error("Error getting regulation file:", error);
          // Instead of creating a test file, we'll show an error to the user
          setError("No regulation file found. Please upload a regulation file first.");
          setExecutionProgress(0);
          setIsExecuting(false);
          return;
        }
        
        // Fallback: traiter les documents comme avant
        for (const document of documents) {
          console.log("Traitement du document:", document);
          
          // Validate document structure
          if (!document) {
            console.error("Document is null or undefined");
            continue;
          }
          
          const documentName = document.name || document.fileName || 'Unknown Document';
          console.log(`Processing document: ${documentName}`);
          
          let file;
          
          if (document.isOriginal) {
            // Convertir le base64 en fichier
            console.log(`Conversion base64 pour document original: ${documentName}`);
            console.log(`Document data:`, { 
              hasFileDataBase64: !!document.fileDataBase64,
              fileDataBase64Type: typeof document.fileDataBase64,
              fileDataBase64Length: document.fileDataBase64?.length || 0
            });
            
            if (!document.fileDataBase64) {
              console.error(`Document ${documentName} n'a pas de données base64`);
              continue;
            }
            
            try {
              // Handle data URL format (data:application/pdf;base64,...)
              let base64Data = document.fileDataBase64;
              if (typeof base64Data === 'string' && base64Data.includes(',')) {
                base64Data = base64Data.split(',')[1];
              }
              
              // Convert base64 to binary - create raw binary data like Swagger
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Create File object with raw binary data (not base64)
              file = new File([bytes], documentName, { type: document.fileType || 'application/pdf' });
              console.log(`Fichier original créé, taille: ${file.size} bytes`);
              console.log(`File object type: ${file.constructor.name}, is File: ${file instanceof File}`);
            } catch (error) {
              console.error(`Erreur lors de la conversion base64 pour ${documentName}:`, error);
              continue;
            }
          } else {
            // Pour les règlements de la base de données, vérifier s'il y a des données base64
            if (document.fileDataBase64) {
              console.log(`Utilisation des données base64 pour ${documentName}`);
              console.log(`Document data:`, { 
                hasFileDataBase64: !!document.fileDataBase64,
                fileDataBase64Type: typeof document.fileDataBase64,
                fileDataBase64Length: document.fileDataBase64?.length || 0
              });
              
              try {
                // Handle data URL format (data:application/pdf;base64,...)
                let base64Data = document.fileDataBase64;
                if (typeof base64Data === 'string' && base64Data.includes(',')) {
                  base64Data = base64Data.split(',')[1];
                }
                
                // Convert base64 to binary - create raw binary data like Swagger
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                // Create File object with raw binary data (not base64)
                file = new File([bytes], documentName, { 
                  type: document.fileType || 'application/pdf' 
                });
                console.log(`Fichier créé depuis base64, taille: ${file.size} bytes`);
                console.log(`File object type: ${file.constructor.name}, is File: ${file instanceof File}`);
              } catch (error) {
                console.error(`Erreur lors de la conversion base64 pour ${documentName}:`, error);
                // Skip this document instead of creating a placeholder
                continue;
              }
            } else {
              // Try to download the file using the download endpoint
              console.log(`Tentative de téléchargement du fichier pour ${documentName}`);
              try {
                if (document.id) {
                  const fileBlob = await fileService.downloadReglementFile(document.id);
                  if (fileBlob && fileBlob.size > 0) {
                    // Create File object from raw blob data (not base64)
                    file = new File([fileBlob], documentName, { 
                      type: document.fileType || 'application/pdf' 
                    });
                    console.log(`Fichier téléchargé avec succès, taille: ${file.size} bytes`);
                    console.log(`File object type: ${file.constructor.name}, is File: ${file instanceof File}`);
                  } else {
                    console.warn(`Fichier téléchargé vide pour ${documentName}`);
                    continue;
                  }
                } else {
                  console.warn(`Document ${documentName} n'a pas d'ID pour le téléchargement`);
                  continue;
                }
              } catch (downloadError) {
                console.error(`Erreur lors du téléchargement de ${documentName}:`, downloadError);
                continue;
              }
            }
          }
          
          documentFiles.push(file);
        }
      }

      // Check if we have any files to process
      if (documentFiles.length === 0) {
        console.error("Aucun fichier à traiter - arrêt de l'exécution");
        setError("Aucun fichier de règlement trouvé pour cet agent");
        setIsExecuting(false);
        return;
      }

      console.log(`Fichiers préparés pour l'API: ${documentFiles.length}`);
      documentFiles.forEach((file, index) => {
        console.log(`Fichier ${index + 1}: ${file.name} (${file.size} bytes)`);
      });

      setExecutionProgress(40);

      // Étape 2: Envoyer les documents à l'API Python FastAPI
      console.log("Envoi des documents à l'API Python FastAPI...");
      try {
        if (!agentId) {
          throw new Error("ID de l'agent non disponible");
        }
        const checkPlanResult = await checkPlannerService.generateCheckPlan(documentFiles, agentId);
        setCheckPlanResults(checkPlanResult);
        console.log("Plan de contrôle généré:", checkPlanResult);
      } catch (checkPlanError) {
        console.error("Erreur lors de la génération du plan de contrôle:", checkPlanError);
        // Continue l'exécution même si le Check Planner échoue
      }

      // Étape 3: Marquer l'exécution comme terminée
      setExecutionProgress(80);
      
      if (currentExecution && currentExecution.id) {
        try {
          const updatedExecution = await executionService.completeExecution(
            currentExecution.id, 
            "Exécution terminée avec succès", 
            `Documents traités: ${documentFiles.length}`
          );
          console.log("Exécution marquée comme terminée:", updatedExecution);
        } catch (error) {
          console.error("Erreur lors de la finalisation de l'exécution:", error);
        }
      }
      
      setExecutionProgress(100);
      setExecutionResults({ 
        status: "Terminé", 
        documentsProcessed: documentFiles.length,
        timestamp: new Date().toISOString()
      });
      setIsExecuting(false);
      
      // Basculer automatiquement vers l'onglet Plan de contrôle
      setActiveTab("checkplan");
    } catch (error) {
      console.error("Erreur lors de l'exécution de l'agent:", error);
      setError("Erreur lors de l'exécution de l'agent");
      setIsExecuting(false);
    }
  };

  const handleViewDocument = (documentId) => {
    const document = documents.find(doc => doc.id === documentId);
    if (document) {
      if (document.isOriginal) {
        // Ouvrir le fichier original depuis base64
        window.open(document.fileDataBase64, '_blank');
      } else {
        // Pour les règlements, afficher un message car nous n'avons pas de méthode de téléchargement
        alert('Visualisation du règlement non disponible');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {agent && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'agent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="font-medium">Nom</Label>
                  <p>{agent.name}</p>
                </div>
                <div>
                  <Label className="font-medium">Description</Label>
                  <p>{agent.description || "Aucune description"}</p>
                </div>
                <div>
                  <Label className="font-medium">Date de création</Label>
                  <p>{new Date(agent.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="checkplan">Plan de contrôle</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              <div className="grid gap-6">
                {/* Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle>Règlements</CardTitle>
                    <CardDescription>Règlements de gestion associés à cet agent</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {documents && documents.length > 0 ? (
                      <div className="space-y-2">
                        {documents.map((document, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-sm truncate max-w-[180px]">{document.fileName || document.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(document.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucun règlement disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="results">
              <Card>
                <CardHeader>
                  <CardTitle>Résultats de l'analyse</CardTitle>
                  <CardDescription>Résultats de l'exécution de l'agent</CardDescription>
                </CardHeader>
                <CardContent>
                  {isExecuting ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Analyse en cours...</p>
                      <Progress value={executionProgress} max={100} />
                    </div>
                  ) : executionResults ? (
                    <div className="space-y-6">
                      {executionResults.résultats && executionResults.résultats.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">Résultats de l'analyse</h3>
                          <div className="space-y-2">
                            {executionResults.résultats.map((result, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-md">
                                <div className="flex justify-between mb-2">
                                  <span className="font-medium">{result.nom_fichier}</span>
                                  <span className={`text-sm px-2 py-1 rounded-full ${result.fraude === 'Oui' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                    {result.fraude}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-sm font-medium">Nom du commerce</Label>
                                    <p className="text-sm">{result["Nom du commerce"]}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Date du document</Label>
                                    <p className="text-sm">{result["Date de la facture"]}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Montant total</Label>
                                    <p className="text-sm">{result["Montant total"]}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Ville</Label>
                                    <p className="text-sm">{result.Ville}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Adresse complète</Label>
                                    <p className="text-sm">{result["Adresse complète"]}</p>
                                  </div>
                                </div>
                                {result.raison && result.raison.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-medium mb-2">Raisons de la fraude</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                      {result.raison.map((reason, index) => (
                                        <li key={index} className="text-sm">{reason}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Aucun résultat disponible</p>
                      <Button 
                        onClick={handleExecuteAgent}
                        disabled={!agent || documents.length === 0}
                      >
                        Exécuter l'agent
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checkplan">
              <Card>
                <CardHeader>
                  <CardTitle>Plan de contrôle</CardTitle>
                  <CardDescription>Plan de contrôle généré par l'agent Check Planner</CardDescription>
                </CardHeader>
                <CardContent>
                  {checkPlanResults ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Statut</Label>
                          <p className="text-sm">{checkPlanResults.status || 'Terminé'}</p>
                        </div>
                        <div>
                          <Label className="font-medium">Fichier de sortie</Label>
                          <p className="text-sm">{checkPlanResults.output_file || 'Non disponible'}</p>
                        </div>
                      </div>
                      
                      {checkPlanResults.message && (
                        <div>
                          <Label className="font-medium">Message</Label>
                          <p className="text-sm bg-gray-50 p-3 rounded-md">{checkPlanResults.message}</p>
                        </div>
                      )}
                      
                      {checkPlanResults.details && (
                        <div>
                          <Label className="font-medium">Détails</Label>
                          <pre className="text-sm bg-gray-50 p-3 rounded-md overflow-auto max-h-96">
                            {JSON.stringify(checkPlanResults.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {isExecuting ? "Génération du plan de contrôle en cours..." : "Aucun plan de contrôle généré"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {!executionResults && !isExecuting && (
            <div className="flex justify-end mt-6">
              <Button 
                onClick={handleExecuteAgent}
                disabled={!agent || documents.length === 0 || isExecuting}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exécution en cours...
                  </>
                ) : (
                  "Exécuter l'agent"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
