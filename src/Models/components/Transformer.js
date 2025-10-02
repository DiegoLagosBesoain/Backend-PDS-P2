const Component = require("../Component.js");
const sampleFromDistribution = require("../utils/distributions");

class Transformer extends Component {
  constructor(node, simulator) {
    super(node, simulator);
    this.id = node.id;
    this.type = node.type || (node.data && node.data.tipo) || (node.params && node.params.tipo);
    this.config = node.data || node.params || {};

    // receta: { inputs: [{cantidad, elemento}], outputs: [{cantidad, elemento}] }
    this.receta = this.config.receta || this.config.recipe || { inputs: [], outputs: [] };
    this.salidasDef = this.config.salidasDef || this.config.outputsDef || [];
    this.distribucion = this.config.params.distribution 

    this.buffers = {}; // buffers por handle: "in-0", "in-1", ...
    const entradasCount = (this.receta.inputs && this.receta.inputs.length) || 1;
    for (let i = 0; i < Math.max(1, entradasCount); i++) {
      this.buffers[`in-${i}`] = [];
    }

    this.busy = false;
    this.currentJob = null;
    this.generatedCount = 0;

    // 🔹 Manejo de fallas
    this.failed = false;
    this.failures = (this.config?.params?.failures || []);
  }

    /** Inicializar fallas al comienzo de la simulación */
  init() {
    super.init(); // activa fallas si están configuradas
    if (this.failures.length) {
      this.failures.forEach(f => this.scheduleFailure(f));
    }
  }

  scheduleFailure(failure) {
    const t_activacion = sampleFromDistribution(failure.dist_activacion);
    this.simulator.schedule(this.simulator.clock + t_activacion, () => this.startFailure(failure));
  }

  startFailure(failure) {
    this.failed = true;
    //console.log("failure: ", failure)
    const t_duracion = sampleFromDistribution(failure.dist_duracion);
    //console.log("t_duracion: ", t_duracion)
    console.log(`[t=${this.simulator.clock}] ❌ Transformer ${this.id} FALLÓ durante ${t_duracion}`);
    this.simulator.schedule(this.simulator.clock + t_duracion, () => this.endFailure(failure));
  }

  endFailure(failure) {
    this.failed = false;
    console.log(`[t=${this.simulator.clock}] ✅ Transformer ${this.id} RECUPERADO`);
    this.scheduleFailure(failure);
  }

  isAvailable() {
    return !this.failed;
  }

  // ⬇️ Modificaciones mínimas para respetar fallas
  notifyAvailable(time, entradaId = "in-0") {
    if (this.failed) return;
    this.tryStartProcessing(time);
  }



  // Recibe un elemento desde upstream
  receive(elemento, time, inputHandle = "in-0", meta = {}) {

    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Transformer ${this.id} está fallando, no puede recibir ${elemento.type}`);
      return;
    }
    console.log(`[t=${time}] Transformer ${this.id} recibió ${elemento.type}`);
    if (!this.buffers[inputHandle]) this.buffers[inputHandle] = [];
    this.buffers[inputHandle].push(elemento);
    // ✅ Notificar sensores de ENTRADA

    

    // programar intento de procesamiento
    this.simulator.schedule(time, () => this.tryStartProcessing(this.simulator.clock));
  }

  // Intenta comenzar el procesamiento si hay suficientes insumos
  tryStartProcessing(time) {
    if (this.busy || this.failed) return;

    const recetaInputs = this.receta.inputs || [];
    if (recetaInputs.length === 0) return;

    const edgesIn = this.simulator.processDef.edges.filter(e => e.to === this.node.id);

    // 1️⃣ Verificar disponibilidad
    for (const req of recetaInputs) {
      const need = req.cantidad || 1;
      const entrada = req.elemento;
      const edge = edgesIn.find(e => e.targetHandle === entrada);
      if (!edge) return;

      const comp = this.simulator.components[edge.from];
      if (!comp) return;

      if ((comp.count?.(entrada) || 0) < need) {
        console.log(`[t=${time}] ❌ Transformer ${this.id} espera ${need} de ${entrada} pero ${edge.from} no tiene suficientes`);
        return;
      }
    }

    // 2️⃣ Consumir insumos
    const consumed = [];
    for (const req of recetaInputs) {
      const need = req.cantidad || 1;
      const entrada = req.elemento;
      const edge = edgesIn.find(e => e.targetHandle === entrada);
      const comp = this.simulator.components[edge.from];

      const entregados = comp.request?.(time, need);
      consumed.push(...entregados);
      console.log(`[t=${time}] 🔧 Transformer ${this.id} tomó ${need} de ${entrada} desde ${edge.from}`);
    }

    // 3️⃣ Arranca proceso
    consumed.forEach((elemento)=>{
      this.notifySensors("entrada", { port: inputHandle, elemento });
      this.simulator.register[elemento.id][`${this.id}-${this.type}`]=time
    })
    this.busy = true;
    this.currentJob = { consumed };
    const duracion = this.receta.tiempo || this.sampleProcessingTime(this.distribucion, consumed);
    const endTime = time + duracion;

    console.log(`[t=${time}] ⚙️ Transformer ${this.id} inició proceso, terminará en t=${endTime}`);
    if (!this.simulator.steps[time]){
              this.simulator.steps[time]=[]
        }
    this.simulator.steps[time].push(`⚙️ Transformer ${this.id} inició proceso, terminará en t=${endTime}`)
    this.simulator.schedule(endTime, () => this.finishProcessing(endTime));
  }

finishProcessing(time) {
  const job = this.currentJob;
  this.currentJob = null;
  this.busy = false;


  if (this.failed) {
    console.log(`[t=${time}] ⚠️ Transformer ${this.id} terminó job pero está en falla, no entrega outputs`);
    return;
  }

  const outputs = [];
  const recetaOutputs = this.receta.outputs || [];

  recetaOutputs.forEach((outDef) => {
    const cantidad = outDef.cantidad || 1;
    const elementoTipo = outDef.elemento;

    for (let i = 0; i < cantidad; i++) {
      this.generatedCount++;
      let attrs = {};
      const def = this.salidasDef.find((s) => s.elemento === elementoTipo) || {};
      if (def.params) attrs = { ...def.params };

      const elemento = {
        id: `${elementoTipo}-${this.generatedCount}-${this.id}`,
        type: elementoTipo,
        createdAt: time,
        attributes: attrs,
        // meta: {
        //   producedBy: this.id,
        //   salidaHandle: elementoTipo, // 👈 el handle es el nombre del elemento
        //   consumedInputs: job.consumed.map((c) => ({ id: c.id, type: c.type })),
        // },
      };
      outputs.push(elemento);
      // ✅ Notificar sensores de SALIDA
      console.log("elementoTipo: ", elementoTipo)
      this.notifySensors("salida", { port: elementoTipo, elemento });
    }
  });

  const edges = this.simulator.processDef.edges || [];

  //console.log("edges optimus prime: ", edges)

  outputs.forEach((elemento) => {
    // 🔹 Buscar solo edges cuyo sourceHandle = nombre del elemento
    const edgesOut = edges.filter(
      (e) => e.from === this.id && e.sourceHandle === elemento.type
    );

  //console.log("outputs optimus prime: ", outputs)
  //console.log("edgesOut optimus prime: ", edgesOut)

    edgesOut.forEach((edge) => {
      const target = this.simulator.components[edge.to];
      //console.log("target optimus prime: ", target)
      if (target?.receive) {
        this.simulator.schedule(time, () => {

            //console.log("elemento optimus prime: ", elemento)

            return target.receive(elemento, this.simulator.clock, edge.targetHandle || "in-0")
        }
          
        );
      }
    });
    this.simulator.register[elemento.id]={"params":elemento.attributes}
    this.simulator.register[elemento.id][`${this.id}-${this.type}`]=time
    if (!this.simulator.steps[time]){
              this.simulator.steps[time]=[]
        }
    this.simulator.steps[time].push(`Transformer ${this.id} produjo ${elemento.type}`)
    console.log(`[t=${time}] Transformer ${this.id} produjo ${elemento.type}`);
  });

  // Intentar continuar con el próximo procesamiento
  this.simulator.schedule(time, () => this.tryStartProcessing(this.simulator.clock));
}


  // Muestreo de tiempo de procesamiento
  sampleProcessingTime(dist, consumedElements = []) {
  console.log("distribucion transformer", dist);
  console.log("elementos consumidos",consumedElements)
  if (!dist) return 0;

  // --- condiciones: solo evaluar sobre el primer elemento ---
  if (dist.conditions && Array.isArray(dist.conditions)) {
    const first = consumedElements && consumedElements.length > 0 ? consumedElements[0] : null;

    if (first) {
      for (const cond of dist.conditions) {
        if (cond.elementType && first.type !== cond.elementType) continue;

        const val = this.safeGetAttr(first, cond.paramKey);
        if (this.evalOperator(val, cond.operator, cond.value)) {
          let chosen = cond.distribution || cond.distribucion || cond;
          // si la distribución viene como array, tomar un elemento aleatorio
          if (Array.isArray(chosen) && chosen.length > 0) {
            chosen = chosen[Math.floor(Math.random() * chosen.length)];
          }
          return this.sampleProcessingTime(chosen, consumedElements);
        }
      }
      if (dist.default) return this.sampleProcessingTime(dist.default, consumedElements);
    } else {
      // sin elementos consumidos: usar default si existe
      if (dist.default) return this.sampleProcessingTime(dist.default, consumedElements);
    }
  }

  // --- normalizar tipo/params ---
  const tipoRaw = (dist.tipo || dist.type || "").toString();
  const tipo = tipoRaw.toLowerCase();
  const params = dist.params || dist.parametros || dist;

  // caso sin tipo explícito: soporte {a,b} o número directo
  if (!tipo) {
    if (params && params.a != null && params.b != null) {
      const a = Number(params.a);
      const b = Number(params.b);
      return a + (b - a) * Math.random();
    }
    if (typeof params === "number") return params;
    // si params es string numérico
    if (!isNaN(Number(params))) return Number(params);
    return 0;
  }

  // helper para mapear aliases
  const isExp = tipo.includes("exp");
  const isNormal = tipo.includes("norm");
  const isUniform = tipo.includes("uni");
  const isFixed = tipo.includes("fij") || tipo.includes("fix");

  // --- sampling según tipo ---
  if (isExp) {
    const lambda = Number((params && (params.lambda || params.lam)) || 1) || 1;
    return -Math.log(1 - Math.random()) / lambda;
  }

  if (isNormal) {
    const mu = Number((params && (params.mu || params.mean)) || 0);
    const sigma = Number((params && (params.sigma || params.sd)) || 1) || 1;
    let lastSample = 0;
    for (let attempt = 0; attempt < 10; attempt++) {
      const u1 = Math.random() || Number.EPSILON;
      const u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const sample = mu + sigma * z;
      lastSample = sample;
      if (sample > 0) return sample;
    }
    // fallback: devolver absoluto del último sample (garantiza positivo) o epsilon
    const fallback = Math.abs(lastSample) || Math.max(Math.abs(mu), Number.EPSILON);
    return fallback;
  }

  if (isUniform) {
    const a = Number((params && (params.a ?? params.min)) ?? 0);
    const b = Number((params && (params.b ?? params.max)) ?? 1);
    return a + (b - a) * Math.random();
  }

  if (isFixed) {
    console.log("entre a un transformador fijo")
    const v = (params && (params.valor ?? params.value)) ?? 0;
    return Number(v) || 0;
  }

  // en caso de que el tipo no haya sido reconocido, devolver 0
  return 0;
}


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







//EN CASO DE QUE FUNCIONE ON DEMAND

  /** 🔹 Downstream pide elementos producidos */
  request(time, cantidad = 1, salidaId = "out-0") {

    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Transformer ${this.id} está fallando, no puede atender request()`);
      return [];
    }
    // Por simplicidad, producimos inmediatamente si no estamos ocupados
    if (this.busy) {
      console.log(`[t=${time}] ⚠️ Transformer ${this.id} está ocupado, no puede servir request() aún`);
      return [];
    }

    const outputs = [];
    const recetaOutputs = this.receta.outputs || [];

    for (const outDef of recetaOutputs) {
      const cantidadDef = outDef.cantidad || 1;
      const elementoTipo = outDef.elemento;

      for (let i = 0; i < Math.min(cantidad, cantidadDef); i++) {
        this.generatedCount++;
        const elemento = {
          id: `${elementoTipo}-${this.generatedCount}`,
          type: elementoTipo,
          createdAt: time,
          attributes: {},
          meta: { producedBy: this.id }
        };
        outputs.push(elemento);
      }
    }

    console.log(`[t=${time}] 🔄 Transformer ${this.id} entregó ${outputs.length} elementos por request()`);
    return outputs;
  }

  /** 🔔 Avisar a downstream que hay outputs disponibles */
  notifyDownstream(time, salidaId = "out-0") { //arreglar en caso de error
    const edgesOut = this.simulator.processDef.edges.filter(
      e => e.from === this.node.id && (e.sourceHandle || "out-0") === salidaId
    );

    for (let edge of edgesOut) {
      const target = this.simulator.components[edge.to];
      if (target?.notifyAvailable) {
        target.notifyAvailable(time, edge.targetHandle || "in-0");
      }
    }
  }

  isActive() {
    // Activo si no está fallado y además está procesando un job
    return !this.failed && this.busy;
  }




}

module.exports = Transformer;
