# MAISON — Node.js + Express

Le serveur Express fournit l’API et sert l’interface HTML/CSS/JavaScript située dans `frontend/public`. La base de données est MySQL / MariaDB.

## Installation

1. Ouvre un terminal dans `backend/server`
2. Copie le fichier d'exemple :

```bash
copy .env.example .env
```

3. Remplis les valeurs de connexion MySQL dans `.env`
4. Installe les dépendances :

```bash
npm install
```

5. Démarre le serveur en mode développement (redémarrage automatique) :

```bash
npm run dev
```

Ouvre `http://localhost:4000` pour utiliser le site. L’API est disponible sous `/api`.

## Base de données

- Ce backend attend une base MySQL nommée `fusion_db`.
- Tu peux utiliser `phpMyAdmin` pour créer la base et visualiser les données.
- Le dossier `sql/schema.sql` contient le schéma des tables.

## Comptes par défaut

- Admin : `admin@gmail.com` / `admin123`
- Client : `client@example.com` / `client123`
- Hôte : `host@example.com` / `host123`

## API de base

- `GET /api/listings`
- `GET /api/listings/:id`
- `POST /api/listings`
- `PUT /api/listings/:id`
- `DELETE /api/listings/:id`
- `GET /api/bookings`
- `GET /api/bookings/user/:userId`
- `GET /api/bookings/owner/:ownerId`
- `POST /api/bookings`
- `GET /api/reviews/listing/:listingId`
- `POST /api/reviews`
- `POST /api/reports`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/status`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/listings`
- `PATCH /api/admin/listings/:id/status`
- `DELETE /api/admin/listings/:id`
- `GET /api/admin/bookings`
- `PATCH /api/admin/bookings/:id/status`
- `GET /api/admin/transactions`
- `GET /api/admin/reviews`
- `DELETE /api/admin/reviews/:id`
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/:id/status`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings/commission`

## Notes

- Les mots de passe sont stockés en clair pour un prototype. Pour la production, utilise un hash comme `bcrypt`.
- `phpMyAdmin` est un bon outil pour administrer MySQL, mais la base de données reste MySQL/MariaDB.
