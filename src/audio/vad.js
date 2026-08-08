/* ===================================================================
   DÉTECTION DE PAROLE

   L'ancien moteur enregistrait une fenêtre fixe de 6 secondes.
   Conséquences : l'utilisateur qui répond en 1 seconde attend 5 secondes
   de silence, et celui qui réfléchit 6 secondes est coupé.

   Ici, le seuil est relatif au bruit ambiant mesuré au moment même.
   Dans une voiture, le plancher monte, le seuil monte avec lui.
   C'est ce qui permet de fonctionner moteur allumé et ventilation en marche.
   =================================================================== */

import { analyseur, contexte } from "./mic.js";

export const PROFILS = {
  calme:   { margeDb: 9,  silenceMs: 650, planchermin: -60 },
  voiture: { margeDb: 12, silenceMs: 850, planchermin: -48 }
};

/**
 * Écoute jusqu'à la fin de la parole.
 * @param {MediaStream} flux
 * @param {object} opt
 * @param {number} opt.attenteMaxMs  temps max avant le début de parole
 * @param {number} opt.paroleMaxMs   durée max de parole, garde-fou coût cloud
 * @param {string} opt.profil        "calme" ou "voiture"
 * @param {function} opt.onNiveau    rappel temps réel, pour l'indicateur visuel
 * @param {function} opt.annule      renvoie true pour interrompre
 */
export function ecouter(flux, opt = {}) {
  const p = PROFILS[opt.profil] || PROFILS.calme;
  const attenteMaxMs = opt.attenteMaxMs ?? 4500;
  const paroleMaxMs = opt.paroleMaxMs ?? 9000;
  const onNiveau = opt.onNiveau || (() => {});
  const annule = opt.annule || (() => false);

  return new Promise((resolve) => {
    const a = analyseur(flux);
    if (!a) {
      resolve({ speechDetected: false, speechMs: 0, noiseFloorDb: -100, peakDb: -100, snrDb: 0, reason: "analyseur_indisponible" });
      return;
    }

    const t0 = Date.now();
    let plancher = null;
    const echantillonsCalibration = [];
    let debutParole = 0, finParole = 0, dernierSonFort = 0;
    let pic = -100;
    let etat = "calibration"; // calibration -> attente -> parole -> fini
    const CALIBRATION_MS = 350;

    const terminer = (reason) => {
      clearInterval(boucle);
      a.detruire();
      const speechMs = debutParole ? (finParole || Date.now()) - debutParole : 0;
      const noiseFloorDb = plancher ?? -100;
      resolve({
        speechDetected: speechMs >= 150,
        speechMs,
        noiseFloorDb,
        peakDb: pic,
        snrDb: Math.max(0, pic - noiseFloorDb),
        seuilDb: noiseFloorDb + p.margeDb,
        totalMs: Date.now() - t0,
        reason
      });
    };

    const boucle = setInterval(() => {
      if (annule()) return terminer("annule");
      const db = a.rmsDb();
      const maintenant = Date.now();
      const ecoule = maintenant - t0;
      if (db > pic) pic = db;

      if (etat === "calibration") {
        echantillonsCalibration.push(db);
        onNiveau({ db, etat, plancher: null });
        if (ecoule >= CALIBRATION_MS) {
          const tries = echantillonsCalibration.slice().sort((x, y) => x - y);
          const median = tries[Math.floor(tries.length / 2)];
          plancher = Math.max(median, p.planchermin);
          etat = "attente";
        }
        return;
      }

      const seuil = plancher + p.margeDb;
      onNiveau({ db, etat, plancher, seuil });

      if (etat === "attente") {
        if (db > seuil) { etat = "parole"; debutParole = maintenant; dernierSonFort = maintenant; return; }
        if (ecoule > attenteMaxMs) return terminer("aucune_parole");
        // Le plancher continue de s'adapter tant que rien n'est dit.
        plancher = plancher * 0.94 + db * 0.06;
        return;
      }

      if (etat === "parole") {
        if (db > seuil) { dernierSonFort = maintenant; finParole = 0; return; }
        if (maintenant - dernierSonFort >= p.silenceMs) { finParole = dernierSonFort; return terminer("fin_de_parole"); }
        if (maintenant - debutParole > paroleMaxMs) { finParole = maintenant; return terminer("duree_max"); }
      }
    }, 30);
  });
}

/** Réveille le contexte audio. À appeler sur un geste utilisateur, iOS l'exige. */
export function reveiller() { contexte(); }
