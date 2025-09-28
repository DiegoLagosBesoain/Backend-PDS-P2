const Component = require("../Component.js");

class Selector extends Component {
  constructor(node, simulator) {
    super(node, simulator); // inicializa lo común (fallas, params, etc.)
    this.strategy = node.params?.estrategia || "prioridad"; // "prioridad" o "orden"
    this.entradas = node.params?.entradas || 1;
    this.salidas = node.params?.salidas || 1;
    this.ordenEntradas = node.params?.orden_entradas || []; // ej: ["in-0","in-1",...]
    this.lastIndex = 0; // para "orden"
  }

  init() {
    super.init(); // activa fallas si hay configuradas
    console.log(`[t=${this.simulator.clock}] Selector ${this.id} inicializado`);
  }

  /** Retorna la cantidad total de elementos disponibles en todas las entradas */
  count(tipo = null) {
    if (this.failed) return 0;

    const edgesIn = this.simulator.processDef.edges.filter(e => e.to === this.id);
    let total = 0;

    for (const edge of edgesIn) {
      const comp = this.simulator.components[edge.from];
      if (comp?.count) {
        total += comp.count(tipo);
      }
    }
    console.log("total que puede entregar el selector",total)
    return total;
  }

  /** Un componente de salida pide elementos al selector */
  request(time, cantidad = 1) {
  const edgesIn = this.simulator.processDef.edges.filter(e => e.to === this.node.id);
  console.log("le estan pidiendo al selector", cantidad);
  if (this.failed) {
    console.log(`[t=${time}] ⚠️ Selector ${this.id} está en falla, no puede entregar elementos`);
    return null;
  }

  if (edgesIn.length === 0) {
    console.log(`[t=${time}] ⚠️ Selector ${this.id} no tiene entradas conectadas`);
    return null;
  }

  const entregados = [];
  const entradas = this.ordenEntradas || [];

  switch (this.strategy) {
    case "prioridad":
      // Para cada entrada en orden de prioridad: extraer de a 1 hasta que la entrada se agote o se complete la cantidad.
      for (let entrada of entradas) {
        if (entregados.length >= cantidad) break;

        const edge = edgesIn.find(e => e.targetHandle === entrada);
        if (!edge) continue;

        const comp = this.simulator.components[edge.from];
        if (!comp) continue;

        // Si el componente no tiene elementos (count === 0) saltamos
        while (entregados.length < cantidad && typeof comp.count === "function" && comp.count() > 0) {
          const res = comp.request?.(time, 1);
          if (!res) break;

          if (Array.isArray(res)) {
            // si devuelve array, empujar elementos (puede pasar que devuelva [element] por compatibilidad)
            for (const e of res) {
              if (entregados.length >= cantidad) break;
              if (e) entregados.push(e);
            }
            // si devolvió elementos, continuar pidiendo hasta que se agote (según count) o complete cantidad
            if (res.length === 0) break;
          } else {
            entregados.push(res);
          }

          console.log(`[t=${time}] 🎯 Selector ${this.id} tomó 1 elemento de ${edge.from} (${entrada}). Total entregados: ${entregados.length}`);
          
        }
        // cuando esta fuente se agote, pasamos a la siguiente prioridad
      }
      break;

    case "orden":
      // Round-robin: empezamos en this.lastIndex y vamos pidiendo de a 1 por entrada hasta completar cantidad.
      if (!entradas.length) break;
      const n = entradas.length;
      // Asegurarnos de que lastIndex está definido y en rango
      let startIndex = (typeof this.lastIndex === "number" ? this.lastIndex : 0) % n;
      let scanned = 0; // contaremos entradas consecutivas sin entrega; si llegamos a n, no hay más elementos
      let idx = startIndex;

      while (entregados.length < cantidad && scanned < n) {
        const entrada = entradas[idx];
        const edge = edgesIn.find(e => e.targetHandle === entrada);
        idx = (idx + 1) % n; // próximo índice para la siguiente iteración
        // si no hay edge para este handle, incrementar scanned y continuar
        if (!edge) {
          scanned++;
          continue;
        }

        const comp = this.simulator.components[edge.from];
        if (!comp) {
          scanned++;
          continue;
        }

        // pedir de a 1
        const res = comp.request?.(time, 1);
        if (!res) {
          // si no devolvió nada, contar como escaneo sin entrega
          scanned++;
          continue;
        }

        // Si se obtuvo algo, resetear scanned y agregar elementos (soportamos array o single)
        scanned = 0;
        if (Array.isArray(res)) {
          for (const e of res) {
            if (entregados.length >= cantidad) break;
            if (e) entregados.push(e);
          }
          console.log(`[t=${time}] 🔄 Selector ${this.id} tomó ${res.length} elemento(s) de ${edge.from} (${entrada})`);
        } else {
          entregados.push(res);
          console.log(`[t=${time}] 🔄 Selector ${this.id} tomó 1 elemento de ${edge.from} (${entrada})`);
        }

        // actualizar lastIndex para que la próxima llamada empiece después del último índice usado
        this.lastIndex = idx % n;
      }
      break;

    default:
      console.warn(`[t=${time}] Selector ${this.id} estrategia desconocida: ${this.strategy}`);
  }

  if (entregados.length === 0) {
    console.log(`[t=${time}] ⚠️ Selector ${this.id} no encontró elementos disponibles en ninguna entrada`);
    return null;
  }

  if (entregados.length < cantidad) {
    console.log(`[t=${time}] ⚠️ Selector ${this.id} solo pudo entregar ${entregados.length}/${cantidad}`);
  }
  entregados.forEach((elemento)=>{
    
    this.simulator.register[elemento.id][`${this.id}-${this.type}`]=time
  })
  console.log(`[t=${time}] Selector ${this.id} entregó`, entregados);
  return entregados;
}


  /** 🔔 Aviso de disponibilidad */
  notifyAvailable(time, entradaId = "in-0") {
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Selector ${this.id} en falla, no notifica downstream`);
      return;
    }
    this.notifyDownstream(time);
  }

  notifyDownstream(time) {
    const edgesOut = this.simulator.processDef.edges.filter(e => e.from === this.id);
    for (let edge of edgesOut) {
      const comp = this.simulator.components[edge.to];
      if (comp?.notifyAvailable) {
        comp.notifyAvailable(time, edge.targetHandle || "in-0");
      }
    }
  }
}

module.exports = Selector;
