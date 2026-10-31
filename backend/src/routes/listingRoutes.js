import { Router } from "express";
import listings from "../data/listings.js";
import { filterListings } from "../utils/listingUtils.js";

const router = Router();

router.post("/", (req, res) => {
  const { titre, ville, prixParNuit, photos = [], caracteristiques = [] } =
    req.body ?? {};

  if (
    typeof titre !== "string" ||
    titre.trim() === "" ||
    typeof ville !== "string" ||
    ville.trim() === "" ||
    typeof prixParNuit !== "number" ||
    !Number.isFinite(prixParNuit) ||
    prixParNuit <= 0 ||
    !Array.isArray(photos) ||
    !photos.every((photo) => typeof photo === "string") ||
    !Array.isArray(caracteristiques) ||
    !caracteristiques.every(
      (caracteristique) => typeof caracteristique === "string",
    )
  ) {
    return res.status(400).json({
      message:
        "Fournissez un titre, une ville, un prix positif, ainsi que des listes de photos et caractéristiques valides.",
    });
  }

  const id = Math.max(0, ...listings.map((listing) => listing.id)) + 1;
  const nouveauLogement = {
    id,
    titre: titre.trim(),
    ville: ville.trim(),
    prixParNuit,
    photos,
    caracteristiques,
  };

  listings.push(nouveauLogement);

  return res
    .location(`/api/listings/${id}`)
    .status(201)
    .json({ logement: nouveauLogement });
});

router.patch("/:id", (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({
      message: "L'identifiant du logement doit être un entier positif.",
    });
  }

  const logement = listings.find((listing) => listing.id === Number(id));

  if (!logement) {
    return res.status(404).json({
      message: "Logement introuvable.",
    });
  }

  const modifications = req.body;

  if (
    modifications === null ||
    typeof modifications !== "object" ||
    Array.isArray(modifications) ||
    Object.keys(modifications).length === 0
  ) {
    return res.status(400).json({
      message: "Fournissez au moins un champ à modifier dans un objet JSON.",
    });
  }

  const champsAutorises = [
    "titre",
    "ville",
    "prixParNuit",
    "photos",
    "caracteristiques",
  ];
  const champsRecus = Object.keys(modifications);
  const champsValides = champsRecus.every((champ) =>
    champsAutorises.includes(champ),
  );
  const valeursValides = champsRecus.every((champ) => {
    const valeur = modifications[champ];

    if (champ === "titre" || champ === "ville") {
      return typeof valeur === "string" && valeur.trim() !== "";
    }

    if (champ === "prixParNuit") {
      return (
        typeof valeur === "number" &&
        Number.isFinite(valeur) &&
        valeur > 0
      );
    }

    return (
      Array.isArray(valeur) &&
      valeur.every((element) => typeof element === "string")
    );
  });

  if (!champsValides || !valeursValides) {
    return res.status(400).json({
      message:
        "Les champs ou leurs valeurs sont invalides. Modifiez le titre, la ville, le prix ou les listes de photos et caractéristiques.",
    });
  }

  for (const champ of champsRecus) {
    const valeur = modifications[champ];
    logement[champ] =
      typeof valeur === "string" ? valeur.trim() : valeur;
  }

  return res.status(200).json({ logement });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({
      message: "L'identifiant du logement doit être un entier positif.",
    });
  }

  const index = listings.findIndex((listing) => listing.id === Number(id));

  if (index === -1) {
    return res.status(404).json({
      message: "Logement introuvable.",
    });
  }

  const [logementSupprime] = listings.splice(index, 1);

  return res.status(200).json({
    message: "Logement supprimé.",
    logement: logementSupprime,
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({
      message: "L'identifiant du logement doit être un entier positif.",
    });
  }

  const logement = listings.find((listing) => listing.id === Number(id));

  if (!logement) {
    return res.status(404).json({
      message: "Logement introuvable.",
    });
  }

  return res.status(200).json({ logement });
});

router.get("/", (req, res) => {
  const { ville, prixMin, prixMax } = req.query;

  if (
    (ville !== undefined && typeof ville !== "string") ||
    (prixMin !== undefined && typeof prixMin !== "string") ||
    (prixMax !== undefined && typeof prixMax !== "string") ||
    (ville !== undefined && ville.trim() === "") ||
    (prixMin !== undefined && prixMin.trim() === "") ||
    (prixMax !== undefined && prixMax.trim() === "")
  ) {
    return res.status(400).json({
      message: "Les filtres ville et prix doivent être fournis une seule fois.",
    });
  }

  const parsedPrixMin = prixMin === undefined ? undefined : Number(prixMin);
  const parsedPrixMax = prixMax === undefined ? undefined : Number(prixMax);

  if (
    (parsedPrixMin !== undefined &&
      (!Number.isFinite(parsedPrixMin) || parsedPrixMin < 0)) ||
    (parsedPrixMax !== undefined &&
      (!Number.isFinite(parsedPrixMax) || parsedPrixMax < 0))
  ) {
    return res.status(400).json({
      message: "Les prix minimum et maximum doivent être des nombres positifs.",
    });
  }

  if (
    parsedPrixMin !== undefined &&
    parsedPrixMax !== undefined &&
    parsedPrixMin > parsedPrixMax
  ) {
    return res.status(400).json({
      message: "Le prix minimum ne peut pas dépasser le prix maximum.",
    });
  }

  const resultats = filterListings(listings, {
    ville: ville?.trim(),
    prixMin: parsedPrixMin,
    prixMax: parsedPrixMax,
  });

  return res.status(200).json({
    nombre: resultats.length,
    logements: resultats,
  });
});

export default router;
