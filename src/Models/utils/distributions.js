function sampleFromDistribution(distribucion) {
  const tipo = (distribucion.tipo || distribucion.type || "").toString().toLowerCase();
  const params = distribucion.params || {};

  // helper para convertir siempre a número válido
  function num(x, def = 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : def;
  }

  switch (tipo) {
    case "fija":
    case "fijo":
    case "fixed":
      return Math.max(num(params.valor, num(params.value, 0.1)),0.000000000001);

    case "uniforme":
    case "uniform":
      const min = num(params.min, 0);
      const max = num(params.max, 1);
      return Math.max(Math.abs(min + Math.random() * (max - min)),0.000000000001);

    case "exponencial":
      // λ = 1/media
      const lambda = Math.max(num(params.lambda, 1),0.00000001);
      
      return Math.max(-Math.log(1 - Math.random()) / lambda,0.000000000001);

    case "normal":
      // Box-Muller
      const mu = num(params.mu, 0);
      const sigma = num(params.sigma, 1);
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return Math.max(Math.abs(mu + sigma * z),0.000000000001);

    default:
      console.warn(`⚠️ Distribución desconocida: ${tipo}, usando 1`);
      return 1;
  }
}

module.exports = sampleFromDistribution;
