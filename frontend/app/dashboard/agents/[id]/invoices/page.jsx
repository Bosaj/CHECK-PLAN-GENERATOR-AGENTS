"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { agentService } from "@/lib/agent-service"
import { fileService } from "@/lib/file-service"
import { AlertCircle, FileText, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function AgentReglementsPage({ params }) {
  const router = useRouter()
  const [agentId, setAgentId] = useState(null)
  
  const [agent, setAgent] = useState(null)
  const [reglement, setReglement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloadError, setDownloadError] = useState("")
  
  // État pour l'upload de règlement
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  const handleDownloadReglement = async () => {
    if (!agentId) return
    
    setIsDownloading(true)
    setDownloadError("")
    
    try {
      const result = await fileService.downloadReglementFile(agentId)
      
      // If no reglement was found, show a user-friendly message
      if (result && !result.success) {
        setDownloadError(result.error || "Aucun règlement n'est disponible au téléchargement")
      }
    } catch (error) {
      console.error("Error downloading reglement:", error)
      setDownloadError("Une erreur s'est produite lors du téléchargement du règlement")
    } finally {
      setIsDownloading(false)
    }
  }
  
  useEffect(() => {
    const initializeParams = async () => {
      try {
        const resolvedParams = await params
        setAgentId(resolvedParams.id)
      } catch (error) {
        console.error("Error resolving params:", error)
        setError("Impossible de charger les paramètres")
        setLoading(false)
      }
    }
    
    initializeParams()
  }, [params])

  useEffect(() => {
    if (!agentId) return

    const fetchAgentAndReglement = async () => {
      try {
        // Récupérer les détails de l'agent
        const agentData = await agentService.getAgentById(agentId)
        setAgent(agentData)
        
        // Récupérer le règlement de l'agent
        const reglementData = await fileService.getReglementByAgent(agentId)
        setReglement(reglementData)
        
        setLoading(false)
      } catch (error) {
        console.error("Error fetching agent data:", error)
        setError("Impossible de charger les données de l'agent")
        setLoading(false)
      }
    }
    
    fetchAgentAndReglement()
  }, [agentId])
  
  const handleUploadReglement = async () => {
    if (!selectedFile) {
      setError("Veuillez sélectionner un fichier PDF")
      return
    }
    
    setIsSubmitting(true)
    setError("")
    
    try {
      // Upload du règlement
      const uploadedReglement = await fileService.uploadReglementByAgent(selectedFile, agentId)
      
      // Mettre à jour l'état local
      setReglement(uploadedReglement)
      
      // Réinitialiser le formulaire
      setSelectedFile(null)
      
      // Fermer le dialogue
      setShowUploadDialog(false)
      setIsSubmitting(false)
    } catch (error) {
      console.error("Error uploading reglement:", error)
      setError("Une erreur s'est produite lors de l'upload du règlement")
      setIsSubmitting(false)
    }
  }
  
  const handleDeleteReglement = async () => {
    try {
      // Pour l'instant, on supprime juste de l'état local
      // car il n'y a pas d'endpoint de suppression dans le backend
      setReglement(null)
    } catch (error) {
      console.error("Error deleting reglement:", error)
      setError("Une erreur s'est produite lors de la suppression du règlement")
    }
  }
  
  if (loading) {
    return (
      <div className="w-full text-center py-12">
        <p>Chargement des données...</p>
      </div>
    )
  }
  
  if (!agent && !loading) {
    return (
      <div className="w-full">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>Agent non trouvé</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/dashboard/agents")}>
          Retour à la liste des agents
        </Button>
      </div>
    )
  }
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground">{agent.role}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/agents")}>
            Retour
          </Button>
          {!reglement && (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Télécharger le règlement
            </Button>
          )}
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Règlement de gestion</CardTitle>
          <CardDescription>
            Règlement de gestion associé à cet agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!reglement ? (
            <div className="text-center py-12 border rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-medium">Aucun règlement</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Cet agent n'a pas encore de règlement de gestion associé.
              </p>
              <Button className="mt-4" onClick={() => setShowUploadDialog(true)}>
                Télécharger le règlement
              </Button>
            </div>
          ) : (
            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium">{reglement.fileName || reglement.name || "Règlement de gestion"}</h4>
                    <p className="text-sm text-muted-foreground">
                      {reglement.uploadDate ? (
                        `Téléchargé le ${format(new Date(reglement.uploadDate), "dd/MM/yyyy à HH:mm")}`
                      ) : reglement.uploadedAt ? (
                        `Téléchargé le ${format(new Date(reglement.uploadedAt), "dd/MM/yyyy à HH:mm")}`
                      ) : 'Date de téléchargement inconnue'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col items-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDownloadReglement}
                      disabled={isDownloading}
                      className="mb-1"
                    >
                      {isDownloading ? "Téléchargement..." : "Télécharger"}
                    </Button>
                    {downloadError && (
                      <p className="text-xs text-red-500 mt-1">{downloadError}</p>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer le règlement de gestion ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteReglement} 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialogue d'upload de règlement */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Télécharger le règlement</DialogTitle>
            <DialogDescription>
              Téléchargez le règlement de gestion pour l'agent {agent?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reglement-file">Fichier PDF du règlement</Label>
              <Input
                id="reglement-file"
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
              <p className="text-sm text-muted-foreground">
                Seuls les fichiers PDF sont acceptés
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Annuler</Button>
            <Button onClick={handleUploadReglement} disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? "Upload en cours..." : "Télécharger le règlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
