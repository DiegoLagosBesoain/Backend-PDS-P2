const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Rutas existentes
const componentsRoutes = require("./routes/components");
const connectionsRoutes = require("./routes/connections");
const elementsRoutes = require("./routes/elements");
const simulationRoutes = require("./routes/simulation");

// NUEVAS rutas
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const processesRouter = require("./routes/processes");

const app = express();
app.use(cors());
app.use(express.json());

// Rutas API
app.use("/api", componentsRoutes);
app.use("/api", connectionsRoutes);
app.use("/api", elementsRoutes);
app.use("/api", simulationRoutes);

// Rutas de usuarios y proyectos
app.use("/api", userRoutes);
app.use("/api", projectRoutes);
app.use("/api", processesRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});