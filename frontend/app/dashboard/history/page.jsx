"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, FileText, Calendar, Bot, Loader2, Clock, Eye } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { executionService } from "@/lib/execution-service"
import { agentService } from "@/lib/agent-service"

export default function HistoryPage() {
  const router = useRouter()
  const [executions, setExecutions] = useState([])
  const [agents, setAgents] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredExecutions, setFilteredExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // Charger les exécutions depuis l'API
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Charger toutes les exécutions
        const executionsData = await executionService.getAllExecutions();
        
        // Trier les exécutions de la plus récente à la plus ancienne
        const sortedExecutions = executionsData.sort((a, b) => {
          const dateA = new Date(a.startTime || 0);
          const dateB = new Date(b.startTime || 0);
          return dateB - dateA; // Tri décroissant (plus récent au plus ancien)
        });
        
        // Normaliser les statuts pour s'assurer qu'ils sont dans un format cohérent
        const normalizedExecutions = sortedExecutions.map(execution => ({
          ...execution,
          status: normalizeStatus(execution.status)
        }));
        
        setExecutions(normalizedExecutions);
        setFilteredExecutions(normalizedExecutions);
        
        // Charger tous les agents pour pouvoir afficher leurs noms
        const agentsData = await agentService.getAllAgents();
        setAgents(agentsData);
        
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setError("Erreur lors du chargement des données");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredExecutions(executions)
    } else {
      const filtered = executions.filter((execution) => {
        // Trouver l'agent correspondant pour obtenir son nom
        const agent = agents.find(a => a.id === execution.agentId);
        const agentName = agent ? agent.name : "Agent inconnu";
        
        return (
          agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          execution.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (execution.result && execution.result.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (execution.notes && execution.notes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      });
      
      setFilteredExecutions(filtered);
    }
  }, [searchTerm, executions, agents])

  // Fonction pour normaliser les statuts d'exécution
  const normalizeStatus = (status) => {
    if (!status) return "EN_COURS";
    
    // Convertir en majuscules et supprimer les espaces
    const normalizedStatus = status.toUpperCase().trim();
    
    // Mapper les différentes variantes possibles
    if (normalizedStatus.includes("TERMIN")) return "TERMINÉ";
    if (normalizedStatus.includes("ECHEC") || normalizedStatus.includes("ÉCHOU") || normalizedStatus.includes("ECHOU")) return "ÉCHOUÉ";
    if (normalizedStatus.includes("COURS") || normalizedStatus.includes("RUNNING") || normalizedStatus === "RUN") return "EN_COURS";
    
    // Par défaut, retourner le statut tel quel
    return status;
  };

  const handleViewExecution = (executionId) => {
    router.push(`/dashboard/execute-agent?executionId=${executionId}`)
  }

  const filterByStatus = (status) => {
    if (status === "all") {
      setFilteredExecutions(executions)
    } else {
      const filtered = executions.filter(
        (execution) => execution.status === status
      )
      setFilteredExecutions(filtered)
    }
  }

  // Fonction pour obtenir le nom de l'agent à partir de son ID
  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : "Agent inconnu";
  }

  return (
    <div className="space-y-4 w-full">
      <Card className="w-full border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Historique d'exécution</CardTitle>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher par nom d'agent, statut ou résultat..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full mt-4">
            <TabsList className="w-full flex bg-muted/50">
              <TabsTrigger value="all" className="flex-1" onClick={() => filterByStatus("all")}>
                Tous
              </TabsTrigger>
              <TabsTrigger value="TERMINÉ" className="flex-1" onClick={() => filterByStatus("TERMINÉ")}>
                Terminés
              </TabsTrigger>
              <TabsTrigger value="EN_COURS" className="flex-1" onClick={() => filterByStatus("EN_COURS")}>
                En cours
              </TabsTrigger>
              <TabsTrigger value="ÉCHOUÉ" className="flex-1" onClick={() => filterByStatus("ÉCHOUÉ")}>
                Échoués
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement de l'historique...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500">
                  <p>{error}</p>
                </div>
              ) : (
                <HistoryList 
                  executions={filteredExecutions} 
                  onViewExecution={handleViewExecution} 
                  getAgentName={getAgentName} 
                />
              )}
            </TabsContent>
            <TabsContent value="TERMINÉ" className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement de l'historique...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500">
                  <p>{error}</p>
                </div>
              ) : (
                <HistoryList 
                  executions={filteredExecutions} 
                  onViewExecution={handleViewExecution} 
                  getAgentName={getAgentName} 
                />
              )}
            </TabsContent>
            <TabsContent value="EN_COURS" className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement de l'historique...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500">
                  <p>{error}</p>
                </div>
              ) : (
                <HistoryList 
                  executions={filteredExecutions} 
                  onViewExecution={handleViewExecution} 
                  getAgentName={getAgentName} 
                />
              )}
            </TabsContent>
            <TabsContent value="ÉCHOUÉ" className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement de l'historique...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12 text-red-500">
                  <p>{error}</p>
                </div>
              ) : (
                <HistoryList 
                  executions={filteredExecutions} 
                  onViewExecution={handleViewExecution} 
                  getAgentName={getAgentName} 
                />
              )}
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  )
}

function HistoryList({ executions, onViewExecution, getAgentName }) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-medium">Aucune exécution trouvée</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Aucune exécution ne correspond à vos critères de recherche.
        </p>
      </div>
    )
  }

  // Fonction utilitaire pour formater les dates de manière sécurisée
  const formatDate = (dateString) => {
    try {
      if (!dateString) return "Date non disponible";
      const date = new Date(dateString);
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) return "Date invalide";
      return format(date, "dd/MM/yyyy à HH:mm");
    } catch (error) {
      console.error("Erreur de formatage de date:", error);
      return "Date invalide";
    }
  };

  return (
    <div className="space-y-6">
      {executions.map((execution) => (
        <Card key={execution.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{getAgentName(execution.agentId)}</CardTitle>
              </div>
              <Badge 
                variant={
                  execution.status === "TERMINÉ" 
                    ? "success" 
                    : execution.status === "ÉCHOUÉ" 
                      ? "destructive" 
                      : "default"
                }
                className="ml-2"
              >
                {execution.status === "EN_COURS" ? "En cours" :
                 execution.status === "TERMINÉ" ? "Terminé" :
                 execution.status === "ÉCHOUÉ" ? "Échoué" :
                 execution.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Démarré le {formatDate(execution.startTime)}
              </span>
              {execution.endTime && (
                <span className="flex items-center gap-1 ml-4">
                  <Clock className="h-4 w-4" />
                  Terminé le {formatDate(execution.endTime)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Résultat</h4>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {execution.result || "Aucun résultat disponible"}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Notes</h4>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {execution.notes || "Aucune note disponible"}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-muted">
                  ID: {execution.id ? execution.id.substring(0, 8) + "..." : "ID non disponible"}
                </Badge>
                {execution.status === "TERMINÉ" && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Succès
                  </Badge>
                )}
                {execution.status === "ÉCHOUÉ" && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Échec
                  </Badge>
                )}
                {execution.status === "EN_COURS" && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    En cours
                  </Badge>
                )}
              </div>
              <Button 
                onClick={() => onViewExecution(execution.id)}
                size="sm"
                className="gap-1"
              >
                <Eye className="h-4 w-4" />
                Voir les détails
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
