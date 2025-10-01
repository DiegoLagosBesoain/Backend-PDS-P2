const Sensor = require("./sensors/Sensor");

class MinQueueSensor extends Sensor {
  constructor(config, component, simulator) {
    super(config, component, simulator);
    this.min = Infinity;
  }

  tick() {
    const now = this.simulator.clock;
    const currentCount = typeof this.component.count === "function"
      ? this.component.count()
      : 0;
    if (currentCount < this.min) {
      this.min = currentCount;
    }

    console.log(
      `[t=${now}] 📉 MinQueueSensor (${this.component.id}) -> count=${currentCount}, min=${this.min}`
    );

    if (!this.simulator.steps[now]){
              this.simulator.steps[now]=[]
        }
    this.simulator.steps[now].push(`📉 MinQueueSensor (${this.component.id}) -> count=${currentCount}, min=${this.min}`)

    this.values.push({ t: now, value: this.min });

  }
  report() {
    return {
      type: "min_queue",
      componente: this.component.id,
      min: this.min === Infinity ? 0 : this.min,
      series: this.values,
    };
    
  }
}

module.exports = MinQueueSensor;
