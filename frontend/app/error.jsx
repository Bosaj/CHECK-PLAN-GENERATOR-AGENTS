"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Erreur non gérée:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="text-muted-foreground">
          Une erreur inattendue s'est produite. Vous pouvez réessayer ou revenir au tableau de bord.
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => reset()}>Réessayer</Button>
          <Button asChild>
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
