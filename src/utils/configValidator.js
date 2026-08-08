function validateConfig(config) {
  if (!config.port) {
    throw new Error('Config validation error: "port" field is required.');
  }
  if (!config.services || typeof config.services !== 'object') {
    throw new Error('Config validation error: "services" must be a valid object.');
  }
  Object.entries(config.services).forEach(([name, svc]) => {
    if (!svc.prefix) {
      throw new Error(`Config validation error: Service "${name}" is missing "prefix" field.`);
    }
    if (!svc.target) {
      throw new Error(`Config validation error: Service "${name}" is missing "target" host URL.`);
    }
  });
}
module.exports = { validateConfig };
