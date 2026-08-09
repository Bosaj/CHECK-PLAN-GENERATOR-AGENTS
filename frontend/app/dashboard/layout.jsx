"use client"

import { useEffect, useState } from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ModeToggle } from "@/components/mode-toggle"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Home, 
  Plus, 
  History, 
  LogOut, 
  Bot, 
  Settings,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { getUser, clearUser } from "@/lib/user-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    setIsClient(true)
    const isAuthenticated = localStorage.getItem("isAuthenticated")

    if (!isAuthenticated) {
      router.push("/")
    } else {
      // Load user data
      setUser(getUser())
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    clearUser()
    router.push("/")
  }

  const getInitials = (name) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (!isClient) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
                 <Sidebar className="bg-gradient-to-b from-brand-green-light/30 via-brand-light to-sidebar border-r border-brand/20">
                     <SidebarHeader className="p-4 border-b-2 border-brand/30 flex items-center justify-center bg-gradient-to-r from-brand-light/60 to-brand-green-light/40 shadow-lg min-h-[112px]">
            {/* Le logo n'a pas de fond transparent — le traiter comme un badge encadré
                avec du padding plutôt qu'un rectangle blanc flottant sans marge. */}
            <div className="rounded-xl bg-white p-2.5 shadow-lg">
              <Image
                src="/CDGCAPITALIMAGE.png"
                alt="CDG Capital Logo"
                width={96}
                height={96}
                style={{ width: "96px", height: "96px" }}
                className="rounded-md"
                priority
              />
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col justify-between h-full">
            <div>
              {/* User Profile Section */}
              {user && (
                <motion.div 
                  className="p-4 border-b border-sidebar-border mb-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-3 mb-1 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
                        <Avatar>
                          {user.profileImage ? (
                            <AvatarImage src={user.profileImage} alt={user.name} />
                          ) : (
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex flex-1 items-center justify-between">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <Link href="/dashboard/profile">
                        <DropdownMenuItem className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Paramètres du profil
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem 
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Déconnexion
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              )}

              <SidebarMenu>
                <Link href="/dashboard">
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Home className="mr-2 h-4 w-4" />
                      <span>Tableau de bord</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Link>
                <Link href="/dashboard/create">
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Créer un Agent</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Link>
                <Link href="/dashboard/agents">
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <Bot className="mr-2 h-4 w-4" />
                      <span>Gérer les agents</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Link>
                <Link href="/dashboard/history">
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <History className="mr-2 h-4 w-4" />
                      <span>Historique</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </Link>
              </SidebarMenu>
            </div>
          </SidebarContent>
          <SidebarFooter className="p-4 space-y-4">
            <motion.div 
              className="flex justify-between items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <span className="text-sm text-muted-foreground">Thème</span>
              <ModeToggle />
            </motion.div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto transition-all duration-300 w-full">
          {/* Sans ce bouton, la sidebar (qui passe en tiroir hors-écran sur mobile)
              n'a aucun moyen d'être ouverte — la navigation était inaccessible sur mobile. */}
          <div className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
            <SidebarTrigger />
            <span className="font-semibold">CDG Capital</span>
          </div>
          <motion.div
            className="p-6 w-full h-full max-w-7xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </motion.div>
        </main>
      </div>
    </SidebarProvider>
  )
}
