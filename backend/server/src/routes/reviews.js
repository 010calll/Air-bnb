import { Router } from 'express';
import pool from '../db.js';
const router = Router();
router.get('/listing/:listingId', async (req, res) => {
    const [rows] = await pool.query(`SELECT r.*, u.name AS user_name
     FROM reviews r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.listing_id = ? AND r.status = 'published'
     ORDER BY r.id DESC`, [req.params.listingId]);
    return res.json(rows);
});
router.post('/', async (req, res) => {
    const { listingId, userId, rating, comment } = req.body;
    if (!listingId || !userId || !rating) {
        return res.status(400).json({ message: 'listingId, userId et rating sont requis.' });
    }
    const [userRows] = await pool.query('SELECT status FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = userRows[0];
    if (!user || user.status === 'blocked') {
        return res.status(403).json({ message: 'Compte bloque ou introuvable.' });
    }
    await pool.execute('INSERT INTO reviews (listing_id, user_id, rating, comment, status) VALUES (?, ?, ?, ?, ?)', [listingId, userId, rating, comment || '', 'published']);
    return res.status(201).json({ message: 'Avis ajoute.' });
});
export default router;
