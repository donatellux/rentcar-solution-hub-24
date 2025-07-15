import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, Mail, Lock, Building, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    agencyName: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      
      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans Rentcar Solution",
      });
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (signupForm.password.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(signupForm.email, signupForm.password, {
        agency_name: signupForm.agencyName,
        phone: signupForm.phone,
        address: signupForm.address,
      });

      if (error) {
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Inscription réussie",
        description: "Vérifiez votre email pour confirmer votre compte",
      });
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-elegant">
              <Car className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold gradient-text">
                Rentcar Solution
              </h1>
              <p className="text-muted-foreground text-sm">
                Luxury Car Rental Management
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">
            Gestion d'agences de location de voitures premium
          </p>
        </div>

        <Card className="shadow-elegant border-0">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Connexion</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Votre mot de passe"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gradient-primary border-0 shadow-elegant hover:shadow-glow transition-all-smooth" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-agency">Nom de l'agence</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-agency"
                        type="text"
                        placeholder="Nom de votre agence"
                        value={signupForm.agencyName}
                        onChange={(e) => setSignupForm({ ...signupForm, agencyName: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="Numéro de téléphone"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-address">Adresse</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-address"
                        type="text"
                        placeholder="Adresse de l'agence"
                        value={signupForm.address}
                        onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Mot de passe (min 6 caractères)"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="Confirmer le mot de passe"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                        className="pl-10 transition-all-smooth focus:shadow-glow"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full gradient-primary border-0 shadow-elegant hover:shadow-glow transition-all-smooth" disabled={loading}>
                    {loading ? "Inscription..." : "S'inscrire"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};