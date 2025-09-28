// src/routes/connections.js
const router = require("express").Router();
const pool = require("../db"); // pool de pg
const { v4: uuid } = require("uuid");

// -------------------- GET conexiones por proceso --------------------
router.get("/processes/:pid/connections", async (req, res) => {
  const { pid } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM connections WHERE process_id = $1",
      [pid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- POST crear conexión --------------------
router.post("/processes/:pid/connections", async (req, res) => {
  const { pid } = req.params;
  const { from_component_id, to_component_id, sourceHandle , targetHandle , markerEnd = { type: "arrow", width: 12, height: 12, color: "#000" } } = req.body;
  const id = uuid();

  try {
    const { rows } = await pool.query(
      `INSERT INTO connections (id, process_id, from_component_id, to_component_id,sourceHandle, targetHandle, markerEnd)
       VALUES ($1, $2, $3, $4, $5,$6,$7)
       RETURNING *`,
      [id, pid, from_component_id, to_component_id, sourceHandle, targetHandle, markerEnd ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------- DELETE conexión --------------------
router.delete("/connections/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM connections WHERE id = $1",
      [id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Conexión no existe" });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
