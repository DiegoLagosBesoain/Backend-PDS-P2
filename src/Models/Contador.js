const Sensor = require("./sensors/Sensor.js");

class Contador extends Sensor {
  constructor(config, component, simulator) {
    super(config, component, simulator);
    this.count = 0;
  }

  notify(eventType, data) {
    console.log(`[t=${this.simulator.clock}] 🟢 Contador (${this.component.id}) recibió notify:`, eventType, data);

    // Si está configurado para contar entradas
    console.log("this.idEntradas: ",this.idEntradas)
    console.log("this.idSalidas: ",this.idSalidas)
    console.log("data.port: ", data)
    if (eventType === "entrada" && this.idEntradas.includes(data.port)) {
      this.count++;
      console.log(`[t=${this.simulator.clock}] ➕ Contador (${this.component.id}) midió ENTRADA en ${data.port} → total = ${this.count}`);
    }

    // Si está configurado para contar salidas
    if (eventType === "salida" && this.idSalidas.includes(data.port)) {
      this.count++;
      console.log(`[t=${this.simulator.clock}] ➕ Contador (${this.component.id}) midió SALIDA en ${data.port} → total = ${this.count}`);
    }
  }

  tick() {
    this.values.push({ t: this.simulator.clock, value: this.count });
    console.log(`[t=${this.simulator.clock}] ⏱️ Tick de contador (${this.component.id}) → valor registrado = ${this.count}`);
  }

  report() {
    return {
      type: "contador",
      total: this.count,
      series: this.values
    };
  }
}

module.exports = Contador;
