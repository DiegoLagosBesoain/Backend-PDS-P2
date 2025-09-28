class Sensor {
  constructor(config, component, simulator) {
    this.type = config.type;
    this.intervalo = config.intervalo ?? 1;
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
