class Element {
  constructor({ id,type, params}) {
    this.id = id;
    //this.process_id = process_id;
    this.type=type;
    
    this.params=params;
  }
}

module.exports = Element;