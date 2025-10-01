const Sensor = require("./sensors/Sensor");

class FlowSensor extends Sensor {
  constructor(config, component, simulator) {
    super(config, component, simulator);

    this.count = 0; // acumulador de eventos en el intervalo
  }

  notify(eventType, data) {
    // ✅ Consideramos entradas
    if (eventType === "entrada" && this.idEntradas.includes(data.port)) {
      this.count++;
    }

    // ✅ Consideramos salidas
    if (eventType === "salida" && this.idSalidas.includes(data.port)) {
      this.count++;
    }
  }

  tick() {
    const now = this.simulator.clock;

    // flujo = cantidad de eventos / intervalo
    const flow = this.count / this.intervalo;

    this.values.push({ t: now, value: flow });

    console.log(
      `[t=${now}] 💧 FlowSensor (${this.component.id}) -> flow=${flow.toFixed(
        2
      )} elementos/unidad tiempo`
    );
    if (!this.simulator.steps[now]){
              this.simulator.steps[now]=[]
        }
    this.simulator.steps[now].push(`FlowSensor (${this.component.id}) -> flow=${flow.toFixed(
        2
      )} elementos/unidad tiempo`)
    // Reiniciar el acumulador para el próximo intervalo
    this.count = 0;
  }

  report() {
    return {
      type: "medidor_flujo",
      componente: this.component.id,
      series: this.values,
    };
  }
}

module.exports = FlowSensor;
