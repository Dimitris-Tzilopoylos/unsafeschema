class SchemaError extends Error {
  constructor(message) {
    super(message);
  }
}

module.exports = { SchemaError };
