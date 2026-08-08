/* =====================================================================
   CONFIGURATION PUBLIQUE

   ATTENTION : ne remplace PAS ton config.js existant par ce fichier.
   Recopie tes trois valeurs déjà renseignées dans le modèle ci-dessous,
   puis enregistre le résultat sous le nom config.js.

   Ce fichier ne doit contenir QUE des valeurs publiques.
   Ne jamais y mettre :
     sb_secret_...        clé secrète Supabase
     service_role         clé historique équivalente
     sk_live / sk_test    clé secrète Stripe
     whsec_...            secret de webhook Stripe
     la clé privée du compte de service Google

   Ces valeurs vont uniquement dans les secrets des Edge Functions.
   ===================================================================== */
window.LETZ_CONFIG = {
  appVersion: "5.0.0",
  appName: "Lëtzebuergesch am Auto",

  // Reprends ici les valeurs déjà présentes dans ton config.js actuel.
  supabaseUrl: "https://htmodckxiqdrnrwnripp.supabase.co",
  supabaseAnonKey: "",                 // clé publiable sb_publishable_... , publique par conception
  functionsBaseUrl: "https://htmodckxiqdrnrwnripp.supabase.co/functions/v1",

  pricing: { monthly: 7.99, yearly: 59.99, currency: "EUR" },

  free: {
    lessons: 8,
    maxSessionMinutes: 20,
    cloudSpeechTestsPerMonth: 30       // information affichée ; le vrai quota est serveur
  },

  supportEmail: "",
  legalBusinessName: "À COMPLÉTER"
};
