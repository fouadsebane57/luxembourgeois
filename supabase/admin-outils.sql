-- =====================================================================
-- OUTILS D'ADMINISTRATION
-- À exécuter dans Supabase : SQL Editor > New query.
-- Chaque bloc est indépendant. Décommente celui dont tu as besoin.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. S'ACCORDER PREMIUM POUR TESTER
--
-- Sans ça, ton compte est limité à 30 reconnaissances cloud par mois.
-- Tu épuiseras ce quota dès la première session de tests terrain.
-- Ce bloc te passe à 4000 par mois, pour un an.
--
-- Remplace l'adresse par la tienne avant d'exécuter.
-- ---------------------------------------------------------------------
-- update public.subscriptions
--    set status = 'active',
--        plan = 'admin_test',
--        current_period_end = now() + interval '1 year',
--        updated_at = now()
--  where user_id = (select id from auth.users where email = 'ton.email@exemple.fr');


-- ---------------------------------------------------------------------
-- 2. REVENIR EN FORMULE GRATUITE
--    Utile pour vérifier que les limites Découverte s'appliquent bien.
-- ---------------------------------------------------------------------
-- update public.subscriptions
--    set status = 'inactive', plan = 'free', current_period_end = null, updated_at = now()
--  where user_id = (select id from auth.users where email = 'ton.email@exemple.fr');


-- ---------------------------------------------------------------------
-- 3. VOIR SA CONSOMMATION VOCALE
-- ---------------------------------------------------------------------
-- select u.email, s.period, s.requests, round(s.audio_ms / 1000.0) as secondes_audio, s.last_request
--   from public.speech_usage s
--   join auth.users u on u.id = s.user_id
--  order by s.period desc, s.requests desc;


-- ---------------------------------------------------------------------
-- 4. REMETTRE SON COMPTEUR DU MOIS À ZÉRO
--    Pour repartir sur un quota neuf pendant une phase de test.
-- ---------------------------------------------------------------------
-- update public.speech_usage
--    set requests = 0, audio_ms = 0, updated_at = now()
--  where user_id = (select id from auth.users where email = 'ton.email@exemple.fr')
--    and period = to_char(now(), 'YYYY-MM');


-- ---------------------------------------------------------------------
-- 5. DIAGNOSTIQUER LA RECONNAISSANCE VOCALE
--    Aucune transcription n'est stockée. Seulement le technique.
-- ---------------------------------------------------------------------
-- select created_at, ok, error_code, audio_ms, latency_ms, model
--   from public.speech_events
--  where user_id = (select id from auth.users where email = 'ton.email@exemple.fr')
--  order by created_at desc
--  limit 50;


-- ---------------------------------------------------------------------
-- 6. TAUX D'ÉCHEC DE LA RECONNAISSANCE, PAR JOUR
--    Le vrai indicateur de santé du moteur vocal.
-- ---------------------------------------------------------------------
-- select date_trunc('day', created_at)::date as jour,
--        count(*) as appels,
--        count(*) filter (where ok) as reussis,
--        round(100.0 * count(*) filter (where not ok) / nullif(count(*), 0), 1) as pourcent_echec,
--        round(avg(latency_ms)) as latence_moyenne_ms
--   from public.speech_events
--  group by 1 order by 1 desc;


-- ---------------------------------------------------------------------
-- 7. VÉRIFIER QUE LA SÉCURITÉ EST BIEN ACTIVE
--    Les six lignes doivent afficher true.
-- ---------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public'
--    and tablename in ('profiles','user_progress','subscriptions',
--                      'speech_usage','speech_events','rate_limits')
--  order by tablename;


-- ---------------------------------------------------------------------
-- 8. NETTOYER LES COMPTEURS DE DÉBIT
--    À lancer de temps en temps, ou à planifier une fois par jour.
-- ---------------------------------------------------------------------
-- select public.purge_rate_limits();
