const { Router } = require("express");
const pool = require("../db"); // apunta al archivo correcto
const { v4: uuidv4 } = require("uuid");

const router = Router();

// GET /api/projects/:projectId/processes
router.get("/projects/:projectId/processes", async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM processes WHERE project_id = $1 ORDER BY name",
      [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener procesos" });
  }
});

// POST /api/projects/:projectId/processes
router.post("/projects/:projectId/processes", async (req, res) => {
  const { projectId } = req.params;
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });

  try {
    const id = uuidv4();
    const result = await pool.query(
      "INSERT INTO processes (id, name, project_id) VALUES ($1, $2, $3) RETURNING *",
      [id, name, projectId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el proceso" });
  }
});
router.delete("/projects/:projectId/processes/:processId", async (req, res) => {
  const { processId } = req.params;

  try {
    // Si tienes elementos o datos relacionados, aquí podrías borrarlos primero
    await pool.query("DELETE FROM processes WHERE id = $1", [processId]);

    res.json({ message: "Proceso eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el proceso" });
  }
});
/**
 * POST /api/projects/:projectId/processes/:processId/duplicate
 * Body: { name: "nombre nuevo" }
 */
router.post("/projects/:projectId/processes/:processId/duplicate", async (req, res) => {
  const { projectId, processId } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Verificar que exista el proceso original
    const origProc = await client.query("SELECT * FROM processes WHERE id = $1", [processId]);
    if (origProc.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Proceso original no encontrado" });
    }

    // 2) Crear nuevo proceso
    const newProcessId = uuidv4(); // <-- usa uuidv4()
    await client.query(
      "INSERT INTO processes (id, name, project_id) VALUES ($1, $2, $3)",
      [newProcessId, name, projectId]
    );

    // 3) Clonar components (nodos) y construir mapping oldId -> newId
    const compsRes = await client.query("SELECT * FROM components WHERE process_id = $1", [processId]);
    const mapping = {}; // oldComponentId -> newComponentId
    const insertedComponents = [];

    for (const c of compsRes.rows) {
      const newCompId = uuidv4(); // <-- usa uuidv4()
      mapping[c.id] = newCompId;

      const insertComp = await client.query(
        `INSERT INTO components (id, process_id, type, label, pos_x, pos_y, params)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [newCompId, newProcessId, c.type, c.label, c.pos_x, c.pos_y, c.params]
      );
      insertedComponents.push(insertComp.rows[0]);
    }

    // 4) Clonar connections (edges) usando el mapping
    const connsRes = await client.query("SELECT * FROM connections WHERE process_id = $1", [processId]);
    const insertedConnections = [];

    for (const cn of connsRes.rows) {
      const newConnId = uuidv4(); // <-- usa uuidv4()
      const newFrom = mapping[cn.from_component_id] || cn.from_component_id;
      const newTo = mapping[cn.to_component_id] || cn.to_component_id;

      const sourceHandle = cn.sourcehandle ?? cn.sourceHandle ?? null;
      const targetHandle = cn.targethandle ?? cn.targetHandle ?? null;
      const markerEnd = cn.markerend ?? cn.markerEnd ?? null;

      const insertConn = await client.query(
        `INSERT INTO connections
         (id, process_id, from_component_id, to_component_id, sourcehandle, targethandle, markerend)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [newConnId, newProcessId, newFrom, newTo, sourceHandle, targetHandle, markerEnd]
      );
      insertedConnections.push(insertConn.rows[0]);
    }

    await client.query("COMMIT");

    // Obtener nuevo proceso (opcional)
    const newProcRow = (await client.query("SELECT * FROM processes WHERE id = $1", [newProcessId])).rows[0];
    res.status(201).json({
      process: newProcRow,
      components: insertedComponents,
      connections: insertedConnections,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error duplicando proceso:", err);
    res.status(500).json({ error: "Error al duplicar proceso" });
  } finally {
    client.release();
  }
});



module.exports = router;
