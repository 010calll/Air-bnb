import { Router } from 'express';
import pool from '../db.js';
const router = Router();
router.get('/', async (_req, res) => {
    const [rows] = await pool.query('SELECT * FROM bookings ORDER BY id DESC');
    return res.json(rows);
});
router.get('/user/:userId', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE user_id = ? ORDER BY id DESC', [req.params.userId]);
    return res.json(rows);
});
router.get('/owner/:ownerId', async (req, res) => {
    const [rows] = await pool.query(`SELECT b.*, l.title AS listing_title, l.owner_id, l.owner_name
     FROM bookings b
     JOIN listings l ON l.id = b.listing_id
     WHERE l.owner_id = ?
     ORDER BY b.id DESC`, [req.params.ownerId]);
    return res.json(rows);
});
router.post('/', async (req, res) => {
    const { listingId, userId, checkInDate, checkOutDate, totalPrice, guestPhone, guestNotes, paymentMethod, } = req.body;
    const [userRows] = await pool.query('SELECT status FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = userRows[0];
    if (!user || user.status === 'blocked') {
        return res.status(403).json({ message: 'Compte bloque ou introuvable.' });
    }
    const [listingRows] = await pool.query('SELECT status FROM listings WHERE id = ? LIMIT 1', [listingId]);
    const listing = listingRows[0];
    if (!listing || listing.status !== 'approved') {
        return res.status(400).json({ message: 'Annonce non disponible.' });
    }
    const [settingsRows] = await pool.query('SELECT commission_rate FROM settings WHERE id = 1 LIMIT 1');
    const commissionRate = Number(settingsRows[0]?.commission_rate ?? 0.1);
    const platformFee = Number(totalPrice) * commissionRate;
    const ownerPayout = Number(totalPrice) - platformFee;
    const [result] = await pool.execute(`INSERT INTO bookings (listing_id, user_id, check_in_date, check_out_date, total_price, guest_phone, guest_notes, payment_method, status, platform_fee, owner_payout)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        listingId,
        userId,
        checkInDate,
        checkOutDate,
        totalPrice,
        guestPhone,
        guestNotes,
        paymentMethod,
        'pending',
        platformFee,
        ownerPayout,
    ]);
    const insertId = result.insertId;
    const [rows] = await pool.query(`SELECT b.*, l.owner_id, l.owner_name, l.owner_phone, l.title AS listing_title
     FROM bookings b
     JOIN listings l ON l.id = b.listing_id
     WHERE b.id = ?
     LIMIT 1`, [insertId]);
    return res.status(201).json(rows[0]);
});
export default router;
