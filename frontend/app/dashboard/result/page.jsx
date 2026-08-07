"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, FileText, Loader2, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const executionId = searchParams.get("executionId")

  const [execution, setExecution] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!executionId) {
      router.push("/dashboard")
      return
    }

    // Load execution from localStorage
    const executions = JSON.parse(localStorage.getItem("executions") || "[]")
    const foundExecution = executions.find((e) => e.id === executionId)

    if (!foundExecution) {
      router.push("/dashboard")
      return
    }

    setExecution(foundExecution)
    setLoading(false)
  }, [executionId, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-full pr-0">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>
        <h1 className="text-3xl font-bold">Résultat de vérification</h1>
      </div>

      <Card className="w-full mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>
                {execution.agentName}
                {execution.agentDeleted && (
                  <Badge variant="outline" className="ml-2 bg-muted text-muted-foreground">
                    Agent supprimé
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Exécuté le {new Date(execution.timestamp).toLocaleString()}</CardDescription>
            </div>
            <Badge
              variant={execution.result === "Légitime" ? "outline" : "destructive"}
              className={`text-sm px-3 py-1 ${
                execution.result === "Légitime"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-200 dark:border-green-800"
                  : ""
              }`}
            >
              {execution.result}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {execution.result === "Légitime" ? (
              <div className="flex flex-col items-center text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
                <h2 className="text-xl font-semibold">Documents vérifiés</h2>
                <p className="text-muted-foreground max-w-md">
                  L'agent IA a déterminé que les documents sont légitimes et cohérents.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <XCircle className="h-16 w-16 text-red-500 mb-2" />
                <h2 className="text-xl font-semibold">Fraude potentielle détectée</h2>
                <p className="text-muted-foreground max-w-md">
                  L'agent IA a détecté des incohérences qui pourraient indiquer une activité frauduleuse.
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="font-medium mb-2">Détails de l'analyse</h3>
            <div className="bg-muted p-4 rounded-md">
              <p>{execution.reason}</p>
            </div>
          </div>

          <Tabs defaultValue="invoices" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="invoices">Documents</TabsTrigger>
              <TabsTrigger value="missionOrders">Ordres du jour</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices" className="space-y-4">
              <h3 className="font-medium">Documents analysés - Documents</h3>
              <div className="grid gap-2">
                {execution.invoices &&
                  execution.invoices.map((doc, index) => (
                    <div key={index} className="flex items-center p-3 border rounded-md">
                      <FileText className="h-5 w-5 mr-2 text-blue-500" />
                      <span className="text-sm">{doc.name}</span>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="missionOrders" className="space-y-4">
              <h3 className="font-medium">Documents analysés - Ordres du jour</h3>
              <div className="grid gap-2">
                {execution.missionOrders &&
                  execution.missionOrders.map((doc, index) => (
                    <div key={index} className="flex items-center p-3 border rounded-md">
                      <FileText className="h-5 w-5 mr-2 text-green-500" />
                      <span className="text-sm">{doc.name}</span>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/dashboard/execute-agent?agentId=" + execution.agentId)}>
            Exécuter à nouveau
          </Button>
          <Button onClick={() => router.push("/dashboard/history")}>Voir l'historique</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
