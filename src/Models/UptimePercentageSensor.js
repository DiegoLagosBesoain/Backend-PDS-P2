const Sensor = require("./sensors/Sensor");

class UptimePercentageSensor extends Sensor {
  constructor(config, component, simulator) {
    super(config, component, simulator);
    this.totalActiveTime = 0; // tiempo acumulado sin fallas
    this.lastClock = this.simulator.clock; // último instante medido
  }

  tick() {
    const now = this.simulator.clock;
    const delta = now - this.lastClock;

    if (!this.component.failed) {
      // si el componente no está en falla, acumula tiempo activo
      this.totalActiveTime += delta;
    }

    this.lastClock = now;

    // calcular porcentaje sobre tiempo transcurrido
    const totalTime = now > 0 ? now : 1; // evitar división por cero
    const percentage = (this.totalActiveTime / totalTime) * 100;

    this.values.push({
      time: now,
      value: percentage
    });

    console.log(
      `[t=${now}] 📊 Sensor porcentaje_tiempo_encendido en ${this.component.id}: ${percentage.toFixed(2)}%`
    );
    if (!this.simulator.steps[now]){
              this.simulator.steps[now]=[]
        }
    this.simulator.steps[now].push(`📊 Sensor porcentaje_tiempo_encendido en ${this.component.id}: ${percentage.toFixed(2)}%`)
  }
}

module.exports = UptimePercentageSensor;
