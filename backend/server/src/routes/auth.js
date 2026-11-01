import { Router } from 'express';
import pool from '../db.js';
const router = Router();
const validRoles = ['client', 'host'];
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
    }
    const [rows] = await pool.query('SELECT id, name, email, role, phone, cin, city, address, description, is_admin, status FROM users WHERE email = ? AND password = ? LIMIT 1', [email, password]);
    const user = rows[0];
    if (!user) {
        return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    if (user.status === 'blocked') {
        return res.status(403).json({ message: 'Compte bloque.' });
    }
    return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        cin: user.cin,
        city: user.city,
        address: user.address,
        description: user.description,
        isAdmin: !!user.is_admin,
    });
});
router.post('/register', async (req, res) => {
    const { name, email, password, role, phone, cin, city, address, description } = req.body;
    const resolvedRole = typeof role === 'string' && validRoles.includes(role) ? role : 'client';
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Nom, email et mot de passe sont requis.' });
    }
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: 'Role invalide.' });
    }
    const [existingRows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingRows.length > 0) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }
    const [result] = await pool.execute('INSERT INTO users (name, email, password, role, phone, cin, city, address, description, is_admin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [name, email, password, resolvedRole, phone || null, cin || null, city || null, address || null, description || null, 0, 'active']);
    const insertId = result.insertId;
    return res.status(201).json({
        id: insertId,
        name,
        email,
        role: resolvedRole,
        phone,
        cin,
        city,
        address,
        description,
        isAdmin: false,
    });
});
export default router;
