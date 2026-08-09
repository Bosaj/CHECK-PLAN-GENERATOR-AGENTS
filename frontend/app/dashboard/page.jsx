"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, FileCheck, AlertTriangle, Plus, BarChart3, Clock, User, FileText } from "lucide-react"
import Link from "next/link"
import { agentService } from "@/lib/agent-service"
import { executionService } from "@/lib/execution-service"
import { userService } from "@/lib/user-service"

export default function Dashboard() {
  const [agents, setAgents] = useState([])
  const [recentExecutions, setRecentExecutions] = useState([])
  const [userStats, setUserStats] = useState({
    totalAgents: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      
      // Récupérer l'ID de l'utilisateur actuel
      const userStr = localStorage.getItem('opti_agent_user')
      let currentUserId = null
      
      try {
        if (userStr) {
          const user = JSON.parse(userStr)
          currentUserId = user.id
        }
      } catch (e) {
        console.error("Erreur lors du parsing de l'utilisateur:", e)
      }
      
      if (!currentUserId) {
        setError("Utilisateur non connecté")
        setIsLoading(false)
        return
      }
      
      // Agents et statistiques sont indépendants : les lancer en parallèle plutôt
      // qu'en séquence évite de cumuler leurs délais de fallback respectifs.
      const [agentsResult, statsResult] = await Promise.allSettled([
        agentService.getAgentsByUserId(currentUserId),
        userService.getUserStats(currentUserId, true)
      ])

      if (agentsResult.status === "fulfilled") {
        setAgents(agentsResult.value)
      } else {
        console.error("Erreur lors du chargement des agents:", agentsResult.reason)
        setError(prev => prev ? `${prev}, Erreur agents` : "Erreur lors du chargement des agents")
        setAgents([])
      }

      // Pour les exécutions, utiliser le localStorage temporairement
      // car une API REST sera ajoutée ultérieurement
      try {
        const savedExecutions = localStorage.getItem("executions")
        let executionsList = []

        if (savedExecutions) {
          executionsList = JSON.parse(savedExecutions)

          // Filtrer pour n'obtenir que les exécutions de l'utilisateur actuel
          executionsList = executionsList.filter(exec => exec.userId === currentUserId)

          // Trier par date (la plus récente en premier)
          executionsList.sort((a, b) => {
            const dateA = a.startTime ? new Date(a.startTime) : new Date(0)
            const dateB = b.startTime ? new Date(b.startTime) : new Date(0)
            return dateB - dateA
          })
        } else {
          // Initialiser avec un tableau vide
          localStorage.setItem("executions", JSON.stringify([]))
        }

        setRecentExecutions(executionsList.slice(0, 5))
      } catch (error) {
        console.error("Erreur lors du chargement des exécutions:", error)
        setError(prev => prev ? `${prev}, Erreur exécutions` : "Erreur lors du chargement des exécutions")
        setRecentExecutions([]) // Initialiser avec un tableau vide en cas d'erreur
      }

      if (statsResult.status === "fulfilled") {
        console.log("Statistiques utilisateur récupérées:", statsResult.value)
        setUserStats(statsResult.value)
      } else {
        console.error("Erreur lors du chargement des statistiques:", statsResult.reason)
        setError(prev => prev ? `${prev}, Erreur statistiques` : "Erreur lors du chargement des statistiques")
        setUserStats({
          totalAgents: 0,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0
        })
      }

      setIsLoading(false)
    }
    
    fetchData()
  }, [])

  // Calculer les statistiques pour les cartes
  const successfulCount = recentExecutions.filter((exec) => exec.status === "SUCCESS").length
  const failedCount = recentExecutions.filter((exec) => exec.status === "FAILED").length
  const pendingCount = recentExecutions.filter((exec) => exec.status === "PENDING").length

  return (
    <div className="w-full space-y-6">
      <Card className="w-full border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Tableau de bord</CardTitle>
              <CardDescription>Bienvenue sur votre tableau de bord OptiAgent</CardDescription>
            </div>
            <Button asChild className="gap-2">
              <Link href="/dashboard/create">
                <Plus className="h-4 w-4" />
                Créer un nouvel agent
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Agents</CardTitle>
                    <Bot className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{userStats.totalAgents || agents.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {agents.length === 0 ? "Aucun agent créé" : "Agents prêts à l'exécution"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Exécutions réussies</CardTitle>
                    <FileCheck className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{userStats.successfulExecutions || successfulCount}</div>
                    <p className="text-xs text-muted-foreground">Exécutions terminées avec succès</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-destructive">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Exécutions échouées</CardTitle>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{userStats.failedExecutions || failedCount}</div>
                    <p className="text-xs text-muted-foreground">Exécutions terminées en échec</p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total exécutions</CardTitle>
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{userStats.totalExecutions || recentExecutions.length}</div>
                    <p className="text-xs text-muted-foreground">Nombre total d'exécutions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Section des agents */}
              <h2 className="text-xl font-semibold mb-4">Agents récents</h2>
              <div className="grid gap-4 mb-8">
                {agents.length > 0 ? (
                  agents.slice(0, 5).map((agent) => (
                    <Card key={agent.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row gap-4 p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : "Date inconnue"}
                            </span>
                          </div>
                          <h3 className="font-medium">
                            {agent.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {agent.role || "Analyste de documents"}
                            </span>
                          </div>
                          {agent.description && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/agents/${agent.id}/invoices`}>
                              Règlement
                            </Link>
                          </Button>
                          <Button asChild variant="default" size="sm">
                            <Link href={`/dashboard/execute-agent?agentId=${agent.id}`}>
                              Exécuter
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="flex flex-col items-center gap-3 p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Aucun agent disponible</p>
                      <p className="text-sm text-muted-foreground">Créez votre premier agent pour générer un plan de contrôle.</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href="/dashboard/create">
                        <Plus className="mr-2 h-4 w-4" />
                        Créer un agent
                      </Link>
                    </Button>
                  </Card>
                )}
              </div>

              {/* Section des exécutions récentes */}
              <h2 className="text-xl font-semibold mb-4">Exécutions récentes</h2>
              <div className="grid gap-4">
                {recentExecutions.length > 0 ? (
                  recentExecutions.map((execution) => (
                    <Card key={execution.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row gap-4 p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {new Date(execution.startTime).toLocaleString()}
                            </span>
                          </div>
                          <h3 className="font-medium">
                            Agent: {agents.find(a => a.id === execution.agentId)?.name || "Agent inconnu"}
                          </h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                execution.status === "SUCCESS"
                                  ? "bg-green-100 text-green-800"
                                  : execution.status === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {execution.status}
                            </span>
                          </div>
                          {execution.notes && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{execution.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/history?id=${execution.id}`}>
                              Voir les détails
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="flex flex-col items-center gap-3 p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Aucune exécution récente</p>
                      <p className="text-sm text-muted-foreground">Exécutez un agent pour voir son historique apparaître ici.</p>
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
