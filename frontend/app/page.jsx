"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { saveUser } from "@/lib/user-store"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import Image from "next/image"

export default function AuthPage() {
  const router = useRouter()
  
  // Form states
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fonction pour évaluer la force du mot de passe
  const evaluatePasswordStrength = (value) => {
    let strength = 0
    
    // Longueur minimale
    if (value.length >= 8) strength += 25

    // Contient au moins un chiffre
    if (/\d/.test(value)) strength += 25

    // Contient au moins une lettre minuscule et une majuscule
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) strength += 25

    // Contient au moins un caractère spécial
    if (/[^a-zA-Z0-9]/.test(value)) strength += 25

    return strength
  }

  const handlePasswordChange = (e) => {
    const value = e.target.value
    setRegisterPassword(value)
    setPasswordStrength(evaluatePasswordStrength(value))
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return ""
    if (passwordStrength <= 25) return "Faible"
    if (passwordStrength <= 50) return "Moyen"
    if (passwordStrength <= 75) return "Bon"
    return "Fort"
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 25) return "bg-red-500"
    if (passwordStrength <= 50) return "bg-yellow-500"
    if (passwordStrength <= 75) return "bg-blue-500"
    return "bg-green-500"
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!loginEmail || !loginPassword) {
      setError("Veuillez remplir tous les champs")
      setIsLoading(false)
      return
    }

    try {
      const userData = {
        id: "user-" + Date.now(),
        name: loginEmail.split('@')[0] || "Utilisateur CDG",
        email: loginEmail,
        profileImage: null,
        token: "demo-jwt-token"
      }

      saveUser(userData)
      localStorage.setItem("isAuthenticated", "true")
      router.push("/dashboard")
    } catch (err) {
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    
    // Validation améliorée
    if (!registerName || !registerEmail || !registerPassword) {
      setError("Veuillez remplir tous les champs")
      setIsLoading(false)
      return
    }

    if (registerPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      setIsLoading(false)
      return
    }

    if (registerPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    if (!acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation")
      setIsLoading(false)
      return
    }

    try {
      const userData = {
        id: "user-" + Date.now(),
        name: registerName,
        email: registerEmail,
        profileImage: null,
        token: "demo-jwt-token"
      }
      
      saveUser(userData)
      // Initialiser un historique vide pour le nouvel utilisateur
      localStorage.setItem('executions', JSON.stringify([]));
      
      localStorage.setItem("isAuthenticated", "true")
      router.push("/dashboard")
    } catch (err) {
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = (e) => {
    e.preventDefault()
    setError("")

    if (!loginEmail) {
      setError("Veuillez entrer votre adresse email")
      return
    }

    // In a real application, this would send a request to the backend
    // For now, we'll just show the success message
    setResetSuccess(true)
  }

  const resetForm = () => {
    setForgotPasswordMode(false)
    setResetSuccess(false)
    setLoginEmail("")
    setLoginPassword("")
    setError("")
  }

  return (
         <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-light/20 via-background to-brand-light/30 p-4">
       <Card className="w-full max-w-md border-brand/20 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Image src="/CDGCAPITALIMAGE.png" alt="CDG Capital Logo" width={180} height={180} className="rounded-md shadow-2xl drop-shadow-2xl" priority />
          </div>
          <CardDescription>Simulation d'agents IA pour l'automatisation des processus robotiques</CardDescription>
        </CardHeader>
        <CardContent>
          {forgotPasswordMode ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-medium">Mot de passe oublié</h2>
                <p className="text-sm text-muted-foreground">
                  Entrez votre email pour recevoir un lien de réinitialisation
                </p>
              </div>
              
              {resetSuccess ? (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
                    Vérifiez votre boîte de réception et vos spams.
                  </AlertDescription>
                </Alert>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {error && <div className="text-sm text-destructive">{error}</div>}
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input 
                      id="reset-email" 
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nom@exemple.com" 
                      required 
                    />
                  </div>
                                     <Button type="submit" className="w-full bg-brand-green hover:bg-brand-green-dark text-white">
                     Envoyer le lien de réinitialisation
                   </Button>
                </form>
              )}
              
              <div className="text-center pt-2">
                <Button 
                  variant="link" 
                  onClick={resetForm}
                  className="text-sm"
                >
                  Retour à la page de connexion
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && <div className="text-sm text-destructive">{error}</div>}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="nom@exemple.com" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <Button 
                        variant="link" 
                        type="button"
                        className="text-sm p-0 h-auto"
                        onClick={() => setForgotPasswordMode(true)}
                      >
                        Mot de passe oublié?
                      </Button>
                    </div>
                    <Input 
                      id="login-password" 
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                  </div>
                                     <Button type="submit" className="w-full bg-brand-green hover:bg-brand-green-dark text-white" disabled={isLoading}>
                     Se connecter
                   </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && <div className="text-sm text-destructive">{error}</div>}
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nom complet</Label>
                    <Input 
                      id="register-name" 
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Anouar Belabbes" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email" 
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="nom@exemple.com" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <Input 
                      id="register-password" 
                      type="password"
                      value={registerPassword}
                      onChange={handlePasswordChange}
                      required 
                    />
                    {registerPassword && (
                      <div className="space-y-1 mt-1">
                        <Progress value={passwordStrength} className={getPasswordStrengthColor()} />
                        <p className="text-xs text-gray-500 flex justify-between">
                          <span>Force du mot de passe: {getPasswordStrengthText()}</span>
                          <span>{passwordStrength}%</span>
                        </p>
                        <ul className="text-xs text-gray-500 list-disc pl-5 mt-1">
                          <li className={registerPassword.length >= 8 ? "text-green-600" : ""}>
                            Au moins 8 caractères
                          </li>
                          <li className={/\d/.test(registerPassword) ? "text-green-600" : ""}>
                            Au moins un chiffre
                          </li>
                          <li className={/[a-z]/.test(registerPassword) && /[A-Z]/.test(registerPassword) ? "text-green-600" : ""}>
                            Minuscules et majuscules
                          </li>
                          <li className={/[^a-zA-Z0-9]/.test(registerPassword) ? "text-green-600" : ""}>
                            Au moins un caractère spécial
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required 
                    />
                    {confirmPassword && registerPassword !== confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="terms" 
                      checked={acceptTerms}
                      onCheckedChange={setAcceptTerms}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      J'accepte les{" "}
                      <Link href="#" className="text-primary underline-offset-4 hover:underline">
                        conditions d'utilisation
                      </Link>
                      {" "}et la{" "}
                      <Link href="#" className="text-primary underline-offset-4 hover:underline">
                        politique de confidentialité
                      </Link>
                    </label>
                  </div>
                                     <Button type="submit" className="w-full bg-brand-green hover:bg-brand-green-dark text-white" disabled={!acceptTerms || isLoading}>
                     Créer un compte
                   </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            En continuant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
