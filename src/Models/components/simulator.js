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
        this.steps={}
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
        console.log(this.steps)
        //return this.stats;


        return {
        clock: this.clock,
        register: this.register,
        components: this.components,
        };

    }

    shouldStop() {
        // 1. Condición de tiempo (siempre aplica)
        if (this.clock >= (this.ending_condition.valor || Infinity)) {
            return true;
        }

        // 2. Condición de elementos generados
        if (this.ending_condition.limits?.maxGenerated != null) {
            const generated = this.components
                ? Object.values(this.components).reduce(
                    (acc, c) => acc + (c.generatedCount || 0),
                    0
                )
                : 0;
            if (generated >= this.ending_condition.limits.maxGenerated) {
                return true;
            }
        }

        // 3. Condición de elementos en outputs
        if (this.ending_condition.limits?.maxOutputs != null) {
            const outputs = this.components
                ? Object.values(this.components)
                    .filter(c => c.node?.type === "output")
                    .reduce(
                        (acc, c) => acc + (c.elements?.length || 0),
                        0
                    )
                : 0;
            if (outputs >= this.ending_condition.limits.maxOutputs) {
                return true;
            }
        }

        return false;
    }

}

module.exports = Simulator;