const config = require('./config');

const DB_CONFIG = {
  adapter: config.db.adapter,
  json: { dataDir: './db/data' }
};

let adapterInstance = null;

function getAdapter() {
  if (adapterInstance) return adapterInstance;

  const adapterName = DB_CONFIG.adapter;

  switch (adapterName) {
    case 'json':
      const JsonAdapter = require('./db/json-adapter');
      adapterInstance = new JsonAdapter(DB_CONFIG.json);
      return adapterInstance;
    case 'postgresql':
      const PgAdapter = require('./db/pg-adapter');
      adapterInstance = new PgAdapter();
      return adapterInstance;
    case 'mongodb':
      throw new Error('MongoDB adapter not yet implemented.');
    default:
      throw new Error(`Unknown database adapter: ${adapterName}`);
  }
}

module.exports = { DB_CONFIG, getAdapter };
