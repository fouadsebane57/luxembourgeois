/* =====================================================================
   EDGE FUNCTION · delete-account

   Suppression définitive d'un compte et de toutes ses données.
   Obligation RGPD, article 17, droit à l'effacement.

   Pourquoi une fonction serveur : la suppression d'un utilisateur dans
   auth.users exige la clé secrète. Elle ne doit jamais atteindre le
   navigateur. Le client ne peut donc pas supprimer un compte lui-même,
   ni celui d'un autre.

   Les tables profiles, user_progress, subscriptions, speech_usage et
   speech_events sont déclarées avec `on delete cascade`. Elles sont
   donc vidées automatiquement. La suppression est faite quand même de
   façon explicite avant, pour ne dépendre d'aucune configuration.

   Aucun secret supplémentaire à créer. SUPABASE_URL et
   SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.
   ===================================================================== */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Le jeton de session identifie le demandeur. On ne supprime jamais
  // un compte désigné par un paramètre de requête.
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton) return json({ error: "Connecte-toi pour supprimer ton compte." }, 401);

  const { data: userData, error: userErr } = await admin.auth.getUser(jeton);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Session expirée. Reconnecte-toi." }, 401);

  const id = user.id;

  // Abonnement Stripe encore actif : on refuse et on explique.
  // Supprimer le compte sans résilier laisserait un paiement récurrent
  // sans contrepartie, ce qui est un vrai problème pour le client.
  const { data: sub } = await admin
    .from("subscriptions").select("status,stripe_subscription_id")
    .eq("user_id", id).maybeSingle();

  if (sub && ["active", "trialing"].includes(sub.status) && sub.stripe_subscription_id) {
    return json({
      error: "Un abonnement est encore actif. Résilie-le d'abord, puis reviens supprimer ton compte."
    }, 409);
  }

  // Effacement explicite, dans l'ordre, avant la suppression du compte.
  const tables = ["speech_events", "speech_usage", "user_progress", "subscriptions", "profiles"];
  const echecs: string[] = [];
  for (const t of tables) {
    const colonne = t === "profiles" ? "id" : "user_id";
    const { error } = await admin.from(t).delete().eq(colonne, id);
    if (error) echecs.push(`${t}: ${error.message}`);
  }
  if (echecs.length) {
    console.error("delete-account", echecs.join(" | "));
    return json({ error: "Suppression partielle impossible. Contacte le support." }, 500);
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) {
    console.error("delete-account auth", delErr.message);
    return json({ error: "Le compte n'a pas pu être supprimé. Contacte le support." }, 500);
  }

  return json({ ok: true, message: "Compte et données supprimés définitivement." });
});
