"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { Bot, Plus, Trash2, Eye, Search as SearchIcon, ArrowUpDown, File, FileText, Edit } from "lucide-react"
import { format } from "date-fns"
import { agentService } from "@/lib/agent-service"
import { toast } from "sonner"

// --- Petits utilitaires partagés (évite de dupliquer le même try/catch dans
// fetchAgents, saveAgentChanges, handleDeleteAgent et handleAdvancedSearch) ---

function getCurrentUserId() {
  const userStr = localStorage.getItem('opti_agent_user')
  if (!userStr) return null
  try {
    return JSON.parse(userStr).id
  } catch (e) {
    console.error("Erreur lors du parsing de l'utilisateur:", e)
    return null
  }
}

async function refreshUserStats(userId) {
  if (!userId) return
  try {
    await fetch(`http://localhost:8081/api/users/${userId}/stats?recalculate=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
  } catch (e) {
    console.error("Erreur lors de la mise à jour des statistiques:", e)
  }
}

function getTypeIcon(type) {
  switch (type) {
    case "agent":
      return <Bot className="h-4 w-4" />
    case "execution":
      return <FileText className="h-4 w-4" />
    default:
      return <File className="h-4 w-4" />
  }
}

// --- Blocs de rendu extraits au niveau module : réduit la complexité cognitive
// du composant principal et remplace les ternaires imbriqués par des if/else. ---

function EmptyAgentsState() {
  return (
    <div className="text-center py-12 border rounded-lg">
      <Bot className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
      <h3 className="mt-4 text-lg font-medium">Aucun agent trouvé</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Vous n'avez pas encore créé d'agents. Commencez par en créer un nouveau.
      </p>
      <Link href="/dashboard/create">
        <Button className="mt-4">Créer votre premier agent</Button>
      </Link>
    </div>
  )
}

function AgentRow({ agent, onEdit, onDelete }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center">
          <Bot className="mr-2 h-4 w-4 text-muted-foreground" />
          {agent.name}
        </div>
      </TableCell>
      <TableCell>{agent.role}</TableCell>
      <TableCell>{format(new Date(agent.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="icon" onClick={() => onEdit(agent)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Link href={`/dashboard/execute-agent?agentId=${agent.id}`}>
            <Button variant="outline" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/dashboard/agents/${agent.id}/invoices`}>
            <Button variant="outline" size="icon">
              <FileText className="h-4 w-4" />
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer l'agent "{agent.name}" ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(agent.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

function AgentsTable({ loading, filteredAgents, sortBy, onSort, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <p>Chargement des agents...</p>
      </div>
    )
  }

  if (filteredAgents.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">Aucun résultat pour votre recherche</p>
      </div>
    )
  }

  return (
    <div className="w-full rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px] cursor-pointer" onClick={() => onSort("name")}>
              <div className="flex items-center">
                Nom
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortBy === "name" ? "opacity-100" : "opacity-40"}`} />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("role")}>
              <div className="flex items-center">
                Rôle
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortBy === "role" ? "opacity-100" : "opacity-40"}`} />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("createdAt")}>
              <div className="flex items-center">
                Date de création
                <ArrowUpDown className={`ml-2 h-4 w-4 ${sortBy === "createdAt" ? "opacity-100" : "opacity-40"}`} />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAgents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SearchResultsList({ searchResults, advancedSearchTerm }) {
  if (searchResults.length > 0) {
    return (
      <div className="space-y-4">
        {searchResults.map((result) => (
          <Link href={result.url} key={`${result.type}-${result.id}`}>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(result.type)}
                    <div>
                      <h4 className="font-medium">{result.title}</h4>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(result.date), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    )
  }

  if (advancedSearchTerm) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-muted-foreground">Aucun résultat trouvé pour "{advancedSearchTerm}"</p>
      </div>
    )
  }

  return (
    <div className="text-center py-12 border rounded-lg">
      <p className="text-muted-foreground">
        Utilisez la barre de recherche ci-dessus pour trouver des agents ou des exécutions
      </p>
    </div>
  )
}

export default function AgentsManagementPage() {
  const [agents, setAgents] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortDirection, setSortDirection] = useState("desc")
  const [loading, setLoading] = useState(true)

  // État pour l'édition d'agent
  const [editingAgent, setEditingAgent] = useState(null)
  const [editedName, setEditedName] = useState("")
  const [editedRole, setEditedRole] = useState("")
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Recherche avancée
  const [advancedSearchTerm, setAdvancedSearchTerm] = useState("")
  const [searchType, setSearchType] = useState("all")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const fetchAgents = async () => {
      const currentUserId = getCurrentUserId()
      if (!currentUserId) {
        console.error("Utilisateur non connecté")
        setLoading(false)
        return
      }

      try {
        const data = await agentService.getAgentsByUserId(currentUserId)
        setAgents(data)
      } catch (error) {
        console.error("Error fetching agents:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

  const handleEditAgent = (agent) => {
    setEditingAgent(agent)
    setEditedName(agent.name)
    setEditedRole(agent.role)
    setShowEditDialog(true)
  }

  const saveAgentChanges = async () => {
    if (!editedName.trim()) {
      return // Ne pas sauvegarder si le nom est vide
    }

    try {
      const agentData = { name: editedName.trim(), role: editedRole.trim() }
      await agentService.updateAgent(editingAgent.id, agentData)

      setAgents(agents.map(agent =>
        agent.id === editingAgent.id ? { ...agent, ...agentData } : agent
      ))
      setShowEditDialog(false)
      toast.success("Agent mis à jour avec succès")

      await refreshUserStats(getCurrentUserId())
    } catch (error) {
      console.error("Error updating agent:", error)
      toast.error("Erreur lors de la mise à jour de l'agent")
    }
  }

  const handleDeleteAgent = async (id) => {
    try {
      await agentService.deleteAgent(id)

      setAgents(agents.filter(agent => agent.id !== id))
      toast.success("Agent supprimé avec succès")

      await refreshUserStats(getCurrentUserId())
    } catch (error) {
      console.error("Error deleting agent:", error)
      toast.error(error.message || "Erreur lors de la suppression de l'agent")
    }
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDirection("asc")
    }
  }

  const sortAgents = (a, b) => {
    const aValue = a[sortBy]
    const bValue = b[sortBy]
    const direction = sortDirection === "asc" ? 1 : -1
    return aValue < bValue ? -direction : direction
  }

  const filteredAgents = agents
    .filter(agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort(sortAgents)

  const handleAdvancedSearch = async () => {
    setIsSearching(true)

    const currentUserId = getCurrentUserId()
    if (!currentUserId) {
      console.error("Utilisateur non connecté")
      setIsSearching(false)
      return
    }

    try {
      const agentsData = await agentService.getAgentsByUserId(currentUserId)
      const includeAgents = searchType === "all" || searchType === "agents"

      const matchingAgents = includeAgents
        ? agentsData
            .filter(agent =>
              agent.name.toLowerCase().includes(advancedSearchTerm.toLowerCase()) ||
              agent.role.toLowerCase().includes(advancedSearchTerm.toLowerCase())
            )
            .map(agent => ({
              id: agent.id,
              type: "agent",
              title: agent.name,
              description: agent.role,
              date: agent.createdAt,
              url: `/dashboard/execute-agent?agentId=${agent.id}`
            }))
        : []

      setSearchResults(matchingAgents)
    } catch (error) {
      console.error("Error performing search:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAdvancedSearch()
    }
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="management" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="management">Gestion des agents</TabsTrigger>
          <TabsTrigger value="search">Recherche avancée</TabsTrigger>
        </TabsList>

        {/* Onglet Gestion des agents */}
        <TabsContent value="management" className="w-full">
          <Card className="w-full border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-2xl font-bold">Gestion des Agents</CardTitle>
                  <CardDescription>
                    Gérez et organisez vos agents d'automatisation
                  </CardDescription>
                </div>
                <Link href="/dashboard/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un agent
                  </Button>
                </Link>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou rôle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {!loading && agents.length === 0 ? (
                <EmptyAgentsState />
              ) : (
                <AgentsTable
                  loading={loading}
                  filteredAgents={filteredAgents}
                  sortBy={sortBy}
                  onSort={handleSort}
                  onEdit={handleEditAgent}
                  onDelete={handleDeleteAgent}
                />
              )}
            </CardContent>
          </Card>

          {/* Dialogue d'édition d'agent */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier l'agent</DialogTitle>
                <DialogDescription>
                  Mettez à jour les informations de l'agent
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nom</Label>
                  <Input
                    id="edit-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Rôle</Label>
                  <Textarea
                    id="edit-role"
                    value={editedRole}
                    onChange={(e) => setEditedRole(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annuler</Button>
                <Button onClick={saveAgentChanges}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Onglet Recherche avancée */}
        <TabsContent value="search" className="w-full">
          <Card className="w-full border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl font-bold">Recherche avancée</CardTitle>
              <CardDescription>
                Recherchez des agents et des exécutions
              </CardDescription>

              <div className="flex flex-col space-y-4 mt-4">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={advancedSearchTerm}
                      onChange={(e) => setAdvancedSearchTerm(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="pl-8 w-full"
                    />
                  </div>
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="agents">Agents</SelectItem>
                      <SelectItem value="executions">Exécutions</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAdvancedSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? "Recherche..." : "Rechercher"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-0">
              <SearchResultsList searchResults={searchResults} advancedSearchTerm={advancedSearchTerm} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
