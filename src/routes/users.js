const express = require("express");
const router = express.Router();
const pool = require("../db"); // tu conexión a PostgreSQL

// Crear usuario (ej: cuando se loguea por Google por primera vez)
router.post("/users", async (req, res) => {
  try {
    const { email, username, uid } = req.body;

    const result = await pool.query(
      `INSERT INTO users (email, display_name, firebase_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET display_name= EXCLUDED.display_name
       RETURNING id, email, display_name, firebase_id`,
      [email, username, uid]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Error guardando usuario:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Obtener perfil de usuario
router.get("users/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, display_name FROM users WHERE id = $1",
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

module.exports = router;