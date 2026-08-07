/*
  CONFIGURATION PUBLIQUE
  L'application fonctionne sans configuration en mode local.
  Pour les comptes, abonnements et la reconnaissance cloud, renseigne Supabase.
  Ne mets JAMAIS de clé Stripe secrète ou de clé Google privée dans ce fichier.
*/
window.LETZ_CONFIG = {
  appVersion: "4.0.0",
  appName: "Lëtzebuergesch am Auto",
  supabaseUrl: "",
  supabaseAnonKey: "",
  functionsBaseUrl: "",
  pricing: {
    monthly: 7.99,
    yearly: 59.99,
    currency: "EUR"
  },
  free: {
    lessons: 8,
    maxSessionMinutes: 20,
    cloudSpeechTestsPerMonth: 5
  },
  supportEmail: "",
  legalBusinessName: "À COMPLÉTER"
};
