import { Router } from 'express';
import pool from '../db.js';
const router = Router();
router.get('/', async (_req, res) => {
    const [rows] = await pool.query("SELECT * FROM listings WHERE status = 'approved' ORDER BY id DESC");
    return res.json(rows);
});
router.get('/owner/:ownerId', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM listings WHERE owner_id = ? ORDER BY id DESC', [req.params.ownerId]);
    return res.json(rows);
});
router.get('/:id', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ? LIMIT 1', [req.params.id]);
    const listing = rows[0];
    if (!listing || listing.status !== 'approved') {
        return res.status(404).json({ message: 'Logement introuvable.' });
    }
    return res.json(listing);
});
router.post('/', async (req, res) => {
    const { title, city, price, image, images, beds, baths, kitchens, salons, description, rating, ownerId, ownerName, ownerPhone, address, } = req.body;
    if (!ownerId) {
        return res.status(400).json({ message: 'ownerId est requis pour creer une annonce.' });
    }
    const [result] = await pool.execute(`INSERT INTO listings (title, city, price, image, images, beds, baths, kitchens, salons, description, rating, owner_id, owner_name, owner_phone, address, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        title,
        city,
        price,
        image,
        images ? JSON.stringify(images) : null,
        beds,
        baths,
        kitchens || 1,
        salons || 1,
        description,
        rating || 0,
        ownerId,
        ownerName,
        ownerPhone,
        address,
        'pending',
    ]);
    const insertId = result.insertId;
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ? LIMIT 1', [insertId]);
    return res.status(201).json(rows[0]);
});
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const [result] = await pool.execute(`UPDATE listings SET title = ?, city = ?, price = ?, image = ?, images = ?, beds = ?, baths = ?, kitchens = ?, salons = ?, description = ?, rating = ?, owner_name = ?, owner_phone = ?, address = ? WHERE id = ?`, [
        updates.title,
        updates.city,
        updates.price,
        updates.image,
        updates.images ? JSON.stringify(updates.images) : null,
        updates.beds,
        updates.baths,
        updates.kitchens,
        updates.salons,
        updates.description,
        updates.rating,
        updates.ownerName,
        updates.ownerPhone,
        updates.address,
        id,
    ]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Logement introuvable.' });
    }
    const [rows] = await pool.query('SELECT * FROM listings WHERE id = ? LIMIT 1', [id]);
    return res.json(rows[0]);
});
router.delete('/:id', async (req, res) => {
    const [result] = await pool.execute('DELETE FROM listings WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Logement introuvable.' });
    }
    return res.status(204).send();
});
export default router;
