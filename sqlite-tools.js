// SQLite tools implementation usando solo built-in modules
import fs from 'fs/promises';
import path from 'path';

// Implementazione SQLite semplificata per operazioni base
class SimpleSQLite {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = new Map();
    this.schema = new Map();
  }

  async init() {
    try {
      if (await fs.access(this.dbPath).then(() => true).catch(() => false)) {
        const content = await fs.readFile(this.dbPath, 'utf8');
        if (content.trim()) {
          const parsed = JSON.parse(content);
          this.data = new Map(Object.entries(parsed.data || {}));
          this.schema = new Map(Object.entries(parsed.schema || {}));
        }
      }
    } catch (error) {
      // File doesn't exist or is empty, start fresh
    }
  }

  async save() {
    const saveData = {
      data: Object.fromEntries(this.data),
      schema: Object.fromEntries(this.schema),
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(this.dbPath, JSON.stringify(saveData, null, 2));
  }

  createTable(tableName, columns) {
    this.schema.set(tableName, columns);
    if (!this.data.has(tableName)) {
      this.data.set(tableName, []);
    }
    return { success: true, message: `Tabella ${tableName} creata` };
  }

  insert(tableName, record) {
    if (!this.data.has(tableName)) {
      throw new Error(`Tabella ${tableName} non esiste`);
    }
    
    const table = this.data.get(tableName);
    const recordWithId = { id: Date.now(), ...record };
    table.push(recordWithId);
    this.data.set(tableName, table);
    
    return { success: true, insertedId: recordWithId.id };
  }

  select(tableName, where = null, limit = null) {
    if (!this.data.has(tableName)) {
      throw new Error(`Tabella ${tableName} non esiste`);
    }
    
    let records = [...this.data.get(tableName)];
    
    if (where) {
      records = records.filter(record => {
        return Object.entries(where).every(([key, value]) => record[key] === value);
      });
    }
    
    if (limit && limit > 0) {
      records = records.slice(0, limit);
    }
    
    return records;
  }

  update(tableName, where, updates) {
    if (!this.data.has(tableName)) {
      throw new Error(`Tabella ${tableName} non esiste`);
    }
    
    const table = this.data.get(tableName);
    let updatedCount = 0;
    
    const updatedTable = table.map(record => {
      const matches = Object.entries(where).every(([key, value]) => record[key] === value);
      if (matches) {
        updatedCount++;
        return { ...record, ...updates };
      }
      return record;
    });
    
    this.data.set(tableName, updatedTable);
    return { success: true, updatedCount };
  }

  delete(tableName, where) {
    if (!this.data.has(tableName)) {
      throw new Error(`Tabella ${tableName} non esiste`);
    }
    
    const table = this.data.get(tableName);
    const filteredTable = table.filter(record => {
      return !Object.entries(where).every(([key, value]) => record[key] === value);
    });
    
    const deletedCount = table.length - filteredTable.length;
    this.data.set(tableName, filteredTable);
    
    return { success: true, deletedCount };
  }

  getTables() {
    return Array.from(this.schema.keys());
  }

  getTableInfo(tableName) {
    return {
      name: tableName,
      schema: this.schema.get(tableName),
      recordCount: this.data.get(tableName)?.length || 0
    };
  }
}

export { SimpleSQLite };