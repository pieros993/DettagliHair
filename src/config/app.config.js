export default {
  // ─── IDENTITÀ ────────────────────────────────────────────
  app: {
    name: 'Dettagli Studio', // Nome dell'app e della barberia
    tagline: 'Il tuo stile, sempre',
    logo: '✂', // Emoji logo (sostituibile con image uri)
    logoUri: null, // es. 'https://...' per usare immagine reale
    social: '@dettaglistudio', // Handle social per card
    email: 'info@barbermilano.it',
    phone: '+39 02 1234567',
    address: 'Via Montenapoleone 1, Milano',
    website: 'https://barbermilano.it',
    privacyUrl: 'https://barbermilano.it/privacy',
    termsUrl: 'https://barbermilano.it/termini',
  },

  // ─── DATABASE ────────────────────────────────────────────
  supabase: {
    url: 'https://tstnyakienwwkcmxiesb.supabase.co', 
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdG55YWtpZW53d2tjbXhpZXNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MjE1MDUsImV4cCI6MjA5NDI5NzUwNX0.Z8rpwuawBpYthSaICuouj123PBdZl03txNhnRL6tqHU',
  },

  // ─── TEMA ────────────────────────────────────────────────
  theme: {
    // Colori principali
    primary: '#1A1A1A', // Colore principale (bottoni, selezioni)
    primaryText: '#FFFFFF', // Testo su primary
    accent: '#F46036', // Colore accento (last minute, badge)
    background: '#FAFAFA', // Sfondo app utente
    surface: '#FFFFFF', // Card, input
    border: '#F0F0F0', // Bordi

    // Admin panel (dark)
    adminBackground: '#111111',
    adminSurface: '#1A1A1A',
    adminSurface2: '#2A2A2A',
    adminText: '#FFFFFF',
    adminTextMuted: '#666666',

    // Semantici
    success: '#1DB954',
    error: '#E53935',
    warning: '#F46036',
  },

  // ─── FUNZIONALITÀ ────────────────────────────────────────
  features: {
    calendarExport: true, // Aggiungi al calendario dopo prenotazione
    pushNotifications: true, // Notifiche push
    socialCardGenerator: true, // Generatore card social per admin
    guestBooking: false, // Prenotazione senza account
    multiLocation: false, // Multi-sede (future)
  },

  // ─── PRENOTAZIONI ────────────────────────────────────────
  booking: {
    slotIntervalMinutes: 30, // Intervallo slot prenotazioni
    maxDaysAhead: 30, // Quanti giorni avanti si può prenotare
    cancellationHours: 2, // Ore minime per cancellare
    reminderMinutes: [60, 15], // Reminder automatici (minuti prima)
  },

  // ─── EXPO / NOTIFICHE ────────────────────────────────────
  expo: {
    projectId: 'b4ef65b3-eb2c-4d43-b283-d202c8792b7b',
    notificationColor: '#1A1A1A',
  },
};
