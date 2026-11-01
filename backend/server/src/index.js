import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.js';
import listingsRoutes from './routes/listings.js';
import bookingsRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import reviewsRoutes from './routes/reviews.js';
import reportsRoutes from './routes/reports.js';
import { initDb, seedSampleData } from './db.js';
dotenv.config();
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '16mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok' });
});
app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Route API introuvable.' });
});
app.use('/db.json', (_req, res) => {
    res.sendStatus(404);
});
const publicDirectory = fileURLToPath(new URL('../../../frontend/public/', import.meta.url));
app.use(express.static(publicDirectory));
app.get('*', (_req, res) => {
    res.sendFile(fileURLToPath(new URL('../../../frontend/public/index.html', import.meta.url)));
});
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
initDb()
    .then(() => seedSampleData())
    .then(() => {
    app.listen(port, () => {
        console.log(`Backend démarré sur http://localhost:${port}`);
    });
})
    .catch((error) => {
    console.error('Échec de l’initialisation de la base de données :', error);
    process.exit(1);
});
