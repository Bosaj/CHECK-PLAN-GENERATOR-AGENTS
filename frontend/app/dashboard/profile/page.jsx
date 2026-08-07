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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
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
  User, 
  Upload, 
  Save, 
  ArrowLeft, 
  Shield, 
  Bell, 
  Globe, 
  Trash2, 
  LockKeyhole,
  Eye,
  EyeOff,
  Check,
  XCircle,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { getUser, updateUser, clearUser } from "@/lib/user-store"
import { userApi } from "@/lib/api-service"
import Link from "next/link"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [isLoading, setIsLoading] = useState(false)
  
  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" })
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  
  // Delete account fields
  const [confirmDelete, setConfirmDelete] = useState("")
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  
  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      router.push("/")
      return
    }
    
    setUser(userData)
    setName(userData.name || "")
    setEmail(userData.email || "")
    setImagePreview(userData.profileImage || null)
  }, [router])
  
  const getInitials = (name) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }
  
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Veuillez sélectionner une image" })
      return
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "L'image ne doit pas dépasser 2Mo" })
      return
    }
    
    setProfileImage(file)
    
    // Create a preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }
  
  const handleSubmitProfile = async (e) => {
    e.preventDefault()
    setMessage({ type: "", text: "" })
    setIsLoading(true)
    
    if (!name.trim()) {
      setMessage({ type: "error", text: "Le nom est requis" })
      setIsLoading(false)
      return
    }
    
    try {
      // Préparer les données pour l'API
      const profileData = {
        name,
        profileImage: imagePreview
      }
      
      // Appel à l'API pour mettre à jour le profil
      const updatedUser = await userApi.updateProfile(profileData)
      
      // Mettre à jour le stockage local
      const localUpdatedUser = updateUser({
        name: updatedUser.name,
        profileImage: updatedUser.profileImage
      })
      
      setUser(localUpdatedUser)
      setMessage({ type: "success", text: "Profil mis à jour avec succès" })
    } catch (error) {
      console.error("Error updating profile:", error)
      setMessage({ type: "error", text: error.message || "Une erreur est survenue. Veuillez réessayer." })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMessage({ type: "", text: "" })
    setIsPasswordLoading(true)
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "Tous les champs sont requis" })
      setIsPasswordLoading(false)
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Les mots de passe ne correspondent pas" })
      setIsPasswordLoading(false)
      return
    }
    
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères" })
      setIsPasswordLoading(false)
      return
    }
    
    try {
      // Préparer les données pour l'API
      const passwordData = {
        currentPassword,
        newPassword,
        confirmPassword
      }
      
      // Appel à l'API pour changer le mot de passe
      await userApi.changePassword(passwordData)
      
      // Clear fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
      setPasswordMessage({ type: "success", text: "Mot de passe modifié avec succès" })
    } catch (error) {
      console.error("Error changing password:", error)
      setPasswordMessage({ type: "error", text: error.message || "Une erreur est survenue. Veuillez réessayer." })
    } finally {
      setIsPasswordLoading(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    setIsDeleteLoading(true)
    
    try {
      // Appel à l'API pour supprimer le compte
      await userApi.deleteAccount()
      
      // Supprimer les données locales
      localStorage.removeItem("isAuthenticated")
      clearUser()
      
      // Rediriger vers la page de connexion
      router.push("/")
    } catch (error) {
      console.error("Error deleting account:", error)
      alert(error.message || "Une erreur est survenue lors de la suppression du compte.")
    } finally {
      setIsDeleteLoading(false)
    }
  }
  
  if (!user) {
    return null // Loading state
  }
  
  return (
    <div className="container max-w-4xl mx-auto">
      <div className="flex items-center mb-8 gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Paramètres du profil</h1>
      </div>
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="personal" className="flex items-center justify-center">
            <User className="mr-2 h-4 w-4" />
            Informations personnelles
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center justify-center">
            <Shield className="mr-2 h-4 w-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center justify-center">
            <Globe className="mr-2 h-4 w-4" />
            Paramètres avancés
          </TabsTrigger>
        </TabsList>
        
        {/* Onglet Informations personnelles */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Informations personnelles</CardTitle>
              <CardDescription>
                Gérez vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile} className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24">
                      {imagePreview ? (
                        <AvatarImage src={imagePreview} alt={name} />
                      ) : (
                        <AvatarFallback className="text-2xl">{getInitials(name)}</AvatarFallback>
                      )}
                    </Avatar>
                    
                    <div className="flex items-center">
                      <Label 
                        htmlFor="profile-image" 
                        className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Changer l'image
                      </Label>
                      <Input 
                        id="profile-image" 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet</Label>
                      <Input 
                        id="name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Votre nom" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        value={email}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        L'adresse email ne peut pas être modifiée
                      </p>
                    </div>
                  </div>
                </div>
                
                {message.text && (
                  <div className={`p-3 rounded-md ${
                    message.type === "error" ? "bg-destructive/15 text-destructive" : 
                    message.type === "success" ? "bg-green-500/15 text-green-600 dark:text-green-400" : ""
                  }`}>
                    {message.type === "success" ? (
                      <div className="flex items-center">
                        <Check className="h-4 w-4 mr-2" />
                        {message.text}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 mr-2" />
                        {message.text}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      "Enregistrer les modifications"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Onglet Sécurité */}
        <TabsContent value="security">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Modifier le mot de passe</CardTitle>
              <CardDescription>
                Changez votre mot de passe pour sécuriser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input 
                      id="current-password" 
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Entrez votre mot de passe actuel" 
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <Input 
                    id="new-password" 
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Entrez votre nouveau mot de passe" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input 
                    id="confirm-password" 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre nouveau mot de passe" 
                  />
                </div>
                
                {passwordMessage.text && (
                  <div className={`p-3 rounded-md ${
                    passwordMessage.type === "error" ? "bg-destructive/15 text-destructive" : 
                    passwordMessage.type === "success" ? "bg-green-500/15 text-green-600 dark:text-green-400" : ""
                  }`}>
                    {passwordMessage.type === "success" ? (
                      <div className="flex items-center">
                        <Check className="h-4 w-4 mr-2" />
                        {passwordMessage.text}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 mr-2" />
                        {passwordMessage.text}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={isPasswordLoading}>
                    {isPasswordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Modification...
                      </>
                    ) : (
                      "Modifier le mot de passe"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-destructive">Supprimer le compte</CardTitle>
              <CardDescription>
                Supprimez définitivement votre compte et toutes vos données
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-destructive mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Attention : Action irréversible</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      La suppression de votre compte est définitive et toutes vos données seront perdues.
                      Cette action ne peut pas être annulée.
                    </p>
                  </div>
                </div>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer mon compte
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer votre compte ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="mt-4">
                    <Label htmlFor="confirm-delete">Pour confirmer, tapez "SUPPRIMER" ci-dessous :</Label>
                    <Input 
                      id="confirm-delete"
                      className="mt-2"
                      value={confirmDelete}
                      onChange={(e) => setConfirmDelete(e.target.value)}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmDelete("")}>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount}
                      disabled={confirmDelete !== "SUPPRIMER" || isDeleteLoading}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isDeleteLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        "Supprimer définitivement"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Onglet Paramètres avancés */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Paramètres avancés</CardTitle>
              <CardDescription>
                Configurez les paramètres avancés de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">Notifications</h3>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Les paramètres de notification seront disponibles dans une prochaine mise à jour.
                </p>
              </div>
              
              <div className="space-y-4 mt-6">
                <h3 className="font-medium">Exportation des données</h3>
                <Separator />
                <p className="text-sm text-muted-foreground mb-2">
                  Téléchargez une copie de vos données personnelles.
                </p>
                <Button variant="outline">
                  Exporter mes données
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}