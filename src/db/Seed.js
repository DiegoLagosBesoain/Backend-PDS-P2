const store = require("./MemoryStore");
const Component = require("../Models/Component");
const Connection = require("../Models/Connection");

// Crear algunos procesos
store.processes["p1"] = { id: "p1", name: "Proceso 1" };
store.processes["p2"] = { id: "p2", name: "Proceso 2" };

// Crear algunos componentes con params
const c1 = new Component({
  id: store.uuid(),
  process_id: "p1",
  type: "generator",
  label: "Start",
  pos_x: 100,
  pos_y: 100,
  params: {
    label: "Start",
    distribucion: "exp",
    entradas: 0,   // opcional
    salidas: 1,
  },
});

const c2 = new Component({
  id: store.uuid(),
  process_id: "p1",
  type: "queue",
  label: "Task 1",
  pos_x: 300,
  pos_y: 100,
  params: {
    label: "Task 1",
    entradas: 1,
    salidas: 1,
    elemento: "N/A",
    estrategia: "FIFO",
    capacidad: "inf",
  },
});

const c3 = new Component({
  id: store.uuid(),
  process_id: "p1",
  type: "queue",
  label: "Task 2",
  pos_x: 500,
  pos_y: 100,
  params: {
    label: "Task 2",
    entradas: 1,
    salidas: 1,
    elemento: "N/A",
    estrategia: "FIFO",
    capacidad: "inf",
  },
});

store.components[c1.id] = c1;
store.components[c2.id] = c2;
store.components[c3.id] = c3;

// Crear algunas conexiones con handlers
const conn1 = new Connection({
  id: store.uuid(),
  process_id: "p1",
  from_component_id: c1.id,
  to_component_id: c2.id,
  sourceHandle: "out",
  targetHandle: "in-1",
});

const conn2 = new Connection({
  id: store.uuid(),
  process_id: "p1",
  from_component_id: c2.id,
  to_component_id: c3.id,
  sourceHandle: "out-1",
  targetHandle: "in-1",
});

// Transportador continuo
const c4 = new Component({
  id: store.uuid(),
  process_id: "p1",
  type: "transporter",
  label: "Correa de Transporte",
  pos_x: 700,
  pos_y: 100,
  params: {
    label: "Correa de Transporte",
    tipo: "continuo", // continuo o movil
    elemento: "Caja",
    distribucion: "exponencial", // distribución para tiempo de viaje
    t_viaje: 5, // tiempo de viaje esperado
    t_min_entrada: 2, // tiempo mínimo entre elementos en la entrada
    entradas: 1,
    salidas: 1,
  },
});

store.components[c4.id] = c4;

// Transportador móvil
const c5 = new Component({
  id: store.uuid(),
  process_id: "p1",
  type: "transporter",
  label: "Vehículo de Transporte",
  pos_x: 900,
  pos_y: 100,
  params: {
    label: "Vehículo de Transporte",
    tipo: "movil", // continuo o movil
    elemento: "Caja",
    distribucion: "normal",
    t_viaje: 8, // tiempo de viaje esperado
    capacidad: 10, // capacidad máxima por viaje
    t_espera_max: 15, // tiempo máximo de espera antes de salir
    entradas: 1,
    salidas: 1,
  },
});

store.components[c5.id] = c5;

