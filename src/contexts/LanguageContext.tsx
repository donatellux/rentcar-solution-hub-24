import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LanguageContextType {
  language: 'fr' | 'ar';
  setLanguage: (lang: 'fr' | 'ar') => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.vehicles': 'Véhicules',
    'nav.reservations': 'Réservations',
    'nav.clients': 'Clients',
    'nav.statistics': 'Statistiques',
    'nav.calendar': 'Calendrier',
    'nav.documents': 'Documents',
    'nav.maintenance': 'Entretien',
    'nav.expenses': 'Dépenses',
    'nav.reports': 'Rapports',
    'nav.settings': 'Paramètres',
    
    // Common
    'common.add': 'Ajouter',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.cancel': 'Annuler',
    'common.save': 'Sauvegarder',
    'common.search': 'Rechercher',
    'common.loading': 'Chargement...',
    'common.noData': 'Aucune donnée disponible',
    'common.success': 'Succès',
    'common.error': 'Erreur',
    'common.previous': 'Précédent',
    'common.next': 'Suivant',
    'common.page': 'Page',
    'common.of': 'sur',
    'common.items': 'éléments',
    
    // Vehicles
    'vehicles.title': 'Véhicules',
    'vehicles.subtitle': 'Gérez votre flotte de véhicules',
    'vehicles.addVehicle': 'Ajouter un véhicule',
    'vehicles.editVehicle': 'Modifier le véhicule',
    'vehicles.searchPlaceholder': 'Rechercher un véhicule...',
    'vehicles.brand': 'Marque',
    'vehicles.model': 'Modèle',
    'vehicles.year': 'Année',
    'vehicles.registration': 'Immatriculation',
    'vehicles.color': 'Couleur',
    'vehicles.fuel': 'Carburant',
    'vehicles.transmission': 'Boîte de vitesse',
    'vehicles.mileage': 'Kilométrage',
    'vehicles.status': 'État',
    
    // Reservations
    'reservations.title': 'Réservations',
    'reservations.subtitle': 'Gérez vos réservations',
    'reservations.addReservation': 'Ajouter une réservation',
    'reservations.editReservation': 'Modifier la réservation',
    
    // Clients
    'clients.title': 'Clients',
    'clients.subtitle': 'Gérez votre base de clients',
    'clients.addClient': 'Ajouter un client',
    'clients.editClient': 'Modifier le client',
    'clients.searchPlaceholder': 'Rechercher un client...',
    'clients.firstName': 'Prénom',
    'clients.lastName': 'Nom',
    'clients.email': 'Email',
    'clients.phone': 'Téléphone',
    'clients.address': 'Adresse',
    'clients.cin': 'CIN',
    'clients.license': 'N° Permis',
    'clients.nationality': 'Nationalité',
    'clients.type': 'Type de client',
    
    // Statistics
    'statistics.title': 'Statistiques',
    'statistics.subtitle': 'Analysez vos performances',
    'statistics.totalVehicles': 'Total Véhicules',
    'statistics.activeReservations': 'Réservations Actives',
    'statistics.totalClients': 'Total Clients',
    'statistics.monthlyRevenue': 'Revenus Mensuels',
    'statistics.availableVehicles': 'Véhicules Disponibles',
    'statistics.vehiclesInMaintenance': 'En Maintenance',
    
    // Calendar
    'calendar.title': 'Calendrier de Disponibilité',
    'calendar.subtitle': 'Visualisez la disponibilité de vos véhicules',
    'calendar.searchVehicle': 'Rechercher un véhicule...',
    'calendar.available': 'Disponible',
    'calendar.reserved': 'Réservé',
    'calendar.maintenance': 'Maintenance',
    'calendar.outOfService': 'Hors service',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة القيادة',
    'nav.vehicles': 'المركبات',
    'nav.reservations': 'الحجوزات',
    'nav.clients': 'العملاء',
    'nav.statistics': 'الإحصائيات',
    'nav.calendar': 'التقويم',
    'nav.documents': 'الوثائق',
    'nav.maintenance': 'الصيانة',
    'nav.expenses': 'المصروفات',
    'nav.reports': 'التقارير',
    'nav.settings': 'الإعدادات',
    
    // Common
    'common.add': 'إضافة',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.search': 'بحث',
    'common.loading': 'جاري التحميل...',
    'common.noData': 'لا توجد بيانات متاحة',
    'common.success': 'نجح',
    'common.error': 'خطأ',
    'common.previous': 'السابق',
    'common.next': 'التالي',
    'common.page': 'صفحة',
    'common.of': 'من',
    'common.items': 'عناصر',
    
    // Vehicles
    'vehicles.title': 'المركبات',
    'vehicles.subtitle': 'إدارة أسطول المركبات',
    'vehicles.addVehicle': 'إضافة مركبة',
    'vehicles.editVehicle': 'تعديل المركبة',
    'vehicles.searchPlaceholder': 'البحث عن مركبة...',
    'vehicles.brand': 'الماركة',
    'vehicles.model': 'الطراز',
    'vehicles.year': 'السنة',
    'vehicles.registration': 'رقم التسجيل',
    'vehicles.color': 'اللون',
    'vehicles.fuel': 'الوقود',
    'vehicles.transmission': 'ناقل الحركة',
    'vehicles.mileage': 'المسافة المقطوعة',
    'vehicles.status': 'الحالة',
    
    // Reservations
    'reservations.title': 'الحجوزات',
    'reservations.subtitle': 'إدارة الحجوزات',
    'reservations.addReservation': 'إضافة حجز',
    'reservations.editReservation': 'تعديل الحجز',
    
    // Clients
    'clients.title': 'العملاء',
    'clients.subtitle': 'إدارة قاعدة العملاء',
    'clients.addClient': 'إضافة عميل',
    'clients.editClient': 'تعديل العميل',
    'clients.searchPlaceholder': 'البحث عن عميل...',
    'clients.firstName': 'الاسم الأول',
    'clients.lastName': 'اسم العائلة',
    'clients.email': 'البريد الإلكتروني',
    'clients.phone': 'الهاتف',
    'clients.address': 'العنوان',
    'clients.cin': 'رقم البطاقة الوطنية',
    'clients.license': 'رقم رخصة القيادة',
    'clients.nationality': 'الجنسية',
    'clients.type': 'نوع العميل',
    
    // Statistics
    'statistics.title': 'الإحصائيات',
    'statistics.subtitle': 'تحليل الأداء',
    'statistics.totalVehicles': 'إجمالي المركبات',
    'statistics.activeReservations': 'الحجوزات النشطة',
    'statistics.totalClients': 'إجمالي العملاء',
    'statistics.monthlyRevenue': 'الإيرادات الشهرية',
    'statistics.availableVehicles': 'المركبات المتاحة',
    'statistics.vehiclesInMaintenance': 'قيد الصيانة',
    
    // Calendar
    'calendar.title': 'تقويم التوفر',
    'calendar.subtitle': 'عرض توفر المركبات',
    'calendar.searchVehicle': 'البحث عن مركبة...',
    'calendar.available': 'متاح',
    'calendar.reserved': 'محجوز',
    'calendar.maintenance': 'صيانة',
    'calendar.outOfService': 'خارج الخدمة',
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'fr' | 'ar'>('fr');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['fr']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className={language === 'ar' ? 'rtl' : 'ltr'} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};