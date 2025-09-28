const Element = require("../Element.js");

class Simulator{
    constructor(processDef, ending_condition){
        this.processDef = processDef; //todos los nodos y edges con sus parametros
        this.ending_condition = ending_condition; //me dalta agregar al boton de Comenzar Simulacion para que reciba el ending condition y el parametro, deberia pasarse asi {type: condicion de termino, params: parametro}
        this.clock = 0;
        this.components = [];
        this.eventQueue = []; //lista de acciones [{tiempo, accion, ...]
        this.elements = [];
        this.register={}//registro del movimiento de cada elemento
        //this.stats = {}//metricas globales
        
    }

    init(){//instancia todos los nodos
        this.processDef.nodes.forEach((node)=>{
            const ComponentClass = this.resolveComponentClass(node.type);
            this.components[node.id] = new ComponentClass(node, this); //crea el componente correspondiente al tipo (aun debo crear las clases de cada componente)
        })


        if (this.processDef.elements) {//instancia todos los elementos
            this.processDef.elements.forEach((el) => {
                //console.log("el: ", el)
                this.elements[el.id] = new Element(el);
            });
        }

        Object.values(this.components).forEach(c=>c.init?.());
    }

    resolveComponentClass(type){
        const mapping = {
            generator: require("./Generator.js"),
            output: require("./Output.js"),
            queue: require("./Queue.js"),
            selector: require("./Selector.js"),
            transformer: require("./Transformer.js"),
            transporter: require("./Transporter.js")
        };
        return mapping[type.toLowerCase()];
    }
    
    schedule(time, action){
        this.eventQueue.push({time, action});
        this.eventQueue.sort((a, b) => a.time - b.time)
    }

    run(){
        this.init();
        while (!this.shouldStop() && this.eventQueue.length > 0){
            const event = this.eventQueue.shift();
            this.clock = event.time;
            event.action();
        }
        console.log(this.register)
        //return this.stats;
    }

    shouldStop(){
        switch (this.ending_condition["type"]){
            case "tiempo":
                return this.clock >= this.ending_condition.valor;
            //AGREGAR MAS TIPOS DE CONDICION DESPUES DE DEFINIRLOS EN EL BOTON DE COMENZAR SIMULACION, LA IDEA ES QUE AL PRESIONAR EL BOTON SE MUESTREN LAS OPCIONES PARA LA SIMULACION.
        }
    }
}

module.exports = Simulator;