const Sensor = require("./sensors/Sensor");

class MaxQueueSensor extends Sensor {
  constructor(config, component, simulator) {
    super(config, component, simulator);
    this.max = -Infinity;
  }

  tick() {
    const now = this.simulator.clock;
    const currentCount = typeof this.component.count === "function"
      ? this.component.count()
      : 0;

    if (currentCount > this.max) {
      this.max = currentCount;
    }

    this.values.push({ t: now, value: currentCount });
    if (!this.simulator.steps[now]){
              this.simulator.steps[now]=[]
        }
    this.simulator.steps[now].push(`📈 MaxQueueSensor (${this.component.id}) -> count=${currentCount}, max=${this.max}`)
    console.log(
      `[t=${now}] 📈 MaxQueueSensor (${this.component.id}) -> count=${currentCount}, max=${this.max}`
    );
  }

  report() {
    return {
      type: "max_queue",
      componente: this.component.id,
      max: this.max === -Infinity ? 0 : this.max,
      series: this.values,
    };  
  }
}

module.exports = MaxQueueSensor;
