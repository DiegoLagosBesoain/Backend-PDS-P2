// src/routes/elements.js
const router = require("express").Router();
const pool = require("../db"); // pool de pg
const { v4: uuid } = require("uuid");

// -------------------- GET elementos por proceso --------------------
router.get("/processes/:project_id/elements", async (req, res) => {
  const { project_id } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM elements WHERE project_id = $1",
      [project_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- POST crear elemento --------------------
router.post("/processes/:project_id/elements", async (req, res) => {
  const { project_id } = req.params;
  const { type, params = {} } = req.body;
  const id = uuid();

  // Asegurar que params sea siempre un objeto
  const safeParams = typeof params === "object" && !Array.isArray(params) ? params : {};

  try {
    const { rows } = await pool.query(
      `INSERT INTO elements (id, project_id, type, params)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, project_id, type, safeParams]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- PUT actualizar elemento --------------------
router.put("/elements/:id", async (req, res) => {
  const { id } = req.params;
  const { type, params } = req.body;

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE elements
       SET type = COALESCE($1, type),
           params = COALESCE($2, params)
       WHERE id = $3
       RETURNING *`,
      [type, params, id]
    );

    if (rowCount === 0) return res.status(404).json({ error: "Elemento no existe" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- DELETE elemento --------------------
router.delete("/elements/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM elements WHERE id = $1",
      [id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Elemento no existe" });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
