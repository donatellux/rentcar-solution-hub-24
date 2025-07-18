
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
    'common.logout': 'Déconnexion',
    'common.actions': 'Actions',
    'common.status': 'Statut',
    'common.total': 'Total',
    'common.available': 'Disponible',
    'common.reserved': 'Réservé',
    'common.maintenance': 'Maintenance',
    'common.outOfService': 'Hors service',
    'common.view': 'Voir',
    'common.close': 'Fermer',
    'common.confirm': 'Confirmer',
    'common.date': 'Date',
    'common.amount': 'Montant',
    'common.description': 'Description',
    'common.category': 'Catégorie',
    'common.type': 'Type',
    'common.details': 'Détails',
    'common.filters': 'Filtres',
    'common.apply': 'Appliquer',
    'common.reset': 'Réinitialiser',
    'common.export': 'Exporter',
    'common.import': 'Importer',
    'common.print': 'Imprimer',
    'common.refresh': 'Actualiser',
    'common.showing': 'Affichage',
    'common.results': 'résultats',
    'common.name': 'Nom',
    'common.phone': 'Téléphone',
    'common.email': 'Email',
    'common.address': 'Adresse',
    'common.price': 'Prix',
    'common.startDate': 'Date de début',
    'common.endDate': 'Date de fin',
    'common.notes': 'Notes',
    'common.createdAt': 'Créé le',
    'common.updatedAt': 'Modifié le',
    
    // Dashboard
    'dashboard.title': 'Tableau de Bord',
    'dashboard.subtitle': 'Vue d\'ensemble de votre activité',
    'dashboard.welcomeBack': 'Bon retour',
    'dashboard.quickStats': 'Statistiques rapides',
    'dashboard.recentActivity': 'Activité récente',
    'dashboard.upcomingReservations': 'Réservations à venir',
    'dashboard.vehicleStatus': 'État des véhicules',
    'dashboard.todaysReservations': 'Réservations d\'aujourd\'hui',
    'dashboard.monthlyRevenue': 'Revenus mensuels',
    'dashboard.totalVehicles': 'Total véhicules',
    'dashboard.activeClients': 'Clients actifs',
    
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
    'vehicles.pricePerDay': 'Prix par jour',
    'vehicles.noVehicles': 'Aucun véhicule trouvé',
    'vehicles.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer ce véhicule ?',
    'vehicles.image': 'Image',
    'vehicles.features': 'Équipements',
    'vehicles.insurance': 'Assurance',
    'vehicles.lastMaintenance': 'Dernière maintenance',
    
    // Reservations
    'reservations.title': 'Réservations',
    'reservations.subtitle': 'Gérez vos réservations',
    'reservations.addReservation': 'Ajouter une réservation',
    'reservations.editReservation': 'Modifier la réservation',
    'reservations.searchPlaceholder': 'Rechercher une réservation...',
    'reservations.startDate': 'Date de début',
    'reservations.endDate': 'Date de fin',
    'reservations.client': 'Client',
    'reservations.vehicle': 'Véhicule',
    'reservations.totalPrice': 'Prix total',
    'reservations.deposit': 'Acompte',
    'reservations.notes': 'Notes',
    'reservations.noReservations': 'Aucune réservation trouvée',
    'reservations.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer cette réservation ?',
    'reservations.pending': 'En attente',
    'reservations.confirmed': 'Confirmée',
    'reservations.inProgress': 'En cours',
    'reservations.completed': 'Terminée',
    'reservations.cancelled': 'Annulée',
    'reservations.duration': 'Durée',
    'reservations.days': 'jours',
    'reservations.pickupLocation': 'Lieu de prise',
    'reservations.returnLocation': 'Lieu de retour',
    
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
    'clients.noClients': 'Aucun client trouvé',
    'clients.deleteConfirm': 'Êtes-vous sûr de vouloir supprimer ce client ?',
    'clients.dateOfBirth': 'Date de naissance',
    'clients.gender': 'Sexe',
    'clients.emergencyContact': 'Contact d\'urgence',
    'clients.totalReservations': 'Total réservations',
    'clients.lastReservation': 'Dernière réservation',
    
    // Statistics
    'statistics.title': 'Statistiques',
    'statistics.subtitle': 'Analysez vos performances',
    'statistics.dashboard': 'Tableau de Bord',
    'statistics.dashboardSubtitle': 'Vue d\'ensemble de votre agence de location',
    'statistics.totalRevenue': 'Revenus Totaux',
    'statistics.netProfit': 'Bénéfice Net',
    'statistics.totalReservations': 'Réservations',
    'statistics.fleetSize': 'Parc Automobile',
    'statistics.activeReservations': 'Réservations Actives',
    'statistics.totalClients': 'Total Clients',
    'statistics.monthlyRevenue': 'Revenus Mensuels',
    'statistics.availableVehicles': 'Véhicules Disponibles',
    'statistics.vehiclesInMaintenance': 'En Maintenance',
    'statistics.revenueEvolution': 'Évolution des Revenus',
    'statistics.vehiclePerformance': 'Performance des Véhicules',
    'statistics.expenseBreakdown': 'Répartition des Dépenses',
    'statistics.reservationStatus': 'Statut des Réservations',
    'statistics.period': 'Période',
    'statistics.thisYear': 'Cette année',
    'statistics.thisMonth': 'Ce mois',
    'statistics.lastMonth': 'Mois dernier',
    'statistics.allPeriods': 'Toutes les périodes',
    'statistics.allVehicles': 'Tous les véhicules',
    'statistics.startDate': 'Date de début',
    'statistics.endDate': 'Date de fin',
    'statistics.margin': 'Marge',
    'statistics.activeLabel': 'actives',
    'statistics.clientsLabel': 'clients',
    'statistics.vehiclesLabel': 'véhicules',
    'statistics.noExpenseData': 'Aucune dépense enregistrée',
    'statistics.noReservationData': 'Aucune réservation trouvée',
    
    // Calendar
    'calendar.title': 'Calendrier de Disponibilité',
    'calendar.subtitle': 'Visualisez la disponibilité de vos véhicules',
    'calendar.searchVehicle': 'Rechercher un véhicule...',
    'calendar.available': 'Disponible',
    'calendar.reserved': 'Réservé',
    'calendar.maintenance': 'Maintenance',
    'calendar.outOfService': 'Hors service',
    'calendar.today': 'Aujourd\'hui',
    'calendar.thisWeek': 'Cette semaine',
    'calendar.thisMonth': 'Ce mois',
    'calendar.nextMonth': 'Mois prochain',
    'calendar.selectDate': 'Sélectionner une date',
    'calendar.noEvents': 'Aucun événement',
    
    // Expenses
    'expenses.title': 'Dépenses',
    'expenses.subtitle': 'Gérez vos dépenses',
    'expenses.addExpense': 'Ajouter une dépense',
    'expenses.editExpense': 'Modifier la dépense',
    'expenses.vehicleExpenses': 'Dépenses véhicules',
    'expenses.globalExpenses': 'Dépenses générales',
    'expenses.noExpenses': 'Aucune dépense trouvée',
    'expenses.fuel': 'Carburant',
    'expenses.insurance': 'Assurance',
    'expenses.repair': 'Réparation',
    'expenses.generalMaintenance': 'Entretien général',
    'expenses.office': 'Bureau',
    'expenses.marketing': 'Marketing',
    'expenses.other': 'Autre',
    'expenses.receipt': 'Reçu',
    'expenses.supplier': 'Fournisseur',
    'expenses.paymentMethod': 'Mode de paiement',
    
    // Maintenance
    'maintenance.title': 'Entretien',
    'maintenance.subtitle': 'Gérez l\'entretien de vos véhicules',
    'maintenance.addMaintenance': 'Ajouter un entretien',
    'maintenance.editMaintenance': 'Modifier l\'entretien',
    'maintenance.noMaintenance': 'Aucun entretien trouvé',
    'maintenance.oilChange': 'Vidange',
    'maintenance.tireRotation': 'Rotation des pneus',
    'maintenance.brakeInspection': 'Inspection des freins',
    'maintenance.engineTuneUp': 'Révision moteur',
    'maintenance.scheduled': 'Programmé',
    'maintenance.completed': 'Terminé',
    'maintenance.overdue': 'En retard',
    'maintenance.nextDue': 'Prochain échéance',
    'maintenance.cost': 'Coût',
    'maintenance.mechanic': 'Mécanicien',
    'maintenance.garage': 'Garage',
    
    // Documents
    'documents.title': 'Documents',
    'documents.subtitle': 'Gérez vos documents',
    'documents.addDocument': 'Ajouter un document',
    'documents.noDocuments': 'Aucun document trouvé',
    'documents.contract': 'Contrat',
    'documents.invoice': 'Facture',
    'documents.receipt': 'Reçu',
    'documents.insurance': 'Assurance',
    'documents.registration': 'Carte grise',
    'documents.license': 'Permis',
    'documents.other': 'Autre',
    'documents.uploadDate': 'Date d\'upload',
    'documents.fileSize': 'Taille du fichier',
    'documents.fileType': 'Type de fichier',
    'documents.download': 'Télécharger',
    'documents.preview': 'Aperçu',
    
    // Settings
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Configurez votre application',
    'settings.profile': 'Profil',
    'settings.agency': 'Agence',
    'settings.preferences': 'Préférences',
    'settings.language': 'Langue',
    'settings.theme': 'Thème',
    'settings.notifications': 'Notifications',
    'settings.security': 'Sécurité',
    'settings.backup': 'Sauvegarde',
    'settings.integrations': 'Intégrations',
    'settings.billing': 'Facturation',
    'settings.support': 'Support',
    
    // Forms
    'form.required': 'Champ obligatoire',
    'form.invalidEmail': 'Email invalide',
    'form.invalidPhone': 'Numéro de téléphone invalide',
    'form.passwordTooShort': 'Mot de passe trop court',
    'form.passwordsDoNotMatch': 'Les mots de passe ne correspondent pas',
    'form.selectOption': 'Sélectionner une option',
    'form.uploadFile': 'Télécharger un fichier',
    'form.dragDropFile': 'Glisser-déposer ou cliquer pour sélectionner',
    'form.fileTooBig': 'Fichier trop volumineux',
    'form.invalidFileType': 'Type de fichier non supporté',
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
    'common.logout': 'تسجيل الخروج',
    'common.actions': 'إجراءات',
    'common.status': 'الحالة',
    'common.total': 'المجموع',
    'common.available': 'متاح',
    'common.reserved': 'محجوز',
    'common.maintenance': 'صيانة',
    'common.outOfService': 'خارج الخدمة',
    'common.view': 'عرض',
    'common.close': 'إغلاق',
    'common.confirm': 'تأكيد',
    'common.date': 'التاريخ',
    'common.amount': 'المبلغ',
    'common.description': 'الوصف',
    'common.category': 'الفئة',
    'common.type': 'النوع',
    'common.details': 'التفاصيل',
    'common.filters': 'المرشحات',
    'common.apply': 'تطبيق',
    'common.reset': 'إعادة تعيين',
    'common.export': 'تصدير',
    'common.import': 'استيراد',
    'common.print': 'طباعة',
    'common.refresh': 'تحديث',
    'common.showing': 'عرض',
    'common.results': 'نتائج',
    'common.name': 'الاسم',
    'common.phone': 'الهاتف',
    'common.email': 'البريد الإلكتروني',
    'common.address': 'العنوان',
    'common.price': 'السعر',
    'common.startDate': 'تاريخ البداية',
    'common.endDate': 'تاريخ الانتهاء',
    'common.notes': 'ملاحظات',
    'common.createdAt': 'تاريخ الإنشاء',
    'common.updatedAt': 'تاريخ التحديث',
    
    // Dashboard
    'dashboard.title': 'لوحة القيادة',
    'dashboard.subtitle': 'نظرة عامة على نشاطك',
    'dashboard.welcomeBack': 'مرحباً بعودتك',
    'dashboard.quickStats': 'إحصائيات سريعة',
    'dashboard.recentActivity': 'النشاط الأخير',
    'dashboard.upcomingReservations': 'الحجوزات القادمة',
    'dashboard.vehicleStatus': 'حالة المركبات',
    'dashboard.todaysReservations': 'حجوزات اليوم',
    'dashboard.monthlyRevenue': 'الإيرادات الشهرية',
    'dashboard.totalVehicles': 'إجمالي المركبات',
    'dashboard.activeClients': 'العملاء النشطون',
    
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
    'vehicles.pricePerDay': 'السعر يومياً',
    'vehicles.noVehicles': 'لم يتم العثور على مركبات',
    'vehicles.deleteConfirm': 'هل أنت متأكد من حذف هذه المركبة؟',
    'vehicles.image': 'الصورة',
    'vehicles.features': 'المميزات',
    'vehicles.insurance': 'التأمين',
    'vehicles.lastMaintenance': 'آخر صيانة',
    
    // Reservations
    'reservations.title': 'الحجوزات',
    'reservations.subtitle': 'إدارة الحجوزات',
    'reservations.addReservation': 'إضافة حجز',
    'reservations.editReservation': 'تعديل الحجز',
    'reservations.searchPlaceholder': 'البحث عن حجز...',
    'reservations.startDate': 'تاريخ البداية',
    'reservations.endDate': 'تاريخ الانتهاء',
    'reservations.client': 'العميل',
    'reservations.vehicle': 'المركبة',
    'reservations.totalPrice': 'السعر الإجمالي',
    'reservations.deposit': 'العربون',
    'reservations.notes': 'ملاحظات',
    'reservations.noReservations': 'لم يتم العثور على حجوزات',
    'reservations.deleteConfirm': 'هل أنت متأكد من حذف هذا الحجز؟',
    'reservations.pending': 'في الانتظار',
    'reservations.confirmed': 'مؤكد',
    'reservations.inProgress': 'جاري',
    'reservations.completed': 'مكتمل',
    'reservations.cancelled': 'ملغي',
    'reservations.duration': 'المدة',
    'reservations.days': 'أيام',
    'reservations.pickupLocation': 'مكان الاستلام',
    'reservations.returnLocation': 'مكان الإرجاع',
    
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
    'clients.noClients': 'لم يتم العثور على عملاء',
    'clients.deleteConfirm': 'هل أنت متأكد من حذف هذا العميل؟',
    'clients.dateOfBirth': 'تاريخ الميلاد',
    'clients.gender': 'الجنس',
    'clients.emergencyContact': 'جهة الاتصال في حالات الطوارئ',
    'clients.totalReservations': 'إجمالي الحجوزات',
    'clients.lastReservation': 'آخر حجز',
    
    // Statistics
    'statistics.title': 'الإحصائيات',
    'statistics.subtitle': 'تحليل الأداء',
    'statistics.dashboard': 'لوحة القيادة',
    'statistics.dashboardSubtitle': 'نظرة عامة على وكالة التأجير',
    'statistics.totalRevenue': 'إجمالي الإيرادات',
    'statistics.netProfit': 'صافي الربح',
    'statistics.totalReservations': 'الحجوزات',
    'statistics.fleetSize': 'الأسطول',
    'statistics.activeReservations': 'الحجوزات النشطة',
    'statistics.totalClients': 'إجمالي العملاء',
    'statistics.monthlyRevenue': 'الإيرادات الشهرية',
    'statistics.availableVehicles': 'المركبات المتاحة',
    'statistics.vehiclesInMaintenance': 'قيد الصيانة',
    'statistics.revenueEvolution': 'تطور الإيرادات',
    'statistics.vehiclePerformance': 'أداء المركبات',
    'statistics.expenseBreakdown': 'تفصيل المصروفات',
    'statistics.reservationStatus': 'حالة الحجوزات',
    'statistics.period': 'الفترة',
    'statistics.thisYear': 'هذا العام',
    'statistics.thisMonth': 'هذا الشهر',
    'statistics.lastMonth': 'الشهر الماضي',
    'statistics.allPeriods': 'جميع الفترات',
    'statistics.allVehicles': 'جميع المركبات',
    'statistics.startDate': 'تاريخ البداية',
    'statistics.endDate': 'تاريخ الانتهاء',
    'statistics.margin': 'الهامش',
    'statistics.activeLabel': 'نشطة',
    'statistics.clientsLabel': 'عملاء',
    'statistics.vehiclesLabel': 'مركبات',
    'statistics.noExpenseData': 'لا توجد مصروفات مسجلة',
    'statistics.noReservationData': 'لا توجد حجوزات',
    
    // Calendar
    'calendar.title': 'تقويم التوفر',
    'calendar.subtitle': 'عرض توفر المركبات',
    'calendar.searchVehicle': 'البحث عن مركبة...',
    'calendar.available': 'متاح',
    'calendar.reserved': 'محجوز',
    'calendar.maintenance': 'صيانة',
    'calendar.outOfService': 'خارج الخدمة',
    'calendar.today': 'اليوم',
    'calendar.thisWeek': 'هذا الأسبوع',
    'calendar.thisMonth': 'هذا الشهر',
    'calendar.nextMonth': 'الشهر القادم',
    'calendar.selectDate': 'اختر تاريخ',
    'calendar.noEvents': 'لا توجد أحداث',
    
    // Expenses
    'expenses.title': 'المصروفات',
    'expenses.subtitle': 'إدارة المصروفات',
    'expenses.addExpense': 'إضافة مصروف',
    'expenses.editExpense': 'تعديل المصروف',
    'expenses.vehicleExpenses': 'مصروفات المركبات',
    'expenses.globalExpenses': 'المصروفات العامة',
    'expenses.noExpenses': 'لا توجد مصروفات',
    'expenses.fuel': 'الوقود',
    'expenses.insurance': 'التأمين',
    'expenses.repair': 'الإصلاح',
    'expenses.generalMaintenance': 'الصيانة العامة',
    'expenses.office': 'المكتب',
    'expenses.marketing': 'التسويق',
    'expenses.other': 'أخرى',
    'expenses.receipt': 'الإيصال',
    'expenses.supplier': 'المورد',
    'expenses.paymentMethod': 'طريقة الدفع',
    
    // Maintenance
    'maintenance.title': 'الصيانة',
    'maintenance.subtitle': 'إدارة صيانة المركبات',
    'maintenance.addMaintenance': 'إضافة صيانة',
    'maintenance.editMaintenance': 'تعديل الصيانة',
    'maintenance.noMaintenance': 'لا توجد صيانة',
    'maintenance.oilChange': 'تغيير الزيت',
    'maintenance.tireRotation': 'دوران الإطارات',
    'maintenance.brakeInspection': 'فحص الفرامل',
    'maintenance.engineTuneUp': 'ضبط المحرك',
    'maintenance.scheduled': 'مجدول',
    'maintenance.completed': 'مكتمل',
    'maintenance.overdue': 'متأخر',
    'maintenance.nextDue': 'الاستحقاق التالي',
    'maintenance.cost': 'التكلفة',
    'maintenance.mechanic': 'الميكانيكي',
    'maintenance.garage': 'الكراج',
    
    // Documents
    'documents.title': 'الوثائق',
    'documents.subtitle': 'إدارة الوثائق',
    'documents.addDocument': 'إضافة وثيقة',
    'documents.noDocuments': 'لا توجد وثائق',
    'documents.contract': 'العقد',
    'documents.invoice': 'الفاتورة',
    'documents.receipt': 'الإيصال',
    'documents.insurance': 'التأمين',
    'documents.registration': 'التسجيل',
    'documents.license': 'الرخصة',
    'documents.other': 'أخرى',
    'documents.uploadDate': 'تاريخ الرفع',
    'documents.fileSize': 'حجم الملف',
    'documents.fileType': 'نوع الملف',
    'documents.download': 'تحميل',
    'documents.preview': 'معاينة',
    
    // Settings
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'تكوين التطبيق',
    'settings.profile': 'الملف الشخصي',
    'settings.agency': 'الوكالة',
    'settings.preferences': 'التفضيلات',
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.notifications': 'الإشعارات',
    'settings.security': 'الأمان',
    'settings.backup': 'النسخ الاحتياطي',
    'settings.integrations': 'التكاملات',
    'settings.billing': 'الفواتير',
    'settings.support': 'الدعم',
    
    // Forms
    'form.required': 'حقل مطلوب',
    'form.invalidEmail': 'بريد إلكتروني غير صحيح',
    'form.invalidPhone': 'رقم هاتف غير صحيح',
    'form.passwordTooShort': 'كلمة المرور قصيرة جداً',
    'form.passwordsDoNotMatch': 'كلمات المرور غير متطابقة',
    'form.selectOption': 'اختر خيار',
    'form.uploadFile': 'رفع ملف',
    'form.dragDropFile': 'اسحب وأفلت أو انقر للاختيار',
    'form.fileTooBig': 'الملف كبير جداً',
    'form.invalidFileType': 'نوع ملف غير مدعوم',
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
