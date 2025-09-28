const Component = require("../Component");

class Output extends Component {
  constructor(node, simulator) {
    super(node, simulator);
    this.elements = []; // [{elemento, entradaId}, ...]
  }

  init() {
    super.init(); // 👈 inicializa fallas según lo definido en Component.js
    console.log(`[t=${this.simulator.clock}] Output ${this.node.id} inicializado`);
  }

  /** Cuando un componente le envía un elemento */
  receive(elemento, time, entradaId = null) {
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Output ${this.id} está en falla, NO recibe elemento ${elemento?.id}`);
      return;
    }

    if (!elemento || typeof elemento.id === "undefined") {
      console.warn(`[t=${time}] Output recibió algo inválido:`, elemento);
      return;
    }

    this.elements.push({ elemento, entradaId });
    this.simulator.register[elemento.id][`${this.id}-${this.type}`]=time
    console.log(`[t=${time}] ➕ Output ${this.node.id} recibió elemento ${elemento.id}. Total=${this.elements.length}`);

    // debug extra
    this.elements.forEach(e => {
      console.log(`  ↳ Elemento: ${e.elemento.id}, attrs:`, e.elemento.attributes);
    });
  }
}

module.exports = Output;


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