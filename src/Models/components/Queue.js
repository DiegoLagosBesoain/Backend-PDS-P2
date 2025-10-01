const Component = require("../Component.js");

class Queue extends Component {
  constructor(node, simulator) {
    super(node, simulator); // inicializa Component (id, params, etc.)
    this.elements = []; // [{elemento, entradaId}, ...]

    this.capacity = node.params?.capacidad === "inf"
      ? Infinity
      : parseInt(node.params?.capacidad) || Infinity;

    this.strategy = node.params?.estrategia || "FIFO"; // FIFO, LIFO, PRIORIDAD, RANDOM
    this.prioridad = node.params?.prioridad || null;   // {atributo, orden}
  }

  init() {
    super.init(); // inicializa fallas si hay
    console.log(`[t=${this.simulator.clock}] Queue ${this.id} inicializada (capacidad=${this.capacity}, estrategia=${this.strategy})`);
  }

  /** Cuando un componente le envía un elemento */
  receive(elemento, time, entradaId = null) {
    // ⚠️ si está en falla, no recibe
    
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Queue ${this.id} está en falla, no recibe ${elemento.id}`);
    if (!this.simulator.steps[time]){
        this.simulator.steps[time]=[]
      }
    this.simulator.steps[time].push(`⚠️ Queue ${this.id} está en falla, no recibe ${elemento.id}`)
      return;
    }

    if (!elemento || typeof elemento.id === "undefined") {
      console.warn(`[t=${time}] Queue recibió algo inválido:`, elemento);
      return;
    }
    if (this.elements.length >= this.capacity) {
      console.log(`[t=${time}] ❌ Queue ${this.id} está llena, se pierde el elemento ${elemento.id}`);
      if (!this.simulator.steps[time]){
        this.simulator.steps[time]=[]
      }
      this.simulator.steps[time].push(`❌ Queue ${this.id} está llena, se pierde el elemento ${elemento.id}`)
      return;
    }
    this.elements.push({ elemento, entradaId });
    
    console.log(`[t=${time}] ➕ Queue ${this.id} recibió ${elemento.id}. Tamaño actual=${this.elements.length}`);
    if (!this.simulator.steps[time]){
        this.simulator.steps[time]=[]
      }
    this.simulator.steps[time].push(`➕ Queue ${this.id} recibió ${elemento.id}. Tamaño actual=${this.elements.length}`)
    this.simulator.register[elemento.id][`${this.id}-${this.type}`]=time
    // ✅ Notificar sensores de entrada
    this.notifySensors("entrada", { port: entradaId, elemento });
    this.notifyDownstream(time);
  }

  count(tipo = null) {
    if (!tipo) return this.elements.length;
    return this.elements.filter(w => w.elemento.type === tipo).length;
  }

  /** Cuando otro componente pide un elemento */
  request(time, cantidad = 1, salidaId = "out-0") {
    // ⚠️ si está en falla, no entrega
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Queue ${this.id} está en falla, no entrega nada`);
      return [];
    }

    if (this.elements.length < cantidad) {
      return [];
    }

    const entregados = [];
    for (let i = 0; i < cantidad; i++) {
      let wrapped;
      switch (this.strategy) {
        case "FIFO":
          wrapped = this.elements.shift();
          break;
        case "LIFO":
          wrapped = this.elements.pop();
          break;
        case "RANDOM":
          const idx = Math.floor(Math.random() * this.elements.length);
          wrapped = this.elements.splice(idx, 1)[0];
          break;
        case "PRIORIDAD":
          wrapped = this.getByPriority();
          break;
        default:
          wrapped = this.elements.shift();
      }
      entregados.push(wrapped.elemento);
      // ✅ Notificar sensores de salida
      this.notifySensors("salida", { port: salidaId, elemento: wrapped.elemento });
    }

    console.log(`[t=${time}] ➖ Queue ${this.id} entregó ${cantidad} elementos. Tamaño actual=${this.elements.length}`);
    if (!this.simulator.steps[time]){
        this.simulator.steps[time]=[]
      }
    this.simulator.steps[time].push(`➖ Queue ${this.id} entregó ${cantidad} elementos. Tamaño actual=${this.elements.length}`)
    return entregados;
  }

  /** 🔔 Avisar a los downstream cuando hay elementos */
  notifyDownstream(time) {
    if (this.failed) return; // ⚠️ si está en falla, no notifica
    const edgesOut = this.simulator.processDef.edges.filter(e => e.from === this.id);
    for (let edge of edgesOut) {
      const comp = this.simulator.components[edge.to];
      if (comp?.notifyAvailable) {
        comp.notifyAvailable(time, edge.targetHandle || "in-0");
      }
    }
  }

  /** Selección por prioridad según atributo y orden */
  getByPriority() {
    console.log("prioridades de la fila",this.prioridad,this.prioridad.atributo)
    if (!this.prioridad || !this.prioridad.atributo) {
      
      return this.elements.shift(); // fallback
    }

    const { atributo, orden } = this.prioridad;
    const prioridadMap = {};
    orden.forEach(o => { prioridadMap[o.valor] = o.posicion });

    let bestIdx = 0;
    let bestRank = Infinity;

    this.elements.forEach((wrapped, idx) => {
      const valor = wrapped.elemento.attributes[atributo];
      const rank = prioridadMap[valor] ?? Infinity;
      if (rank < bestRank) {
        bestRank = rank;
        bestIdx = idx;
      }
    });
    const elemento=this.elements.splice(bestIdx, 1)[0]
    console.log("elemento elejido",elemento,this.elements)
    return elemento;
  }
}

module.exports = Queue;


// Estructura de node que recibe queue:

// {
//     "id": "67087e4b-9698-4ede-8375-1cb7bf78c1b9",
//     "type": "queue",
//     "params": {
//         "label": "Fila botellas",
//         "params": {
//             "sensors": [
//                 {
//                     "type": "medidor_flujo",
//                     "intervalo": 23,
//                     "id_salidas": [
//                         "out-0",
//                         "out-1"
//                     ],
//                     "id_entradas": [
//                         "in-0"
//                     ]
//                 },
//                 {
//                     "type": "porcentaje_tiempo_encendido",
//                     "intervalo": 21,
//                     "id_salidas": [
//                         "out-0"
//                     ],
//                     "id_entradas": [
//                         "in-0",
//                         "in-1",
//                         "in-2"
//                     ]
//                 }
//             ],
//             "failures": [
//                 {
//                     "dist_duracion": {
//                         "tipo": "Uniforme",
//                         "params": {
//                             "a": 23,
//                             "b": 111
//                         }
//                     },
//                     "dist_activacion": {
//                         "tipo": "Exponencial",
//                         "params": {
//                             "lambda": 23
//                         }
//                     }
//                 }
//             ]
//         },
//         "salidas": 2,
//         "elemento": "botellla",
//         "entradas": 3,
//         "capacidad": "inf",
//         "prioridad": {
//             "orden": [
//                 {
//                     "valor": "true",
//                     "posicion": 2
//                 },
//                 {
//                     "valor": "false",
//                     "posicion": 1
//                 }
//             ],
//             "atributo": "limpio"
//         },
//         "estrategia": "PRIORIDAD"
//     }
// }






















// /** Enviar al siguiente nodo(s) según edges */
// send(time, sourceHandle = "out-0", cantidad = 1) {
//   const entregados = this.request(time, cantidad);
//   if (!entregados) return;

//   // Buscar edges que salgan de esta cola
//   const edges = this.simulator.processDef.edges.filter(
//     (e) => e.from === this.node.id && e.sourceHandle === sourceHandle
//   );

//   if (edges.length === 0) {
//     console.log(
//       `[t=${time}] ⚠️ Queue ${this.node.id} no tiene salidas conectadas en ${sourceHandle}`
//     );
//     return;
//   }

//   edges.forEach((edge) => {
//     const target = this.simulator.components[edge.to];
//     if (!target) return;

//     entregados.forEach(({ elemento }) => {
//       if (typeof target.request === "function") {
//         // caso pull: el target sabe pedir explícitamente
//         //target.request(time);
        
//       } else if (typeof target.receive === "function") {
//         // caso push: le mandamos el elemento directamente
//         target.receive(elemento, time, edge.targetHandle);
//         console.log(
//           `[t=${time}] 📤 Queue ${this.node.id} empujó elemento ${elemento.id} a ${edge.to} (${edge.targetHandle})`
//         );
//       } else {
//         console.warn(
//           `[t=${time}] ⚠️ Target ${edge.to} no soporta request ni receive`
//         );
//       }
//     });
//   });
// }
