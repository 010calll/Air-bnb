import { Router } from "express";
import bookings from "../data/bookings.js";
import listings from "../data/listings.js";
import {
  countNights,
  hasDateConflict,
  parseDate,
} from "../utils/bookingUtils.js";

const router = Router();

router.post("/", (req, res) => {
  const request = req.body;

  if (
    request === null ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    return res.status(400).json({
      message: "Le corps de la requête doit être un objet JSON.",
    });
  }

  const { listingId, dateArrivee, dateDepart } = request;
  const champsAutorises = ["listingId", "dateArrivee", "dateDepart"];

  if (
    Object.keys(request).some((champ) => !champsAutorises.includes(champ)) ||
    !Number.isSafeInteger(listingId) ||
    listingId <= 0 ||
    typeof dateArrivee !== "string" ||
    typeof dateDepart !== "string"
  ) {
    return res.status(400).json({
      message:
        "Fournissez listingId, dateArrivee et dateDepart avec des valeurs valides.",
    });
  }

  const logement = listings.find((listing) => listing.id === listingId);

  if (!logement) {
    return res.status(404).json({
      message: "Logement introuvable.",
    });
  }

  const arrivee = parseDate(dateArrivee);
  const depart = parseDate(dateDepart);
  const aujourdHui = new Date();
  aujourdHui.setUTCHours(0, 0, 0, 0);

  if (
    arrivee === null ||
    depart === null ||
    arrivee < aujourdHui.getTime() ||
    depart <= arrivee
  ) {
    return res.status(400).json({
      message:
        "Les dates doivent être valides, l'arrivée doit être aujourd'hui ou plus tard et le départ doit suivre l'arrivée.",
    });
  }

  if (hasDateConflict(bookings, listingId, arrivee, depart)) {
    return res.status(409).json({
      message: "Le logement n'est pas disponible pour ces dates.",
    });
  }

  const nombreNuits = countNights(arrivee, depart);
  const id = Math.max(0, ...bookings.map((booking) => booking.id)) + 1;
  const reservation = {
    id,
    listingId,
    dateArrivee,
    dateDepart,
    nombreNuits,
    prixTotal: nombreNuits * logement.prixParNuit,
    statut: "en attente",
  };

  bookings.push(reservation);

  return res.status(201).json({ reservation });
});

export default router;
