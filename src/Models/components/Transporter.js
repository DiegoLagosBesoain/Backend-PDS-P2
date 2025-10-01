const Component = require("../Component.js");
const sampleFromDistribution = require("../utils/distributions");

class Transporter extends Component {
  constructor(node, simulator) {
    super(node, simulator);
    this.tipo = node.params?.tipo || "continuo"; // "continuo" o "movil"
    this.elemento = node.params?.elemento || null;

    this.distribucion = node.params?.distribucion || { tipo: "Fija", params: { valor: 1 } };
    this.t_min_entrada = node.params?.t_min_entrada || 0; // solo continuo

    this.capacidad = node.params?.capacidad || 1; // solo movil
    this.t_espera_max = node.params?.t_espera_max || Infinity; // solo movil

    // Estado interno
    this.buffer = [];
    this.lastInputTime = -Infinity;
    this.departureAction = null;
    this.is_notified=false
    this.busy=false
  }

  init() {
    super.init(); // activa fallas si están configuradas
    console.log(`[t=${this.simulator.clock}] Transporter ${this.id} inicializado (${this.tipo})`);
  }

  /** 🔔 Llamado por upstream cuando hay elementos disponibles */
  notifyAvailable(time, entradaId = "in-0") {
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Transporter ${this.id} está en falla, ignora disponibilidad`);
      return;
    }if (this.busy) {
      console.log(`[t=${time}] ⚠️ Transporter ${this.id} está transportando`);
      return;
    }
    
    this.requestFromInputs(time, entradaId);
    
  }

  /** 🔹 Pide elementos a sus entradas */
  requestFromInputs(time, entradaId = null) {
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Transporter ${this.id} está en falla, no puede pedir elementos`);
      return;
    }

    const edgesIn = this.simulator.processDef.edges.filter(e => e.to === this.id);
    for (const edge of edgesIn) {

      if (entradaId && edge.targetHandle !== entradaId) continue; // si se especificó una entrada
      console.log("pidiendo a la entrada",entradaId)

      const comp = this.simulator.components[edge.from];
      let elems=[]
      if (!comp?.request) continue;
      
      if (this.tipo=="movil"){
        if (this.capacidad>=this.buffer.length&&comp.count()>0) {
        elems = elems.concat(comp.request(time, Math.min(comp.count(),this.capacidad), edge.sourceHandle))
        }
      }else{
        if (time - this.lastInputTime >= this.t_min_entrada&&comp.count()>0) {
          elems=comp.request(time, 1)
        }
      }
      for (const el of elems){ 
        this.simulator.register[el.id][`${this.id}-${this.type}`]=time
        this.handleInput(el, time)};
    }
  }

  /** 🔹 Procesa un elemento obtenido de upstream */
  handleInput(elemento, time, entradaId = "in-0") {
    if (!elemento) return;

    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Transporter ${this.id} en falla, no puede recoger ${elemento.id}`);
      return;
    }
    // 👇 Notificar sensores de entrada
    this.notifySensors("entrada", { time, elemento, port: entradaId }); // ✅ port para el Contador

    if (this.tipo === "continuo") {
      if (time - this.lastInputTime < this.t_min_entrada) {
        if (!this.simulator.steps[time]){
              this.simulator.steps[time]=[]
        }
        this.simulator.steps[time].push(`❌ Transporter ${this.id} rechazó ${elemento.id}, demasiado pronto`)
        console.log(`[t=${time}] ❌ Transporter ${this.id} rechazó ${elemento.id}, demasiado pronto`);
        return;
      }

      this.lastInputTime = time;
      const travelTime = sampleFromDistribution(this.distribucion);
      const arrivalTime = time + travelTime;
      this.simulator.schedule(time+this.t_min_entrada, () => this.requestFromInputs(time+this.t_min_entrada,"in"));
      this.simulator.schedule(arrivalTime, () => this.deliver([elemento], arrivalTime));
      if (!this.simulator.steps[time]){
              this.simulator.steps[time]=[]
        }
      this.simulator.steps[time].push(`🚚 Transporter ${this.id} recogió ${elemento.id}, llegará en t=${arrivalTime}`)
      console.log(`[t=${time}] 🚚 Transporter ${this.id} recogió ${elemento.id}, llegará en t=${arrivalTime}`);
      
    }

    else if (this.tipo === "movil") {
      this.buffer.push(elemento);
      console.log(`[t=${time}] 🚛 Transporter ${this.id} cargó ${elemento.id} (${this.buffer.length}/${this.capacidad})`);
      if (!this.simulator.steps[time]){
              this.simulator.steps[time]=[]
        }
      this.simulator.steps[time].push(`🚛 Transporter ${this.id} cargó ${elemento.id} (${this.buffer.length}/${this.capacidad})`)
      if (this.buffer.length >= this.capacidad) {
        this.depart(time);
        
      } else if (this.buffer.length === 1 && this.t_espera_max < Infinity) {
        this.simulator.schedule(time + this.t_espera_max, () => {
          if (this.buffer.length > 0) this.depart(time + this.t_espera_max);
          this.departureAction = null;
        });
      }
      
    }
  }

  /** Maneja la salida del vehículo (solo móviles) */
  depart(time) {
    
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Transporter ${this.id} en falla, no puede partir`);
      return;
    }

    if (this.buffer.length === 0) return;
    this.busy = true;
    const elementos = this.buffer.splice(0);
    const travelTime = sampleFromDistribution(this.distribucion);
    const arrivalTime = time + travelTime;
    
    this.simulator.schedule(arrivalTime, () => this.deliver(elementos, arrivalTime))
    this.simulator.schedule(arrivalTime, () => {this.busy=false});
    console.log(`[t=${time}] 🚛 Transporter ${this.id} partió con ${elementos.length} elementos, llegarán en t=${arrivalTime}`);
    if (!this.simulator.steps[time]){
              this.simulator.steps[time]=[]
        }
    this.simulator.steps[time].push(`🚛 Transporter ${this.id} partió con ${elementos.length} elementos, llegarán en t=${arrivalTime}`)
  }

  /** Entrega elementos a los componentes conectados */
  deliver(elementos, time) {
    if (this.failed) {
      console.log(`[t=${time}] ⚠️ Transporter ${this.id} en falla, no pudo entregar`);
      return;
    }

    const edgesOut = this.simulator.processDef.edges.filter(e => e.from === this.id);
    
    for (let el of elementos) {
      for (let edge of edgesOut) {
        const comp = this.simulator.components[edge.to];
        comp?.receive?.(el, time, edge.targetHandle);
        // 👇 Notificar sensores de salida
        this.notifySensors("salida", { time, elemento: el, port: edge.sourceHandle }); // ✅ port para el Contador
      }
    if (!this.simulator.steps[time]){
              this.simulator.steps[time]=[]
        }
    this.simulator.steps[time].push(`✅ Transporter ${this.node.id} entregó ${el.id}`)
    console.log(`[t=${time}] ✅ Transporter ${this.node.id} entregó ${el.id}`);
    

    }
    
    this.requestFromInputs(time, "in")
    
  }

  isActive() {
    // Activo si:
    // - No está en falla
    // - Está ocupado transportando (busy = true)
    // - O tiene elementos en el buffer
    if (this.failed) return false;
    return this.busy || this.buffer.length > 0;
  }
}

module.exports = Transporter;


  // /** Recibe un elemento en la entrada */
  // receive(elemento, time, entradaId = "in-0") {
  //   if (!elemento) return;

  //   if (this.tipo === "continuo") {
  //     if (time - this.lastInputTime < this.t_min_entrada) {
  //       console.log(`[t=${time}] ❌ Transporter ${this.node.id} rechazó ${elemento.id}, demasiado pronto`);
  //       return;
  //     }

  //     this.lastInputTime = time;
  //     const travelTime = sampleFromDistribution(this.distribucion);
  //     const arrivalTime = time + travelTime;

  //     this.simulator.schedule(
  //       arrivalTime,
  //       () => this.deliver([elemento], arrivalTime)
  //     );

  //     console.log(`[t=${time}] 🚚 Transporter ${this.node.id} recibió ${elemento.id}, llegará en t=${arrivalTime}`);
  //   }

  //   else if (this.tipo === "movil") {
  //     this.buffer.push(elemento);
  //     console.log(`[t=${time}] 🚛 Transporter ${this.node.id} cargó ${elemento.id} (${this.buffer.length}/${this.capacidad})`);

  //     if (this.buffer.length >= this.capacidad) {
  //       this.depart(time);
  //     } else if (this.buffer.length === 1 && this.t_espera_max < Infinity) {
  //       // programar salida forzada si no se llena
  //       this.simulator.schedule(
  //         time + this.t_espera_max,
  //         () => {
  //           if (this.buffer.length > 0) {
  //             this.depart(time + this.t_espera_max);
  //           }
  //           this.departureAction = null;
  //         }
  //       );
  //     }
  //   }
  // }

  // /** Maneja la salida del vehículo (solo móviles) */
  // depart(time) {
  //   if (this.buffer.length === 0) return;

  //   const elementos = this.buffer.splice(0);
  //   const travelTime = sampleFromDistribution(this.distribucion);
  //   const arrivalTime = time + travelTime;

  //   this.simulator.schedule(
  //     arrivalTime,
  //     () => this.deliver(elementos, arrivalTime)
  //   );

  //   console.log(`[t=${time}] 🚛 Transporter ${this.node.id} partió con ${elementos.length} elementos, llegarán en t=${arrivalTime}`);
  // }

  // /** Entrega elementos a los componentes conectados */
  // deliver(elementos, time) {
  //   const edgesOut = this.simulator.processDef.edges.filter(e => e.from === this.node.id);
  //   for (let el of elementos) {
  //     for (let edge of edgesOut) {
  //       const comp = this.simulator.components[edge.to];
  //       comp?.receive?.(el, time, edge.targetHandle);
  //     }
  //     console.log(`[t=${time}] ✅ Transporter ${this.node.id} entregó ${el.id}`);
  //   }
  // }
