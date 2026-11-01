import { Router } from 'express';
import pool from '../db.js';
const router = Router();
router.post('/', async (req, res) => {
    const { reportingUserId, targetType, targetId, reason } = req.body;
    if (!reportingUserId || !targetType || !targetId || !reason) {
        return res.status(400).json({ message: 'reportingUserId, targetType, targetId et reason sont requis.' });
    }
    const [userRows] = await pool.query('SELECT status FROM users WHERE id = ? LIMIT 1', [reportingUserId]);
    const user = userRows[0];
    if (!user || user.status === 'blocked') {
        return res.status(403).json({ message: 'Compte bloque ou introuvable.' });
    }
    await pool.execute('INSERT INTO reports (reporting_user_id, target_type, target_id, reason, status) VALUES (?, ?, ?, ?, ?)', [reportingUserId, targetType, targetId, reason, 'pending']);
    return res.status(201).json({ message: 'Signalement envoye.' });
});
router.get('/user/:userId', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM reports WHERE reporting_user_id = ? ORDER BY id DESC', [req.params.userId]);
    return res.json(rows);
});
export default router;
