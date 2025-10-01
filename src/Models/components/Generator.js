const Component = require("../Component.js");
const sampleFromDistribution = require("../utils/distributions");

class Generator extends Component {
  constructor(node, simulator) {
    super(node, simulator); // inicializa Component (id, type, params, etc.)
    this.simulator = simulator;
    this.generatedCount = 0;
  }

  init() {
    console.log("entre a generador")
    super.init(); // inicializa fallas si hay

    if (!this.params.onDemand) {
      this.scheduleNext(); // programa el primer evento
    }else{
        this.notifyDownstream(this.simulator.clock)
    }
  }
  count(tipo = null) {
    if(this.params.limite){
      return Math.min(Infinity,this.params.limite-this.generatedCount)
    }
    return Infinity
  }
  notifyDownstream(time) {
    const edgesOut = this.simulator.processDef.edges.filter(e => e.from === this.node.id);
    for (let edge of edgesOut) {
      const comp = this.simulator.components[edge.to];
      if (comp?.notifyAvailable) {
        comp.notifyAvailable(time, edge.targetHandle || "in-0");

        //console.log("La fila esta notificando")

      }
    }
  }

  scheduleNext() {
    if (this.params.limite && this.generatedCount >= this.params.limite) {
      return; // alcanzó el límite
    }

    let nextTime;
    if (this.params.onDemand) {
      nextTime = this.simulator.clock + (this.params.intervalo || 1);
    } else {
      const dist = this.params.distribucion;
      if (!dist) return;
      
      nextTime = this.simulator.clock + sampleFromDistribution(dist);
    }

    this.simulator.schedule(nextTime, () => this.generate());
  }



  request(time, cantidad = 1, salidaId = "out-0") {
    // ⚠️ si el generador está en falla, no responde
    if (this.failed) {
      console.log(`[t=${this.simulator.clock}] ⚠️ Generador ${this.id} está en falla, request ignorado.`);
      return [];
    }

    // ✅ Chequear disponibilidad
    const disponibles = this.count();
    if (cantidad > disponibles) {
      console.warn(`[t=${this.simulator.clock}] ⚠️ Generador ${this.id} no tiene suficientes disponibles (pedidos=${cantidad}, disponibles=${disponibles}). No genera nada.`);
      return [];
    }

    const elementType = this.params.elemento;
    const elementDef = this.simulator.processDef.elements.find(el => el.type === elementType);

    if (!elementDef) {
      console.warn(`[t=${this.simulator.clock}] No se encontró definición para ${elementType}`);
      return [];
    }

    const generados = [];

    for (let i = 0; i < cantidad; i++) {
      this.generatedCount++;

      const attributes = {};
      for (let [attr, valores] of Object.entries(this.params.parametros || {})) {
        attributes[attr] = this.pickByDistribution(valores);
      }

      const elemento = {
        id: `${elementType}-${this.generatedCount}-${this.id}`,
        type: elementType,
        createdAt: this.simulator.clock,
        attributes,
      };

      console.log(`[t=${this.simulator.clock}] 🎉 Generador ${this.id} (onDemand) creó ${elemento.type} (#${elemento.id})`);
      
      if (!this.simulator.steps[time]){
        this.simulator.steps[time]=[]
      }
      this.simulator.steps[time].push(`🎉 Generador ${this.id} (onDemand) creó ${elemento.type} (#${elemento.id})`)
      // 🚨 Notificar sensores que hubo una salida
      this.notifySensors("salida", { port: "out-0", elemento });

      this.sendToNext(elemento, salidaId);
      generados.push(elemento);
    }

    // Registrar elementos creados
    generados.forEach(elemento => {
      this.simulator.register[elemento.id] = { params: elemento.attributes };
      this.simulator.register[elemento.id][`${this.id}-${this.type}`] = time;
    });

    return generados;
  }



  generate() { 
    // ⚠️ si está en falla, no genera
    if (this.failed) { 
        console.log(`[t=${this.simulator.clock}] ⚠️ Generador ${this.id} está en falla, no produce.`); 
        this.scheduleNext(); // volver a intentar más adelante 
        return; 
    }

    this.generatedCount++; 
    const elementType = this.params.elemento; 
    const elementDef = this.simulator.processDef.elements.find(el => el.type === elementType); 
    
    if (!elementDef) { 
        console.warn(`[t=${this.simulator.clock}] No se encontró definición para ${elementType}`); 
        return; 
    } 

    const attributes = {}; 
    for (let [attr, valores] of Object.entries(this.params.parametros || {})) { 
        attributes[attr] = this.pickByDistribution(valores); 
    } 

    const elemento = { 
        id: `${elementType}-${this.generatedCount}-${this.id}`, 
        type: elementType, 
        createdAt: this.simulator.clock, 
        attributes, 
    }; 


    
    this.simulator.register[elemento.id]={"params":elemento.attributes}
    this.simulator.register[elemento.id][`${this.id}-${this.type}`]=this.simulator.clock

    console.log(`[t=${this.simulator.clock}] 🎉 Generador ${this.id} creó ${elemento.type} (#${elemento.id})`);
    if (!this.simulator.steps[this.simulator.clock]){
        this.simulator.steps[this.simulator.clock]=[]
      }
    this.simulator.steps[this.simulator.clock].push(`🎉 Generador ${this.id} creó ${elemento.type} (#${elemento.id})`) 

    // 🚨 Notificar sensores que hubo una salida
    console.log("entrando a notify sensors")
    this.notifySensors("salida", { port: "out-0", elemento });


    this.sendToNext(elemento); 
    this.scheduleNext(); 
}


  pickByDistribution(distribution) {
    const r = Math.random();
    let acc = 0;
    for (let [val, prob] of Object.entries(distribution)) {
      acc += prob;
      if (r <= acc) {
        if (val === "true") return true;
        if (val === "false") return false;
        if (!isNaN(val)) return Number(val);
        return val;
      }
    }
    return Object.keys(distribution)[0];
  }

  sendToNext(elemento) {
    const edges = this.simulator.processDef.edges.filter(e => e.from === this.id);
    edges.forEach(edge => {
      const target = this.simulator.components[edge.to];
      if (target?.receive) {
        target.receive(elemento, this.simulator.clock, edge.targetHandle || "in-0");
      }
    });
  }


  isActive() {
    // Activo si:
    // - No está en falla
    // - No alcanzó el límite (si existe)
    // - Está conectado a algo downstream (no es un generador “muerto”)
    console.log("estoy entrando al isActive")
    if (this.failed) return false;
    if (this.params.limite && this.generatedCount >= this.params.limite) return false;

    const edgesOut = this.simulator.processDef.edges.filter(e => e.from === this.node.id);
    return edgesOut.length > 0;
  }


  
}

module.exports = Generator;
