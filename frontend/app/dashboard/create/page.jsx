"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Bot, FileUp, Loader2, Plus, X, FileText } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { agentService } from "@/lib/agent-service"
import { fileService } from "@/lib/file-service"
import { toast } from "sonner"

export default function CreateAgent() {
  const router = useRouter()
  const fileInputRef = useRef(null)
  
  const [agentName, setAgentName] = useState("")
  const [agentRole, setAgentRole] = useState("")
  const [reglement, setReglement] = useState(null)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdAgentId, setCreatedAgentId] = useState(null)

  // README documents MAX_UPLOAD_BYTES=50MB as an enforced backend limit (check_planner's
  // LimitUploadSizeMiddleware returns 413) — validate client-side too instead of only
  // finding out after a multi-second upload.
  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

  // Fonction pour gérer l'upload du règlement
  const handleReglementUpload = (files) => {
    console.log("=== REGLEMENT UPLOAD DEBUG ===");
    console.log("Files received:", files);
    console.log("Files length:", files.length);
    
    if (files.length === 0) {
      console.log("No files selected");
      return;
    }

    // Prendre seulement le premier fichier (un seul règlement par agent)
    const file = files[0]
    console.log("Selected file:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Le fichier dépasse la taille maximale autorisée (50 Mo). Taille actuelle: ${(file.size / (1024 * 1024)).toFixed(1)} Mo.`)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return;
    }

    setError("")

    try {
      // Store the actual File object instead of converting to base64
      const reglementData = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        name: file.name,
        file: file, // Keep the original File object for FormData upload
        fileType: file.type,
        fileSize: file.size
      };
      
      console.log("Setting reglement state:", reglementData);
      setReglement(reglementData);
      console.log("Reglement state updated successfully");
    } catch (error) {
      console.error("Erreur lors de la lecture du fichier:", error)
    }
  }

  // Fonction pour supprimer le règlement
  const handleRemoveReglement = () => {
    setReglement(null)
  }

  // Fonction pour créer un agent
  const handleCreateAgent = async () => {
    if (!agentName.trim()) {
      setError("Le nom de l'agent est requis");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Création de l'agent
      
      // Créer l'agent
      const createdAgent = await agentService.createAgent({
        name: agentName.trim(),
        role: "Analyste de documents"
      });
      
      if (!createdAgent || !createdAgent.id) {
        throw new Error("Erreur lors de la création de l'agent");
      }
      
      console.log("Agent créé avec succès, ID:", createdAgent.id);
      
      // Tableau pour stocker les promesses d'upload
      const uploadPromises = [];
      
      // Upload du règlement
      if (reglement) {
        try {
          console.log("Début de l'upload du règlement pour l'agent:", createdAgent.id);
          console.log("Données du règlement:", {
            nom: reglement.name,
            type: reglement.file.type,
            taille: reglement.file.size
          });
          
          // Get current user ID for the upload
          const userStr = localStorage.getItem('opti_agent_user')
          let currentUserId = null
          if (userStr) {
            try {
              const user = JSON.parse(userStr)
              currentUserId = user.id
            } catch (e) {
              console.error("Error parsing user:", e)
            }
          }
          
          // Store the file directly in the agent object for immediate use
          createdAgent.reglementFile = reglement.file;
          
          const uploadPromise = fileService.uploadReglementByAgent(reglement.file, createdAgent.id, currentUserId)
            .then(uploadedReglement => {
              console.log("Règlement uploadé avec succès:", uploadedReglement);
              return uploadedReglement;
            })
            .catch(error => {
              console.error("ERREUR UPLOAD REGLEMENT:", error);
              console.error("Agent ID:", createdAgent.id);
              console.error("File:", reglement.file);
              return null;
            });
          
          uploadPromises.push(uploadPromise);
        } catch (error) {
          console.error("Erreur lors de l'upload du règlement:", error);
        }
      } else {
        console.log("Aucun règlement à uploader pour l'agent:", createdAgent.id);
      }
      
      // Attendre un délai plus long pour s'assurer que toutes les données sont bien enregistrées
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Attendre que toutes les promesses d'upload soient terminées
      await Promise.all(uploadPromises);
      
      setCreatedAgentId(createdAgent.id)
      
      console.log("Agent créé avec succès, ID:", createdAgent.id);
      
      // Stocker temporairement l'ID de l'agent dans le localStorage pour la redirection
      localStorage.setItem('lastCreatedAgentId', createdAgent.id);
      
      // Lire le fichier une seule fois en base64 : handleReglementUpload ne stocke que le
      // File brut (pas de fileDataBase64), donc reglement.fileDataBase64 était toujours
      // undefined ici — l'entrée localStorage n'avait jamais de données, seulement les
      // métadonnées. Résultat : la première exécution marchait via le sessionStorage
      // ci-dessous (à usage unique, supprimé après lecture), mais toute exécution suivante
      // retombait sur cette entrée localStorage vide et échouait avec "pas de données base64".
      const reglementBase64 = reglement ? await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(reglement.file);
      }) : null;

      // Stocker le règlement original dans localStorage pour l'utiliser dans execute-agent
      if (reglement) {
        const reglementForStorage = [{
          name: reglement.name,
          fileType: reglement.file.type,
          fileDataBase64: reglementBase64
        }];
        localStorage.setItem('executeAgent_documents', JSON.stringify(reglementForStorage));
      }

      // Redirection directe vers la nouvelle page d'exécution
      console.log("Redirection vers la page d'exécution avec l'ID:", createdAgent.id);

      // Prepare the file data to pass to the execute page
      const fileData = reglement ? {
        name: reglement.name,
        type: reglement.fileType,
        size: reglement.fileSize,
        data: reglementBase64
      } : null;
      
      // Store the file data in session storage temporarily
      sessionStorage.setItem(`agent_${createdAgent.id}_file`, JSON.stringify(fileData));
      
      // Redirect to the execute page with the agent ID
      toast.success("Agent créé avec succès", { description: agentName.trim() });
      router.push(`/dashboard/execute-agent?agentId=${createdAgent.id}`);

      return createdAgent.id;
    } catch (error) {
      console.error("Error creating agent:", error)
      const message = error.message || "Erreur lors de la création de l'agent"
      setError(message)
      toast.error(message)
      setIsSubmitting(false)
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Créer un nouvel agent</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informations de l'agent</CardTitle>
          <CardDescription>Entrez les informations de base de l'agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Nom de l'agent</Label>
            <Input 
              id="agent-name" 
              placeholder="Entrez le nom de l'agent" 
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="agent-role">Description du rôle</Label>
            <Textarea 
              id="agent-role" 
              placeholder="Décrivez le rôle de l'agent" 
              value={agentRole}
              onChange={(e) => setAgentRole(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Règlement de gestion</CardTitle>
          <CardDescription>Téléchargez le règlement de gestion pour cet agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || reglement !== null}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Télécharger le règlement
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  console.log("File input onChange triggered");
                  console.log("Event target:", e.target);
                  console.log("Files from event:", e.target.files);
                  handleReglementUpload(e.target.files);
                }}
                accept=".pdf"
                disabled={isSubmitting}
              />
              <span className="text-sm text-muted-foreground">
                Format accepté: PDF uniquement
              </span>
            </div>
            
            {reglement && (
              <div className="space-y-2">
                <Label>Règlement téléchargé</Label>
                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between bg-muted p-2 rounded">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">{reglement.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveReglement}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          className="mr-2"
          onClick={() => router.push('/dashboard/agents')}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={(e) => {
            e.preventDefault();
            handleCreateAgent();
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création en cours...
            </>
          ) : (
            "Créer l'agent"
          )}
        </Button>
      </div>
    </div>
  )
}