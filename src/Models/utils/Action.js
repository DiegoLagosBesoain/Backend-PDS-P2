class Action {
  constructor(time, callback) {
    this.time = time;       // instante en el que debe ejecutarse
    this.callback = callback; // lo que se debe ejecutar
  }

  execute() {
    if (typeof this.callback === "function") {
      this.callback();
    }
  }
}

module.exports = Action;
