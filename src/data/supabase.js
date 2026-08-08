/* ===================================================================
   SUPABASE

   Le client est chargé depuis un fichier local, pas depuis un CDN tiers.
   Trois raisons :
     l'application continue de fonctionner si le CDN tombe,
     le hors ligne fonctionne vraiment,
     aucune adresse IP d'utilisateur n'est transmise à un tiers non déclaré.

   La clé publiable est faite pour être publique. Elle ne donne accès
   à rien tant que les policies RLS ne l'autorisent pas.
   Aucune clé secrète, de service ou Google ne doit figurer ici.
   =================================================================== */

const CFG = () => window.LETZ_CONFIG || {};

let client = null;
let utilisateur = null;
const abonnes = new Set();

export const configure = () => !!(CFG().supabaseUrl && CFG().supabaseAnonKey);
export const dispo = () => !!client;
export const user = () => utilisateur;
export function surChangement(fn) { abonnes.add(fn); return () => abonnes.delete(fn); }
const notifier = () => abonnes.forEach((f) => { try { f(utilisateur); } catch (_) {} });

export async function init() {
  if (!configure()) return { ok: false, raison: "Supabase n'est pas configuré dans config.js." };
  if (client) return { ok: true };
  try {
    // Fichier vendorisé dans le dépôt. Voir docs/DEPLOIEMENT.md étape 2.
    const mod = await import("../vendor/supabase.esm.js");
    client = mod.createClient(CFG().supabaseUrl, CFG().supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      global: { headers: { "x-application-name": "lulu-trajet" } }
    });
  } catch (err) {
    return { ok: false, raison: "Client Supabase introuvable: " + err.message };
  }
  try {
    const { data } = await client.auth.getSession();
    utilisateur = data?.session?.user || null;
    client.auth.onAuthStateChange((_evt, session) => {
      utilisateur = session?.user || null;
      notifier();
    });
  } catch (err) {
    return { ok: false, raison: "Session illisible: " + err.message };
  }
  notifier();
  return { ok: true };
}

export async function jetonAcces() {
  if (!client) return "";
  try { const { data } = await client.auth.getSession(); return data?.session?.access_token || ""; }
  catch (_) { return ""; }
}

/* ---------- Authentification ---------- */

const ERREURS = {
  "Invalid login credentials": "Email ou mot de passe incorrect.",
  "Email not confirmed": "Adresse email non confirmée. Vérifie ta boîte de réception.",
  "User already registered": "Un compte existe déjà avec cette adresse.",
  "Password should be at least 6 characters": "Le mot de passe est trop court.",
  "Email rate limit exceeded": "Trop de tentatives. Réessaie dans quelques minutes.",
  "over_email_send_rate_limit": "Trop d'emails envoyés. Réessaie plus tard."
};
const humain = (e) => ERREURS[e?.message] || ERREURS[e?.code] || e?.message || "Une erreur est survenue.";

export async function inscription(email, motDePasse) {
  if (!client) return { ok: false, message: "Comptes indisponibles. Configure Supabase." };
  if (String(motDePasse).length < 10) return { ok: false, message: "Utilise au moins 10 caractères." };
  const { error } = await client.auth.signUp({
    email: String(email).trim(),
    password: motDePasse,
    options: { emailRedirectTo: location.origin + location.pathname }
  });
  return error ? { ok: false, message: humain(error) }
               : { ok: true, message: "Compte créé. Ouvre l'email de confirmation pour activer ton compte." };
}

export async function connexion(email, motDePasse) {
  if (!client) return { ok: false, message: "Comptes indisponibles. Configure Supabase." };
  const { error } = await client.auth.signInWithPassword({ email: String(email).trim(), password: motDePasse });
  return error ? { ok: false, message: humain(error) } : { ok: true, message: "Connexion réussie." };
}

export async function deconnexion() {
  if (!client) return { ok: true, message: "" };
  await client.auth.signOut({ scope: "local" });
  utilisateur = null;
  notifier();
  return { ok: true, message: "Déconnecté." };
}

export async function motDePasseOublie(email) {
  if (!client) return { ok: false, message: "Comptes indisponibles." };
  const { error } = await client.auth.resetPasswordForEmail(String(email).trim(), {
    redirectTo: location.origin + location.pathname + "?route=account&reset=1"
  });
  return error ? { ok: false, message: humain(error) }
               : { ok: true, message: "Si un compte existe, un email de réinitialisation vient d'être envoyé." };
}

export async function definirMotDePasse(nouveau) {
  if (!client) return { ok: false, message: "Comptes indisponibles." };
  if (String(nouveau).length < 10) return { ok: false, message: "Utilise au moins 10 caractères." };
  const { error } = await client.auth.updateUser({ password: nouveau });
  return error ? { ok: false, message: humain(error) } : { ok: true, message: "Mot de passe mis à jour." };
}

/* ---------- Profil et droits ---------- */

export async function lireProfil() {
  if (!client || !utilisateur) return null;
  const { data, error } = await client.from("profiles").select("*").eq("id", utilisateur.id).maybeSingle();
  if (error) { console.warn("Profil", error.message); return null; }
  return data;
}

export async function majProfil(champs) {
  if (!client || !utilisateur) return { ok: false, message: "Non connecté." };
  const { error } = await client.from("profiles").update(champs).eq("id", utilisateur.id);
  return error ? { ok: false, message: humain(error) } : { ok: true, message: "Profil enregistré." };
}

/**
 * Droits Premium. Lus exclusivement côté serveur.
 * Le frontend ne décide jamais seul. En cas de doute, on retombe sur gratuit.
 */
export async function lireDroits() {
  if (!client || !utilisateur) return { premium: false, source: "anonyme", statut: "local" };
  const { data, error } = await client
    .from("subscriptions")
    .select("status,current_period_end,plan")
    .eq("user_id", utilisateur.id)
    .maybeSingle();
  if (error || !data) return { premium: false, source: "serveur", statut: "inactive" };
  const actif = ["active", "trialing"].includes(data.status)
    && (!data.current_period_end || new Date(data.current_period_end).getTime() > Date.now());
  return { premium: actif, source: "serveur", statut: data.status, plan: data.plan || "free", fin: data.current_period_end };
}

/* ---------- Progression ---------- */

export async function tirerProgression() {
  if (!client || !utilisateur) return null;
  const { data, error } = await client
    .from("user_progress").select("snapshot,updated_at")
    .eq("user_id", utilisateur.id).maybeSingle();
  if (error) { console.warn("Lecture progression", error.message); return null; }
  return data || null;
}

export async function pousserProgression(snapshot) {
  if (!client || !utilisateur) return { ok: false, message: "Non connecté." };
  const { error } = await client.from("user_progress").upsert({
    user_id: utilisateur.id,
    snapshot,
    content_version: snapshot.contentVersion || "",
    device_id: snapshot.deviceId || "",
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  return error ? { ok: false, message: humain(error) } : { ok: true };
}

/** Export complet, obligation RGPD de portabilité. */
export async function exporterDonnees() {
  if (!client || !utilisateur) return null;
  const [p, pr, s, u] = await Promise.all([
    client.from("profiles").select("*").eq("id", utilisateur.id).maybeSingle(),
    client.from("user_progress").select("*").eq("user_id", utilisateur.id).maybeSingle(),
    client.from("subscriptions").select("*").eq("user_id", utilisateur.id).maybeSingle(),
    client.from("speech_usage").select("*").eq("user_id", utilisateur.id)
  ]);
  return {
    exporteLe: new Date().toISOString(),
    compte: { id: utilisateur.id, email: utilisateur.email, cree: utilisateur.created_at },
    profil: p.data || null, progression: pr.data || null,
    abonnement: s.data || null, usageVocal: u.data || []
  };
}

/** Suppression du compte. Passe par une fonction serveur, jamais par le client. */
export async function supprimerCompte() {
  const c = CFG();
  if (!client || !utilisateur) return { ok: false, message: "Non connecté." };
  const jeton = await jetonAcces();
  try {
    const res = await fetch(`${String(c.functionsBaseUrl).replace(/\/$/, "")}/delete-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: c.supabaseAnonKey, Authorization: `Bearer ${jeton}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data.error || "Suppression impossible." };
    await deconnexion();
    return { ok: true, message: "Compte supprimé." };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
