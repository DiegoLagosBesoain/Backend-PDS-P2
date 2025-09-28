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

  }



  init() {

    // Inicializar sensores
    if (this.params?.params?.sensors?.length) {
      console.log("this.params?.params?.sensors?.length: ", this.params?.params?.sensors?.length)
      console.log("this.params: ", this.id)
      const sensorMapping = {
        contador: require("./Contador.js"),
        // más sensores se agregan aquí
      };

      
      console.log("this.params?.params?.sensors: ", this.params?.params?.sensors)
      this.params.params.sensors.forEach(cfg => {
        console.log("cfg.type.toLowerCase()",cfg.type.toLowerCase())
        //console.log("SensorMapping: ", sensorMapping)
        const SensorClass = sensorMapping[cfg.type.toLowerCase()];
        console.log("SensorClass: ", SensorClass)
        if (SensorClass) {

          this.sensors.push(new SensorClass(cfg, this, this.simulator));
        } else {
          console.warn(`⚠️ Tipo de sensor desconocido: ${cfg.type}`);
        }
      });
    }


    console.log("inicializada falla")

    if (this.params?.params?.failures?.length) {
      console.log("this.params: ",this.params)
      console.log("this.params.params.failures: ",this.params.params.failures)
      this.params.params.failures.forEach(f => this.scheduleFailure(f));
      
    }
  }

  notifySensors(eventType, data) {
    console.log("entro a notify sensors")

    //console.log("this.sensors: ", this.sensors)
    console.log("this.sensors type: ",typeof this.sensors)
    if (this.sensors) {
      this.sensors.forEach(s => {
        console.log(" s: ", s)

        console.log("s.notify?: ", "notify" in s)
        s.notify(eventType, data)});
    }
  }



  scheduleFailure(failure) {
    const t_activacion = sampleFromDistribution(failure.dist_activacion);
    this.simulator.schedule(this.simulator.clock + t_activacion, () => this.startFailure(failure));
  }

  startFailure(failure) {
    this.failed = true;
    const t_duracion = sampleFromDistribution(failure.dist_duracion);

    console.log("t_duracion: ",typeof t_duracion)
    console.log(`[t=${this.simulator.clock}] ❌ ${this.type} ${this.id} FALLÓ durante ${t_duracion.toFixed(2)}`);


    this.simulator.schedule(this.simulator.clock + t_duracion, () => this.endFailure(failure));
  }

  endFailure(failure) {
    this.failed = false;

    console.log(`[t=${this.simulator.clock}] ✅ ${this.type} ${this.id} RECUPERADO`);

    this.scheduleFailure(failure);
  }

  isAvailable() {
    return !this.failed;
  }
}

module.exports = Component;