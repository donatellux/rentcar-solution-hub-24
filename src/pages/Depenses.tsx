
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, DollarSign, Car, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface VehicleExpense {
  id: string;
  vehicle_id: string | null;
  category: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  created_at: string | null;
  vehicles?: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
}

interface GlobalExpense {
  id: string;
  category: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  created_at: string | null;
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

export const Depenses: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [globalExpenses, setGlobalExpenses] = useState<GlobalExpense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vehicle');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<VehicleExpense | GlobalExpense | null>(null);

  const [vehicleFormData, setVehicleFormData] = useState({
    vehicle_id: '',
    category: '',
    amount: '',
    date: '',
    description: '',
  });

  const [globalFormData, setGlobalFormData] = useState({
    category: '',
    amount: '',
    date: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch vehicle expenses
      const { data: vehicleExpensesData, error: vehicleExpensesError } = await supabase
        .from('vehicle_expenses')
        .select(`
          *,
          vehicles (marque, modele, immatriculation)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (vehicleExpensesError) throw vehicleExpensesError;

      // Fetch global expenses
      const { data: globalExpensesData, error: globalExpensesError } = await supabase
        .from('global_expenses')
        .select('*')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false });

      if (globalExpensesError) throw globalExpensesError;

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, marque, modele, immatriculation')
        .eq('agency_id', user.id);

      if (vehiclesError) throw vehiclesError;

      setVehicleExpenses(vehicleExpensesData || []);
      setGlobalExpenses(globalExpensesData || []);
      setVehicles(vehiclesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVehicleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const expenseData = {
        ...vehicleFormData,
        amount: vehicleFormData.amount ? parseFloat(vehicleFormData.amount) : null,
        date: vehicleFormData.date || null,
        agency_id: user.id,
      };

      let error;
      if (editingExpense && 'vehicle_id' in editingExpense) {
        const { error: updateError } = await supabase
          .from('vehicle_expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('vehicle_expenses')
          .insert(expenseData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingExpense ? "Dépense modifiée avec succès" : "Dépense ajoutée avec succès",
      });

      setIsDialogOpen(false);
      setEditingExpense(null);
      resetForms();
      fetchData();
    } catch (error) {
      console.error('Error saving vehicle expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la dépense",
        variant: "destructive",
      });
    }
  };

  const handleSubmitGlobalExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const expenseData = {
        ...globalFormData,
        amount: globalFormData.amount ? parseFloat(globalFormData.amount) : null,
        date: globalFormData.date || null,
        agency_id: user.id,
      };

      let error;
      if (editingExpense && !('vehicle_id' in editingExpense)) {
        const { error: updateError } = await supabase
          .from('global_expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('global_expenses')
          .insert(expenseData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Succès",
        description: editingExpense ? "Dépense modifiée avec succès" : "Dépense ajoutée avec succès",
      });

      setIsDialogOpen(false);
      setEditingExpense(null);
      resetForms();
      fetchData();
    } catch (error) {
      console.error('Error saving global expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la dépense",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (expenseId: string, type: 'vehicle' | 'global') => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;

    try {
      const table = type === 'vehicle' ? 'vehicle_expenses' : 'global_expenses';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Dépense supprimée avec succès",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la dépense",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: VehicleExpense | GlobalExpense, type: 'vehicle' | 'global') => {
    setEditingExpense(expense);
    if (type === 'vehicle' && 'vehicle_id' in expense) {
      setVehicleFormData({
        vehicle_id: expense.vehicle_id || '',
        category: expense.category || '',
        amount: expense.amount?.toString() || '',
        date: expense.date ? expense.date.split('T')[0] : '',
        description: expense.description || '',
      });
    } else {
      setGlobalFormData({
        category: expense.category || '',
        amount: expense.amount?.toString() || '',
        date: expense.date ? expense.date.split('T')[0] : '',
        description: expense.description || '',
      });
    }
    setActiveTab(type);
    setIsDialogOpen(true);
  };

  const resetForms = () => {
    setVehicleFormData({
      vehicle_id: '',
      category: '',
      amount: '',
      date: '',
      description: '',
    });
    setGlobalFormData({
      category: '',
      amount: '',
      date: '',
      description: '',
    });
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'carburant':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'entretien':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'assurance':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'reparation':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredVehicleExpenses = vehicleExpenses.filter(expense =>
    `${expense.vehicles?.marque} ${expense.vehicles?.modele} ${expense.category} ${expense.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredGlobalExpenses = globalExpenses.filter(expense =>
    `${expense.category} ${expense.description}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dépenses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gérez vos dépenses véhicules et générales</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForms(); setEditingExpense(null); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle dépense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="vehicle">Dépense véhicule</TabsTrigger>
                <TabsTrigger value="global">Dépense générale</TabsTrigger>
              </TabsList>
              
              <TabsContent value="vehicle">
                <form onSubmit={handleSubmitVehicleExpense} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vehicle_id">Véhicule *</Label>
                      <Select value={vehicleFormData.vehicle_id} onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, vehicle_id: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionner un véhicule" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.marque} {vehicle.modele} - {vehicle.immatriculation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Catégorie *</Label>
                      <Select value={vehicleFormData.category} onValueChange={(value) => setVehicleFormData({ ...vehicleFormData, category: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="carburant">Carburant</SelectItem>
                          <SelectItem value="entretien">Entretien</SelectItem>
                          <SelectItem value="reparation">Réparation</SelectItem>
                          <SelectItem value="assurance">Assurance</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Montant (MAD) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={vehicleFormData.amount}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, amount: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={vehicleFormData.date}
                        onChange={(e) => setVehicleFormData({ ...vehicleFormData, date: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={vehicleFormData.description}
                      onChange={(e) => setVehicleFormData({ ...vehicleFormData, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingExpense ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="global">
                <form onSubmit={handleSubmitGlobalExpense} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="global_category">Catégorie *</Label>
                      <Select value={globalFormData.category} onValueChange={(value) => setGlobalFormData({ ...globalFormData, category: value })}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bureau">Bureau</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="personnel">Personnel</SelectItem>
                          <SelectItem value="fournitures">Fournitures</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="global_amount">Montant (MAD) *</Label>
                      <Input
                        id="global_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={globalFormData.amount}
                        onChange={(e) => setGlobalFormData({ ...globalFormData, amount: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="global_date">Date *</Label>
                      <Input
                        id="global_date"
                        type="date"
                        value={globalFormData.date}
                        onChange={(e) => setGlobalFormData({ ...globalFormData, date: e.target.value })}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="global_description">Description</Label>
                    <Textarea
                      id="global_description"
                      value={globalFormData.description}
                      onChange={(e) => setGlobalFormData({ ...globalFormData, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingExpense ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher une dépense..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="vehicle" className="w-full">
        <TabsList>
          <TabsTrigger value="vehicle">Dépenses véhicules</TabsTrigger>
          <TabsTrigger value="global">Dépenses générales</TabsTrigger>
        </TabsList>
        
        <TabsContent value="vehicle">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicleExpenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800 dark:to-red-900 rounded-full flex items-center justify-center">
                          <Car className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {expense.vehicles?.marque} {expense.vehicles?.modele}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {expense.vehicles?.immatriculation}
                          </p>
                        </div>
                      </div>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category || 'N/A'}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white font-bold text-lg">
                          {expense.amount} MAD
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {expense.date ? new Date(expense.date).toLocaleDateString() : 'Date non définie'}
                      </div>
                      {expense.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {expense.description}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(expense, 'vehicle')}
                        className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(expense.id, 'vehicle')}
                        className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="global">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGlobalExpenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 rounded-full flex items-center justify-center">
                          <Building className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            Dépense générale
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {expense.date ? new Date(expense.date).toLocaleDateString() : 'Date non définie'}
                          </p>
                        </div>
                      </div>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category || 'N/A'}
                      </Badge>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white font-bold text-lg">
                          {expense.amount} MAD
                        </span>
                      </div>
                      {expense.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {expense.description}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(expense, 'global')}
                        className="flex-1 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(expense.id, 'global')}
                        className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {!loading && filteredVehicleExpenses.length === 0 && filteredGlobalExpenses.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Aucune dépense trouvée
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? 'Aucune dépense ne correspond à votre recherche.' : 'Commencez par ajouter votre première dépense.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => { resetForms(); setEditingExpense(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle dépense
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
