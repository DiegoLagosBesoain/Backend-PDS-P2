class Sensor {
  constructor(config, component, simulator) {
    this.type = config.type;
    this.intervalo = config.intervalo|| config.interval ||config.samplingInterval ||1;
    this.idEntradas = config.id_entradas || [];
    this.idSalidas = config.id_salidas || [];
    this.component = component;
    this.simulator = simulator;
    this.values = [];

    // schedule primer tick
    this.scheduleNext();
  }

  scheduleNext() {
    
    this.simulator.schedule(this.simulator.clock + this.intervalo, () => {
      console.log("existe el metodo tick?:", typeof this.tick === "function");
      this.tick();
      this.scheduleNext();
    });
  }

  tick() {
    // implementado en subclases
  }

  notify(eventType, data) {
    // hook opcional en subclases
  }

  report() {
    return { type: this.type, values: this.values };
  }
}

module.exports = Sensor;
