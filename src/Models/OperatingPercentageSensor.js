const Sensor = require("./sensors/Sensor");

class OperatingPercentageSensor extends Sensor {
  constructor(config, component, simulator) {
    super(config, component, simulator);
    this.activeTime = 0;
    this.lastCheck = simulator.clock;
  }


  tick() {
    console.log("esta entrando al tick de operatingpercentage")
    const now = this.simulator.clock;
    const delta = now - this.lastCheck;

    let isActive = false;

    if (typeof this.component.isActive === "function") {
    // 👈 usamos el método directo del componente
        isActive = this.component.isActive();
    } else if (typeof this.component.count === "function") {
        isActive = this.component.count() > 0;
    } else if (Array.isArray(this.component.elements)) {
        isActive = this.component.elements.length > 0;
    } else {
        isActive = !this.component.failed;
    }

    if (isActive) {
        this.activeTime += delta;
    }

    const percentage = (this.activeTime / (now || 1)) * 100;
    this.values.push({ t: now, value: percentage });

    this.lastCheck = now;
    console.log(`[t=${now}] ⚙️ OperatingPercentageSensor (${this.component.id}) = ${percentage.toFixed(2)}%`);
    if (!this.simulator.steps[now]){
              this.simulator.steps[now]=[]
        }
    this.simulator.steps[now].push(`⚙️ OperatingPercentageSensor (${this.component.id}) = ${percentage.toFixed(2)}%`)
  }


  

  report() {
    const totalTime = this.simulator.clock;
    const percentage = totalTime > 0 ? (this.activeTime / totalTime) * 100 : 0;

    return {
      type: "porcentaje_tiempo_funcionamiento",
      total: percentage,
      series: this.values
    };
  }
}

module.exports = OperatingPercentageSensor;
