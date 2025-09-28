// backend/src/Models/components/Transformer.js
// Transformer independiente (sin herencia). Compatible con la estructura del simulador que usas:
// - simulator.clock
// - simulator.schedule(time, fn)
// - simulator.processDef.edges (array de edges { source, target, sourceHandle?, targetHandle? })
// - simulator.components (map id -> instancia de componente)

class Transformer {
  constructor(node, simulator) {
    this.node = node;
    this.simulator = simulator;
    this.id = node.id;
    this.type = node.type || (node.data && node.data.tipo) || (node.params && node.params.tipo);
    this.config = node.data || node.params || {};

    // receta: { inputs: [{cantidad, elemento}], outputs: [{cantidad, elemento}] }
    this.receta = this.config.receta || this.config.recipe || { inputs: [], outputs: [] };
    this.salidasDef = this.config.salidasDef || this.config.outputsDef || [];
    this.distribucion = this.config.distribucion || this.config.distribution || null;

    this.buffers = {}; // buffers por handle: "in-0", "in-1", ...
    const entradasCount = (this.receta.inputs && this.receta.inputs.length) || 1;
    for (let i = 0; i < Math.max(1, entradasCount); i++) {
      this.buffers[`in-${i}`] = [];
    }

    this.busy = false;
    this.currentJob = null;
    this.generatedCount = 0;
    this.fallando = false
  }

  // Recibe un elemento desde upstream. inputHandle por ejemplo "in-0".
  receive(elemento, time, inputHandle = "in-0", meta = {}) {
    console.log("TRANSFORMER ESTA RECIBIENDOOOOOOO")
    if (!this.buffers[inputHandle]) this.buffers[inputHandle] = [];
    this.buffers[inputHandle].push(elemento);
    this.tryStartProcessing();
  }

  // Intenta comenzar el procesamiento si hay suficientes inputs y no está ocupado.
  //ESTO NO ESTA DEFINIDO BIEN, FALTA VER COMO AVISARLE A OTROS NODOS QUE QUIRES SACARLE ELEMENTOS

  tryStartProcessing(time) {
    if (this.busy) return;

    const recetaInputs = this.receta.inputs || [];
    if (recetaInputs.length === 0) return;

    const edgesIn = this.simulator.processDef.edges.filter(e => e.to === this.node.id);

    // 1️⃣ Verificar disponibilidad en todos los insumos
    for (const req of recetaInputs) {
      const need = req.cantidad || 1;
      const entrada = req.elemento;
      const edge = edgesIn.find(e => e.targetHandle === entrada);
      if (!edge) return;

      const comp = this.simulator.components[edge.from];
      if (!comp) return;

      // si el componente no tiene suficientes, abortar
      if ((comp.count?.(entrada) || 0) < need) {
        console.log(`[t=${time}] ❌ Transformer ${this.id} espera ${need} de ${entrada} pero ${edge.from} no tiene suficientes`);
        return;
      }
    }

    // 2️⃣ Ahora que sabemos que todos cumplen, pedirlos efectivamente
    const consumed = [];
    for (const req of recetaInputs) {
      const need = req.cantidad || 1;
      const entrada = req.elemento;
      const edge = edgesIn.find(e => e.targetHandle === entrada);
      const comp = this.simulator.components[edge.from];

      const entregados = comp.request?.(time, need); // ya confiamos que alcanza
      consumed.push(...entregados);
      console.log(`[t=${time}] 🔧 Transformer ${this.id} tomó ${need} de ${entrada} desde ${edge.from}`);
    }

    // 3️⃣ Arranca el proceso
    this.busy = true;
    this.consumed = consumed;
    this.endTime = time + (this.receta.tiempo || 1);

    console.log(`[t=${time}] ⚙️ Transformer ${this.id} inició proceso con insumos [${consumed.map(e => e.elemento.id).join(", ")}], terminará en t=${this.endTime}`);
  }

  // Cuando termina el tiempo, genera outputs y los envía
  finishProcessing() {
    const job = this.currentJob;
    if (!job) {
      this.busy = false;
      this.tryStartProcessing();
      return;
    }

    const outputs = [];
    const recetaOutputs = this.receta.outputs || [];

    for (const outDef of recetaOutputs) {
      const cantidad = outDef.cantidad || 1;
      const elementoTipo = outDef.elemento;
      for (let i = 0; i < cantidad; i++) {
        this.generatedCount++;
        // intentar obtener atributos por defecto desde salidasDef
        let attrs = {};
        if (Array.isArray(this.salidasDef) && this.salidasDef.length > 0) {
          const def = this.salidasDef.find((s) => s.elemento === elementoTipo) || this.salidasDef[0];
          if (def && def.params) attrs = { ...def.params };
          else if (def && !def.elemento && typeof def === "object") attrs = { ...def }; // fallback flexible
        }

        const elemento = {
          id: `${elementoTipo}-${this.generatedCount}`,
          type: elementoTipo,
          createdAt: this.simulator.clock,
          attributes: attrs,
          meta: {
            producedBy: this.id,
            consumedInputs: job.consumed.map((c) => ({ id: c.id, type: c.type })),
          },
        };
        outputs.push(elemento);
      }
    }

    // Envío: por defecto *broadcast* a todos los edges cuyo source === this.id
    // Si tus edges usan sourceHandle y quieres mapeo 1:1, ver comentario abajo.
    const edges = (this.simulator.processDef && this.simulator.processDef.edges) || [];
    outputs.forEach((outEl) => {
      edges.filter((e) => e.source === this.id).forEach((edge) => {
        const target = this.simulator.components[edge.target];
        if (target?.receive) {
          target.receive(outEl, this.simulator.clock, edge.targetHandle || "in-0", { fromEdge: edge });
        }
      });
      console.log(`[t=${this.simulator.clock}] Transformer ${this.id} produjo ${outEl.type} id=${outEl.id}`);
    });

    // limpiar y seguir con la cola
    this.currentJob = null;
    this.busy = false;
    this.tryStartProcessing();
  }

  // Muestreo del tiempo de procesamiento. Soporta dist simples y condiciones dependientes de atributos.
  sampleProcessingTime(dist, consumedElements = []) {
    if (!dist) return 0;

    // si hay condiciones, evaluarlas en orden
    if (dist.conditions && Array.isArray(dist.conditions)) {
      for (const cond of dist.conditions) {
        const candidate = consumedElements.find((el) => {
          if (cond.elementType && el.type !== cond.elementType) return false;
          const val = this.safeGetAttr(el, cond.paramKey);
          return this.evalOperator(val, cond.operator, cond.value);
        });
        if (candidate) {
          const chosen = cond.distribution || cond.distribucion || cond;
          return this.sampleProcessingTime(chosen, consumedElements);
        }
      }
      if (dist.default) return this.sampleProcessingTime(dist.default, consumedElements);
    }

    // caso normal: dist = { tipo/type, params/parametros }
    const tipo = (dist.tipo || dist.type || "").toString();
    const params = dist.params || dist.parametros || dist;

    if (!tipo) {
      // fallback: si hay a/b asumimos uniforme
      if (params && params.a != null && params.b != null) {
        const a = Number(params.a);
        const b = Number(params.b);
        return a + (b - a) * Math.random();
      }
      if (typeof params === "number") return params;
      return 0;
    }

    switch (tipo.toLowerCase()) {
      case "exponencial":
        {
          const lambda = (params && (params.lambda || params.lam)) || 1;
          return -Math.log(1 - Math.random()) / lambda;
        }
      case "normal":
        {
          const mu = (params && (params.mu || params.mean)) || 0;
          const sigma = (params && (params.sigma || params.sd)) || 1;
          let u1 = Math.random();
          let u2 = Math.random();
          const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          return Math.max(mu + sigma * z, 0);
        }
      case "uniforme":
      case "uniform":
        {
          const a = (params && (params.a ?? params.min)) ?? 0;
          const b = (params && (params.b ?? params.max)) ?? 1;
          return a + (b - a) * Math.random();
        }
      case "fija":
      case "fijo":
      case "fixed":
        {
          const v = (params && (params.valor ?? params.value)) ?? 0;
          return Number(v) || 0;
        }
      default:
        return 0;
    }
  }

  // leer atributo anidado desde element.attributes (soporta "a.b.c")
  safeGetAttr(element, key) {
    if (!element) return undefined;
    if (!key) return undefined;
    const parts = String(key).split(".");
    let cur = element.attributes ?? element;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  evalOperator(left, operator, right) {
    if (operator == null) operator = "=";
    switch (operator) {
      case "=":
      case "==":
        return left == right;
      case "!=":
      case "<>":
        return left != right;
      case ">":
        return Number(left) > Number(right);
      case ">=":
        return Number(left) >= Number(right);
      case "<":
        return Number(left) < Number(right);
      case "<=":
        return Number(left) <= Number(right);
      default:
        return left == right;
    }
  }
}

module.exports = Transformer;
