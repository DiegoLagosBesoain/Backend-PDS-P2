const express = require("express");
const router = express.Router();
const pool = require("../db");

// Crear proyecto de un usuario
router.post("/projects", async (req, res) => {
  const { user_id, name, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, user_id`,
      [user_id, name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear proyecto" });
  }
});

// Obtener proyectos de un usuario
router.get("/projects/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM projects WHERE user_id = $1",
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener proyectos" });
  }
});

// Borrar un proyecto
router.delete("/projects/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM projects WHERE id = $1", [req.params.id]);
    res.json({ message: "Proyecto eliminado" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar proyecto" });
  }
});

module.exports = router;