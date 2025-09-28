// src/routes/components.js
const router = require("express").Router();
const pool = require("../db"); // pool de pg

// -------------------- GET componentes por proceso --------------------
router.get("/processes/:pid/components", async (req, res) => {
  const { pid } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM components WHERE process_id = $1",
      [pid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- POST crear componente --------------------
router.post("/processes/:pid/components", async (req, res) => {
  const { pid } = req.params;
  const { type, label, pos_x, pos_y, params = {} } = req.body;
  const id = require("uuid").v4();

  try {
    const { rows } = await pool.query(
      `INSERT INTO components (id, process_id, type, label, pos_x, pos_y, params)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, pid, type, label, pos_x, pos_y, params]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- PUT actualizar componente --------------------
router.put("/components/:id", async (req, res) => {
  const { id } = req.params;
  const { type, label, pos_x, pos_y, params } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE components
       SET type = COALESCE($1, type),
           label = COALESCE($2, label),
           pos_x = COALESCE($3, pos_x),
           pos_y = COALESCE($4, pos_y),
           params = COALESCE($5, params)
       WHERE id = $6
       RETURNING *`,
      [type, label, pos_x, pos_y, params, id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Componente no existe" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- DELETE componente --------------------
router.delete("/components/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM components WHERE id = $1",
      [id]
    );

    if (rowCount === 0) return res.status(404).json({ error: "Componente no existe" });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
