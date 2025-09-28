class Connection {
  constructor({ id, process_id, from_component_id, to_component_id, sourceHandle, targetHandle, markerEnd }) {
    this.id = id;
    this.process_id = process_id;
    this.from_component_id = from_component_id;
    this.to_component_id = to_component_id;
    this.sourceHandle = sourceHandle || null; // id del handle de origen
    this.targetHandle = targetHandle || null; // id del handle de destino
    this.markerEnd = markerEnd || { type: "arrow", width: 12, height: 12, color: "#000" };
  }
}

module.exports = Connection;