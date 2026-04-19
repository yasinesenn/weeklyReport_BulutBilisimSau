const { Pool } = require('pg');
const config = require('../config');

class PgAdapter {
    constructor() {
        this.pool = new Pool({
            host: config.db.host,
            port: config.db.port,
            database: config.db.database,
            user: config.db.user,
            password: config.db.password,
            // Opsiyonel: SSL gereksinimleri OpenShift üzerinde varsa eklenebilir
            // ssl: { rejectUnauthorized: false }
        });
        
        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle PostgreSQL client', err);
            // OpenShift ortamında pod'un restart edilmesi için process.exit(1) kullanılabilir
            // process.exit(-1);
        });
    }

    /**
     * Helper to map camelCase js keys to snake_case db keys if needed.
     * Since DB columns are snake_case (e.g. team_id, user_id) 
     * but js objects might use camelCase like teamId, userId. 
     * We will use a simple mapping or expect exact names.
     */
    _toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    _toCamelCase(str) {
        return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    }

    /**
     * Map DB row to JS Object
     */
    _mapRow(row) {
        if (!row) return null;
        const obj = {};
        for (const [key, value] of Object.entries(row)) {
            obj[this._toCamelCase(key)] = value;
        }
        return obj;
    }

    // ---- Generic CRUD (Matching json-adapter.js interface) ----

    async findAll(collection, filter = {}) {
        const keys = Object.keys(filter);
        if (keys.length === 0) {
            const res = await this.pool.query(`SELECT * FROM ${collection}`);
            return res.rows.map(row => this._mapRow(row));
        }

        const conditions = keys.map((key, i) => `${this._toSnakeCase(key)} = $${i + 1}`).join(' AND ');
        const values = Object.values(filter);
        
        const q = `SELECT * FROM ${collection} WHERE ${conditions}`;
        const res = await this.pool.query(q, values);
        return res.rows.map(row => this._mapRow(row));
    }

    async findById(collection, id) {
        const res = await this.pool.query(`SELECT * FROM ${collection} WHERE id = $1`, [id]);
        return res.rows.length ? this._mapRow(res.rows[0]) : null;
    }

    async create(collection, doc) {
        // Convert camelCase document keys to DB keys
        const dbDoc = {};
        for (const [k, v] of Object.entries(doc)) {
            dbDoc[this._toSnakeCase(k)] = v;
        }

        const keys = Object.keys(dbDoc);
        const columns = keys.join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(dbDoc).map(v =>
            (v !== null && typeof v === 'object') ? JSON.stringify(v) : v
        );

        const q = `INSERT INTO ${collection} (${columns}) VALUES (${placeholders}) RETURNING *`;
        const res = await this.pool.query(q, values);
        return this._mapRow(res.rows[0]);
    }

    async update(collection, id, updates) {
        // Convert camelCase document keys to DB keys
        const dbUpdates = {};
        for (const [k, v] of Object.entries(updates)) {
            dbUpdates[this._toSnakeCase(k)] = v;
        }

        const keys = Object.keys(dbUpdates);
        if (keys.length === 0) return this.findById(collection, id);

        const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = [id, ...Object.values(dbUpdates).map(v =>
            (v !== null && typeof v === 'object') ? JSON.stringify(v) : v
        )];

        const q = `UPDATE ${collection} SET ${setClause} WHERE id = $1 RETURNING *`;
        const res = await this.pool.query(q, values);
        if (res.rows.length === 0) return null;
        return this._mapRow(res.rows[0]);
    }

    async delete(collection, id) {
        const res = await this.pool.query(`DELETE FROM ${collection} WHERE id = $1 RETURNING id`, [id]);
        return res.rows.length > 0;
    }

    // Direct query execution for complex needs (like custom JOINs)
    async query(text, params) {
        return this.pool.query(text, params);
    }
}

module.exports = PgAdapter;
