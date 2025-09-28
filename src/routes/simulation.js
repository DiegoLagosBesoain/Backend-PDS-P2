// routes/simulation.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const { v4: uuidv4 } = require("uuid");

const Simulator = require("../Models/components/simulator");

/**
 * POST /api/simulation/run
 * Body: { processDef, duration, processId }
 * Ejecuta la simulación y la guarda en la tabla simulations con process_id.
 */
router.post("/simulation/run", async (req, res) => {
  const client = await pool.connect();
  try {
    const { processDef, duration, processId } = req.body;

    if (!processDef || !processDef.nodes || !processDef.edges) {
      return res.status(400).json({ error: "processDef inválido" });
    }

    if (!processId) {
      return res.status(400).json({ error: "processId es requerido para guardar la simulación" });
    }

    // validar que el proceso exista (opcional pero recomendable)
    const procCheck = await client.query("SELECT id FROM processes WHERE id = $1", [processId]);
    if (procCheck.rowCount === 0) {
      return res.status(400).json({ error: "processId no corresponde a ningún proceso existente" });
    }

    console.log("▶️ Nueva simulación recibida para process:", processId, "duración:", duration);

    // Ejecutar simulador (si tu Simulator.run es síncrono o asíncrono)
    const simulator = new Simulator(processDef, { type: "tiempo", valor: duration });
    // si run es async:
    if (typeof simulator.run === "function") {
      await simulator.run();
    }

    const results = {
      register: simulator.register,
      stats: {
        totalElements: simulator.elements?.length ?? 0,
        clock: simulator.clock,
      },
      nodeStats: Object.entries(simulator.components || {}).map(([id, comp]) => ({
        nodeId: id,
        type: comp.node?.type,
        stored: comp.elements ? comp.elements.length : undefined,
        generated: comp.generatedCount ?? undefined,
        sensors: comp.sensors?.map(s => s.report()) ?? []
      })),
    };

    const stats = {
      durationProvided: duration,
      nodesCount: (processDef.nodes || []).length,
      edgesCount: (processDef.edges || []).length,
    };

    // Guardar la simulación en DB
    const simId = uuidv4();
    const insertQuery = `
      INSERT INTO simulations (id, process_id, process_def, duration, results, stats)
      VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb)
      RETURNING *
    `;

    const insertRes = await client.query(insertQuery, [
      simId,
      processId,
      JSON.stringify(processDef),
      duration,
      JSON.stringify(results),
      JSON.stringify(stats),
    ]);

    const savedSim = insertRes.rows[0];

    return res.status(201).json({
      success: true,
      duration,
      results,
      simulation: savedSim,
      simId:simId
    });
  } catch (err) {
    console.error("❌ Error ejecutando/guardando simulación:", err);
    return res.status(500).json({ error: "Error en la simulación" });
  } finally {
    client.release();
  }
});

/**
 * GET /api/simulations/:id  -> recuperar una simulación por id
 */
router.get("/simulations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query("SELECT * FROM simulations WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Simulación no encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error obteniendo simulación:", err);
    res.status(500).json({ error: "Error al obtener simulación" });
  }
});

/**
 * GET /api/processes/:processId/simulations  -> listar simulaciones de un proceso
 */
router.get("/processes/:processId/simulations", async (req, res) => {
  const { processId } = req.params;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM simulations WHERE process_id = $1 ORDER BY timestamp DESC",
      [processId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error listando simulaciones:", err);
    res.status(500).json({ error: "Error al listar simulaciones" });
  }
});
// DELETE /api/simulations/:id
router.delete("/simulations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM simulations WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Simulación no encontrada" });
    return res.json({ deleted: true });
  } catch (err) {
    console.error("Error eliminando simulación:", err);
    return res.status(500).json({ error: "Error al eliminar simulación" });
  }
});


module.exports = router;
