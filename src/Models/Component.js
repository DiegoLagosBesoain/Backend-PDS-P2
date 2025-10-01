const sampleFromDistribution = require("./utils/distributions");

class Component {

  constructor(node, simulator) {
    this.id = node.id;
    this.process_id = node.process_id;
    this.type = node.type;
    this.label = node.label;
    this.pos_x = node.pos_x;
    this.pos_y = node.pos_y;
    this.params = node.params || {};

    this.simulator = simulator;
    this.failed = false;
    this.sensors = [];

    this.node = node; // 👈 vuelve a estar disponible en todos los hijos

    // --- MOVER instanciación de sensores al constructor ---
    // Buscar configuración de sensores en varias ubicaciones para compatibilidad
    const sensorsCfg =
      (this.params && this.params.params && Array.isArray(this.params.params.sensors) && this.params.params.sensors) ||
      (Array.isArray(this.params.sensors) && this.params.sensors) ||
      (this.node && Array.isArray(this.node.params?.sensors) && this.node.params.sensors) ||
      [];

    if (sensorsCfg.length) {
      const sensorMapping = {
        contador: require("./Contador.js"),
        porcentaje_tiempo_encendido: require("./UptimePercentageSensor"),
        porcentaje_tiempo_funcionamiento: require("./OperatingPercentageSensor"),
        maximo: require("./MaxQueueSensor.js"),
        minimo: require("./MinQueueSensor.js"),
        medidor_flujo: require("./FlowSensor.js"),
        // más sensores se agregan aquí
      };

      sensorsCfg.forEach((cfg) => {
        try {
          const typeKey = (cfg.type || "").toString().toLowerCase();
          const SensorClass = sensorMapping[typeKey];
          if (SensorClass) {
            this.sensors.push(new SensorClass(cfg, this, this.simulator));
          } else {
            console.warn(`⚠️ Tipo de sensor desconocido para componente ${this.id}: ${cfg.type}`);
          }
        } catch (err) {
          console.error("Error instanciando sensor:", err, cfg);
        }
      });
    }
    // --- fin instanciación sensores ---
  }

  init() {

    // Antes aquí se instanciaban sensores — ya no (ahora se hace en constructor)

    // Inicializar fallas si existen
    console.log("inicializada falla");

    if (this.params?.params?.failures?.length) {
      this.params.params.failures.forEach(f => this.scheduleFailure(f));
    }
  }

  notifySensors(eventType, data) {
    if (this.sensors) {
      this.sensors.forEach(s => {
        try { s.notify(eventType, data); } catch (err) { console.error("Sensor notify error", err); }
      });
    }
  }

  scheduleFailure(failure) {
    const t_activacion = sampleFromDistribution(failure.dist_activacion);
    this.simulator.schedule(this.simulator.clock + t_activacion, () => this.startFailure(failure));
  }

  startFailure(failure) {
    this.failed = true;
    const t_duracion = sampleFromDistribution(failure.dist_duracion);

    console.log("t_duracion: ", typeof t_duracion);
    console.log(`[t=${this.simulator.clock}] ❌ ${this.type} ${this.id} FALLARA durante ${t_duracion.toFixed(2)}`);
    if (!this.simulator.steps[`${this.simulator.clock}`]) {
      this.simulator.steps[`${this.simulator.clock}`] = [];
    }
    this.simulator.steps[`${this.simulator.clock}`].push(`❌ ${this.type} ${this.id} FALLARA durante ${t_duracion.toFixed(2)}`);

    this.simulator.schedule(this.simulator.clock + t_duracion, () => this.endFailure(failure));
  }

  endFailure(failure) {
    this.failed = false;

    console.log(`[t=${this.simulator.clock}] ✅ ${this.type} ${this.id} RECUPERADO`);
    if (!this.simulator.steps[`${this.simulator.clock}`]) {
      this.simulator.steps[`${this.simulator.clock}`] = [];
    }
    this.simulator.steps[`${this.simulator.clock}`].push(`✅ ${this.type} ${this.id} RECUPERADO`);

    this.scheduleFailure(failure);
  }

  isAvailable() {
    return !this.failed;
  }
}

module.exports = Component;
