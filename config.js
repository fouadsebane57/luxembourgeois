/* =====================================================================
   LULU TRAJET · CONFIGURATION PUBLIQUE

   MODE D'EMPLOI
   1. Renseigne les trois valeurs marquées À REMPLIR.
   2. Enregistre ce fichier sous le nom exact  config.js
   3. Envoie-le à la racine du dépôt, à côté de index.html.

   Sans ces trois valeurs, la reconnaissance du luxembourgeois ne peut
   pas fonctionner. L'application te le dira clairement dans l'onglet
   Voix et micro, avec la valeur exacte qui manque.

   Ce fichier est PUBLIC. Il ne doit contenir que des valeurs publiques.
   Ne jamais y mettre :
     une clé secrète Supabase, sb_secret_ ou service_role
     une clé secrète Stripe, sk_live ou sk_test
     un secret de webhook, whsec_
     la clé privée du compte de service Google

   Ces valeurs vont uniquement dans les secrets des Edge Functions.
   ===================================================================== */
window.LULU_CONFIG = {
  appVersion: "5.1.0",
  appName: "LULU Trajet",

  // À REMPLIR · Supabase, menu Project Settings, section Data API.
  // Doit ressembler à https://xxxxxxxx.supabase.co
  supabaseUrl: "https://htmodckxiqdrnrwnripp.supabase.co",

  // À REMPLIR · Supabase, menu Project Settings, section API Keys.
  // Prends la clé PUBLIABLE, celle qui commence par sb_publishable_
  // ou, sur les anciens projets, la clé anon qui commence par eyJ
  // Cette clé est publique par conception, elle est protégée par la RLS.
  supabaseAnonKey: "sb_publishable_RS1iTvozqjWlmE4OOtx6Wg_oOv5FDKJ",

  // À REMPLIR · l'adresse Supabase ci-dessus, suivie de /functions/v1
  functionsBaseUrl: "https://htmodckxiqdrnrwnripp.supabase.co/functions/v1",

  pricing: { monthly: 7.99, yearly: 59.99, currency: "EUR" },

  free: {
    lessons: 8,
    maxSessionMinutes: 20,
    cloudSpeechTestsPerMonth: 30      // affichage seulement, le vrai quota est serveur
  },

  supportEmail: "",
  legalBusinessName: "À COMPLÉTER"
};

// Compatibilité avec la version précédente, qui lisait LETZ_CONFIG.
window.LETZ_CONFIG = window.LULU_CONFIG;
