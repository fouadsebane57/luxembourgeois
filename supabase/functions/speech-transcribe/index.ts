/* =====================================================================
   EDGE FUNCTION · speech-transcribe

   Reconnaissance du luxembourgeois via Google Cloud Speech-to-Text V2.
     modèle   chirp_3
     langue   lb-LU
     région   eu   (traitement dans l'Union européenne)

   Vérifié le 7 août 2026 sur la documentation Google :
     lb-LU est disponible sur chirp_3 en Preview, régions us et eu (GA).
     La confiance au niveau du mot n'est PAS un vrai score de confiance.
     Elle n'est donc pas utilisée pour décider quoi que ce soit.

   Sécurité :
     aucune clé Google n'atteint jamais le navigateur,
     authentification Supabase obligatoire,
     quota mensuel et limitation par minute appliqués côté serveur,
     durée et taille d'audio bornées,
     l'audio n'est ni stocké ni journalisé, seulement les métadonnées.

   Secrets à définir (Supabase > Edge Functions > Secrets) :
     GOOGLE_PROJECT_ID
     GOOGLE_CLIENT_EMAIL
     GOOGLE_PRIVATE_KEY
     SPEECH_REGION            défaut "eu"
     SPEECH_MODEL             défaut "chirp_3"
     SPEECH_MAX_PER_MONTH_FREE     défaut 30
     SPEECH_MAX_PER_MONTH_PREMIUM  défaut 4000
     SPEECH_MAX_PER_MINUTE         défaut 12
   ===================================================================== */

import { createClient } from "jsr:@supabase/supabase-js@2";

const REGION = Deno.env.get("SPEECH_REGION") ?? "eu";
const MODEL = Deno.env.get("SPEECH_MODEL") ?? "chirp_3";
const LANG = "lb-LU";
const MAX_MOIS_GRATUIT = Number(Deno.env.get("SPEECH_MAX_PER_MONTH_FREE") ?? 30);
const MAX_MOIS_PREMIUM = Number(Deno.env.get("SPEECH_MAX_PER_MONTH_PREMIUM") ?? 4000);
const MAX_MINUTE = Number(Deno.env.get("SPEECH_MAX_PER_MINUTE") ?? 12);

const MAX_OCTETS = 900_000;          // ~10 s d'Opus à 32 kbit/s
const MAX_HINTS = 60;

const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: CORS });

/* ---------- Jeton d'accès Google, signé sans dépendance externe ---------- */

let cacheJeton: { token: string; exp: number } | null = null;

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemEnArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem.replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(clean);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function jetonGoogle(): Promise<string> {
  const maintenant = Math.floor(Date.now() / 1000);
  if (cacheJeton && cacheJeton.exp > maintenant + 60) return cacheJeton.token;

  const email = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const cle = Deno.env.get("GOOGLE_PRIVATE_KEY");
  if (!email || !cle) throw new Error("Compte de service Google non configuré.");

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: maintenant + 3600,
    iat: maintenant
  }));
  const aSigner = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8", pemEnArrayBuffer(cle),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(aSigner)
  ));
  const jwt = `${aSigner}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt })
  });
  if (!res.ok) throw new Error("Authentification Google refusée: " + (await res.text()).slice(0, 200));
  const data = await res.json();
  cacheJeton = { token: data.access_token, exp: maintenant + Number(data.expires_in || 3600) };
  return cacheJeton.token;
}

/* ---------- Serveur ---------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const t0 = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 1. Authentification obligatoire
  const auth = req.headers.get("Authorization") ?? "";
  const jeton = auth.replace(/^Bearer\s+/i, "");
  if (!jeton) return json({ error: "Connecte-toi pour utiliser la reconnaissance cloud." }, 401);

  const { data: userData, error: userErr } = await admin.auth.getUser(jeton);
  const user = userData?.user;
  if (userErr || !user) return json({ error: "Session expirée. Reconnecte-toi." }, 401);

  // 2. Corps de requête
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: "Requête illisible." }, 400); }

  const audioBase64 = String(body.audioBase64 ?? "");
  const mimeType = String(body.mimeType ?? "audio/webm");
  const expected = String(body.expected ?? "").slice(0, 200);
  const hintsBrut = Array.isArray(body.hints) ? body.hints : [];

  if (!audioBase64) return json({ error: "Aucun audio reçu." }, 400);
  const octets = Math.floor(audioBase64.length * 0.75);
  if (octets > MAX_OCTETS) {
    return json({ error: "Enregistrement trop long. Limite à environ 10 secondes." }, 413);
  }
  const dureeEstimeeMs = Math.round((octets / 4000) * 1000); // ~32 kbit/s

  // 3. Droits et quota
  const { data: sub } = await admin
    .from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  const premium = ["active", "trialing"].includes(sub?.status ?? "");
  const plafondMois = premium ? MAX_MOIS_PREMIUM : MAX_MOIS_GRATUIT;

  const { data: quota, error: quotaErr } = await admin.rpc("consume_speech_quota", {
    p_user: user.id,
    p_audio_ms: dureeEstimeeMs,
    p_max_requests: plafondMois,
    p_max_per_minute: MAX_MINUTE
  });
  if (quotaErr) return json({ error: "Contrôle de quota indisponible." }, 503);
  if (!quota?.allowed) {
    const msg = quota?.reason === "rate_limit"
      ? "Trop de demandes en peu de temps. Attends quelques secondes."
      : `Quota de reconnaissance atteint pour ce mois (${quota?.used}/${quota?.limit}).`;
    return json({ error: msg, quota }, 429);
  }

  // 4. Appel Google STT V2
  const projet = Deno.env.get("GOOGLE_PROJECT_ID");
  if (!projet) return json({ error: "Projet Google non configuré." }, 503);

  // Biasing : l'attendu et le vocabulaire de la leçon.
  // C'est le principal levier de qualité sur une langue peu dotée.
  const phrases = [...new Set(
    [expected, ...hintsBrut.map((h) => String(h))]
      .map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 100)
  )].slice(0, MAX_HINTS).map((value) => ({ value, boost: 15 }));

  const url = `https://${REGION}-speech.googleapis.com/v2/projects/${projet}/locations/${REGION}/recognizers/_:recognize`;

  let reponse: Response;
  try {
    const token = await jetonGoogle();
    reponse = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          autoDecodingConfig: {},              // gère webm/opus (Android) et mp4/aac (iOS)
          languageCodes: [LANG],
          model: MODEL,
          features: {
            enableAutomaticPunctuation: false, // la ponctuation nuit à la comparaison
            maxAlternatives: 5
          },
          // Réduction du bruit de fond. Essentiel en voiture.
          denoiserConfig: { denoiseAudio: true, snrThreshold: 0.0 },
          ...(phrases.length
            ? { adaptation: { phraseSets: [{ inlinePhraseSet: { phrases } }] } }
            : {})
        },
        content: audioBase64
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (err) {
    await tracer(admin, user.id, { ok: false, error_code: "network", audio_ms: dureeEstimeeMs, latency_ms: Date.now() - t0 });
    return json({ error: "Le service de reconnaissance n'a pas répondu." }, 504);
  }

  if (!reponse.ok) {
    const texte = (await reponse.text()).slice(0, 400);
    console.error("Google STT", reponse.status, texte);
    await tracer(admin, user.id, { ok: false, error_code: `google_${reponse.status}`, audio_ms: dureeEstimeeMs, latency_ms: Date.now() - t0 });
    // Aucun détail Google renvoyé au client.
    const msg = reponse.status === 400
      ? "Format audio non accepté par le service de reconnaissance."
      : "Le service de reconnaissance est momentanément indisponible.";
    return json({ error: msg }, 502);
  }

  const data = await reponse.json();
  const transcripts: { text: string; confidence: number }[] = [];
  for (const r of data.results ?? []) {
    for (const alt of r.alternatives ?? []) {
      const text = String(alt.transcript ?? "").trim();
      // La confiance renvoyée par chirp_3 n'est pas un vrai score.
      // Elle est transmise pour information, jamais utilisée pour décider.
      if (text) transcripts.push({ text, confidence: Number(alt.confidence ?? 0) });
    }
  }

  const latence = Date.now() - t0;
  await tracer(admin, user.id, {
    ok: transcripts.length > 0,
    error_code: transcripts.length ? null : "empty",
    audio_ms: dureeEstimeeMs, latency_ms: latence
  });

  return json({
    transcripts,
    engine: "cloud",
    model: MODEL,
    lang: LANG,
    region: REGION,
    serverMs: latence,
    usage: { used: quota.used, limit: quota.limit, period: quota.period, premium }
  });
});

/** Journal technique. Métadonnées seulement. Ni audio, ni transcription. */
async function tracer(admin: ReturnType<typeof createClient>, userId: string, champs: Record<string, unknown>) {
  try {
    await admin.from("speech_events").insert({
      user_id: userId, engine: "cloud", model: MODEL, lang: LANG, ...champs
    });
  } catch (_) { /* la journalisation ne doit jamais faire échouer la requête */ }
}
