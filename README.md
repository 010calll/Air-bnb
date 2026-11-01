# Maison

Application de réservation de logements avec un frontend HTML/CSS/JavaScript sans framework, servi par un backend Node.js/Express. Les données sont stockées dans MySQL.

## Prérequis

- Node.js et npm
- MySQL (par exemple via XAMPP)

## Démarrage

L’interface et l’API sont servies ensemble par Express :

```powershell
cd backend\server
npm install
npm run dev
```

Configurer les variables de connexion MySQL dans `backend\server\.env` avant le démarrage.

Ouvrir ensuite `http://localhost:4000`. Les routes API restent disponibles sous `/api`.
