const fs = require('fs');
const path = require('path');

class JsonAdapter {
    constructor(config) {
        this.dataDir = path.resolve(__dirname, '..', config.dataDir || './db/data');
        this._ensureDataDir();
    }

    _ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    _filePath(collection) {
        return path.join(this.dataDir, `${collection}.json`);
    }

    _read(collection) {
        const fp = this._filePath(collection);
        if (!fs.existsSync(fp)) {
            return [];
        }
        const raw = fs.readFileSync(fp, 'utf-8');
        return JSON.parse(raw);
    }

    _write(collection, data) {
        const fp = this._filePath(collection);
        fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    }

    // ---- Generic CRUD ----

    async findAll(collection, filter = {}) {
        let items = this._read(collection);
        for (const [key, value] of Object.entries(filter)) {
            if (value !== undefined && value !== null && value !== '') {
                items = items.filter(item => String(item[key]) === String(value));
            }
        }
        return items;
    }

    async findById(collection, id) {
        const items = this._read(collection);
        return items.find(item => item.id === id) || null;
    }

    async create(collection, doc) {
        const items = this._read(collection);
        items.push(doc);
        this._write(collection, items);
        return doc;
    }

    async update(collection, id, updates) {
        const items = this._read(collection);
        const idx = items.findIndex(item => item.id === id);
        if (idx === -1) return null;
        items[idx] = { ...items[idx], ...updates, id };
        this._write(collection, items);
        return items[idx];
    }

    async delete(collection, id) {
        let items = this._read(collection);
        const len = items.length;
        items = items.filter(item => item.id !== id);
        this._write(collection, items);
        return items.length < len;
    }
}

module.exports = JsonAdapter;
