import { Router } from 'express';
import pool from '../db.js';
const router = Router();
router.get('/dashboard', async (_req, res) => {
    const [userRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
    const [listingRows] = await pool.query('SELECT COUNT(*) AS count FROM listings');
    const [bookingRows] = await pool.query('SELECT COUNT(*) AS count FROM bookings');
    const [revenueRows] = await pool.query("SELECT COALESCE(SUM(platform_fee), 0) AS totalPlatformRevenue, COALESCE(SUM(total_price), 0) AS totalGrossRevenue FROM bookings WHERE status = 'paid'");
    const [settingsRows] = await pool.query('SELECT commission_rate FROM settings WHERE id = 1 LIMIT 1');
    return res.json({
        totalUsers: userRows[0]?.count ?? 0,
        totalListings: listingRows[0]?.count ?? 0,
        totalBookings: bookingRows[0]?.count ?? 0,
        totalPlatformRevenue: Number(revenueRows[0]?.totalPlatformRevenue ?? 0),
        totalGrossRevenue: Number(revenueRows[0]?.totalGrossRevenue ?? 0),
        commissionRate: Number(settingsRows[0]?.commission_rate ?? 0.1),
    });
});
router.get('/users', async (_req, res) => {
    const [rows] = await pool.query('SELECT id, name, email, role, is_admin, status, created_at FROM users ORDER BY id DESC');
    return res.json(rows);
});
router.get('/users/:id', async (req, res) => {
    const [rows] = await pool.query('SELECT id, name, email, role, is_admin, status, created_at FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    const user = rows[0];
    if (!user) {
        return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    return res.json(user);
});
router.patch('/users/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status || !['active', 'blocked'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }
    const [result] = await pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    const [rows] = await pool.query('SELECT id, name, email, role, is_admin, status, created_at FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    return res.json(rows[0]);
});
router.delete('/users/:id', async (req, res) => {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    return res.status(204).send();
});
router.get('/listings', async (req, res) => {
    const { status } = req.query;
    if (status && typeof status === 'string') {
        const [rows] = await pool.query('SELECT * FROM listings WHERE status = ? ORDER BY id DESC', [status]);
        return res.json(rows);
    }
    const [rows] = await pool.query('SELECT * FROM listings ORDER BY id DESC');
    return res.json(rows);
});
router.get('/listings/:id', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ? LIMIT 1', [req.params.id]);
    const listing = rows[0];
    if (!listing) {
        return res.status(404).json({ message: 'Annonce introuvable.' });
    }
    return res.json(listing);
});
router.patch('/listings/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }
    const [result] = await pool.execute('UPDATE listings SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Annonce introuvable.' });
    }
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ? LIMIT 1', [req.params.id]);
    return res.json(rows[0]);
});
router.delete('/listings/:id', async (req, res) => {
    const [result] = await pool.execute('DELETE FROM listings WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Annonce introuvable.' });
    }
    return res.status(204).send();
});
router.get('/bookings', async (_req, res) => {
    const [rows] = await pool.query(`SELECT b.*, u.name AS user_name, u.email AS user_email, l.title AS listing_title
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     LEFT JOIN listings l ON l.id = b.listing_id
     ORDER BY b.id DESC`);
    return res.json(rows);
});
router.get('/bookings/:id', async (req, res) => {
    const [rows] = await pool.query(`SELECT b.*, u.name AS user_name, u.email AS user_email, l.title AS listing_title
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     LEFT JOIN listings l ON l.id = b.listing_id
     WHERE b.id = ? LIMIT 1`, [req.params.id]);
    const booking = rows[0];
    if (!booking) {
        return res.status(404).json({ message: 'Reservation introuvable.' });
    }
    return res.json(booking);
});
router.patch('/bookings/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status || !['pending', 'paid', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }
    const [result] = await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Reservation introuvable.' });
    }
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ? LIMIT 1', [req.params.id]);
    return res.json(rows[0]);
});
router.get('/transactions', async (_req, res) => {
    const [rows] = await pool.query(`SELECT b.id, b.total_price, b.platform_fee, b.owner_payout, b.status, b.created_at,
            u.name AS customer_name, l.title AS listing_title
     FROM bookings b
     LEFT JOIN users u ON u.id = b.user_id
     LEFT JOIN listings l ON l.id = b.listing_id
     ORDER BY b.id DESC`);
    return res.json(rows);
});
router.get('/reviews', async (_req, res) => {
    const [rows] = await pool.query(`SELECT r.*, u.name AS user_name, l.title AS listing_title
     FROM reviews r
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN listings l ON l.id = r.listing_id
     ORDER BY r.id DESC`);
    return res.json(rows);
});
router.delete('/reviews/:id', async (req, res) => {
    const [result] = await pool.execute('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Avis introuvable.' });
    }
    return res.status(204).send();
});
router.get('/reports', async (_req, res) => {
    const [rows] = await pool.query(`SELECT r.*, u.name AS reporting_user_name
     FROM reports r
     LEFT JOIN users u ON u.id = r.reporting_user_id
     ORDER BY r.id DESC`);
    return res.json(rows);
});
router.patch('/reports/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status || !['pending', 'reviewed', 'resolved'].includes(status)) {
        return res.status(400).json({ message: 'Statut invalide.' });
    }
    const [result] = await pool.execute('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Signalement introuvable.' });
    }
    const [rows] = await pool.query('SELECT * FROM reports WHERE id = ? LIMIT 1', [req.params.id]);
    return res.json(rows[0]);
});
router.get('/settings', async (_req, res) => {
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
    return res.json(rows[0] ?? { commission_rate: 0.1 });
});
router.patch('/settings/commission', async (req, res) => {
    const { commissionRate } = req.body;
    if (commissionRate === undefined || isNaN(Number(commissionRate)) || Number(commissionRate) < 0) {
        return res.status(400).json({ message: 'Commission invalide.' });
    }
    await pool.execute('INSERT INTO settings (id, commission_rate) VALUES (1, ?) ON DUPLICATE KEY UPDATE commission_rate = ?', [
        Number(commissionRate),
        Number(commissionRate),
    ]);
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
    return res.json(rows[0]);
});
export default router;
