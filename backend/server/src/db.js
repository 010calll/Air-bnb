import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fusion_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
export async function initDb() {
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'client',
      phone VARCHAR(50),
      cin VARCHAR(50),
      city VARCHAR(100),
      address VARCHAR(255),
      description TEXT,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS listings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      city VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      image LONGTEXT NOT NULL,
      images JSON,
      beds INT NOT NULL DEFAULT 1,
      baths INT NOT NULL DEFAULT 1,
      kitchens INT DEFAULT 1,
      salons INT DEFAULT 1,
      description TEXT NOT NULL,
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      owner_id INT,
      owner_name VARCHAR(150),
      owner_phone VARCHAR(50),
      address VARCHAR(255),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      listing_id INT NOT NULL,
      user_id INT NOT NULL,
      check_in_date DATE NOT NULL,
      check_out_date DATE NOT NULL,
      total_price DECIMAL(10,2) NOT NULL,
      guest_phone VARCHAR(50),
      guest_notes TEXT,
      payment_method VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
      owner_payout DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      listing_id INT NOT NULL,
      user_id INT NOT NULL,
      rating INT NOT NULL,
      comment TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    await pool.execute(`
    CREATE TABLE IF NOT EXISTS reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reporting_user_id INT NOT NULL,
      target_type VARCHAR(20) NOT NULL,
      target_id INT NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporting_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
    await pool.execute('ALTER TABLE listings MODIFY COLUMN image LONGTEXT NOT NULL');

    await safeAlter('ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT "client"');
    await safeAlter("ALTER TABLE listings ADD COLUMN owner_id INT NULL");
    await safeAlter('ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT "active"');
    await safeAlter('ALTER TABLE listings ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT "pending"');
    await safeAlter('ALTER TABLE bookings ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT "pending"');
    await safeAlter("ALTER TABLE bookings ADD COLUMN platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0");
    await safeAlter("ALTER TABLE bookings ADD COLUMN owner_payout DECIMAL(10,2) NOT NULL DEFAULT 0");
    await safeAlter("ALTER TABLE settings ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000");
    await safeAlter("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL");
    await safeAlter("ALTER TABLE users ADD COLUMN cin VARCHAR(50) NULL");
    await safeAlter("ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL");
    await safeAlter("ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL");
    await safeAlter("ALTER TABLE users ADD COLUMN description TEXT NULL");
}
export async function seedSampleData() {
    const [adminRows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", ["admin@gmail.com"]);
    if (adminRows.length === 0) {
        await pool.execute("INSERT INTO users (name, email, password, role, is_admin, status) VALUES (?, ?, ?, ?, ?, ?)", ["Admin", "admin@gmail.com", "admin123", "admin", 1, "active"]);
    }
    const [clientRows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", ["client@example.com"]);
    if (clientRows.length === 0) {
        await pool.execute("INSERT INTO users (name, email, password, role, is_admin, status) VALUES (?, ?, ?, ?, ?, ?)", ["Client", "client@example.com", "client123", "client", 0, "active"]);
    }
    const [hostRows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", ["host@example.com"]);
    let hostId = null;
    if (hostRows.length === 0) {
        const [result] = await pool.execute("INSERT INTO users (name, email, password, role, is_admin, status) VALUES (?, ?, ?, ?, ?, ?)", ["Host", "host@example.com", "host123", "host", 0, "active"]);
        hostId = result.insertId;
    }
    else {
        hostId = hostRows[0]?.id;
    }
    const [settingsRows] = await pool.query("SELECT id FROM settings WHERE id = 1 LIMIT 1");
    if (settingsRows.length === 0) {
        await pool.execute("INSERT INTO settings (id, commission_rate) VALUES (?, ?)", [1, 0.1]);
    }
    const [listingRows] = await pool.query("SELECT COUNT(*) AS count FROM listings");
    const listingCount = listingRows[0]?.count ?? 0;
    if (listingCount === 0) {
        await pool.execute("INSERT INTO listings (title, city, price, image, images, beds, baths, kitchens, salons, description, rating, owner_id, owner_name, owner_phone, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            "Appartement moderne au centre",
            "Casablanca",
            320.0,
            "https://images.unsplash.com/photo-1",
            JSON.stringify([
                "https://images.unsplash.com/photo-1",
                "https://images.unsplash.com/photo-2",
            ]),
            2,
            1,
            1,
            1,
            "Appartement confortable et lumineux proche des transports.",
            4.7,
            hostId,
            "Karim",
            "+212600000001",
            "Rue des Fleurs, Casablanca",
            "approved",
            "Maison de campagne avec piscine",
            "Marrakech",
            520.0,
            "https://images.unsplash.com/photo-3",
            JSON.stringify([
                "https://images.unsplash.com/photo-3",
                "https://images.unsplash.com/photo-4",
            ]),
            3,
            2,
            1,
            1,
            "Très belle maison avec jardin, idéale pour les familles.",
            4.9,
            hostId,
            "Yasmine",
            "+212600000002",
            "Avenue du Palais, Marrakech",
            "approved",
        ]);
    }
}
async function safeAlter(query) {
    try {
        await pool.execute(query);
    }
    catch (error) {
        if (error?.code === "ER_DUP_FIELDNAME" || error?.errno === 1060) {
            return;
        }
        throw error;
    }
}
const connectWithRetry = () => {
    console.log("Connexion à la base de données...");
    pool
        .getConnection()
        .then((conn) => {
        console.log("✅ Connecté à MySQL");
        conn.release();
    })
        .catch((err) => {
        console.log("⏳ MySQL pas prêt, retry dans 5 secondes...");
        setTimeout(connectWithRetry, 5000);
    });
};
connectWithRetry();
export default pool;
