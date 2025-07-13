// SQLite REALE usando Child Process - NO DEMO!
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

class RealSQLiteTools {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.isInitialized = false;
  }

  async init() {
    try {
      // Verifica se sqlite3 è disponibile nel sistema
      await this.executeCommand('sqlite3 --version');
      this.isInitialized = true;
      
      // Crea database se non esiste
      if (!(await this.fileExists(this.dbPath))) {
        await this.executeSQL('SELECT 1');
      }
      
      return { success: true, message: 'Database SQLite inizializzato' };
    } catch (error) {
      throw new Error(`SQLite non disponibile: ${error.message}. Installa sqlite3 sul sistema.`);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `Command failed with code ${code}`));
        }
      });
      
      process.on('error', reject);
    });
  }

  async executeSQL(sql, params = []) {
    if (!this.isInitialized) {
      throw new Error('Database non inizializzato');
    }

    return new Promise((resolve, reject) => {
      const sqlite = spawn('sqlite3', ['-json', this.dbPath]);
      
      let stdout = '';
      let stderr = '';
      
      sqlite.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      sqlite.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      sqlite.on('close', (code) => {
        if (code === 0) {
          try {
            // Parse output JSON se presente
            const result = stdout.trim();
            if (result && result.startsWith('[') || result.startsWith('{')) {
              resolve(JSON.parse(result));
            } else {
              resolve(result);
            }
          } catch {
            resolve(stdout.trim());
          }
        } else {
          reject(new Error(stderr || `SQLite command failed with code ${code}`));
        }
      });
      
      sqlite.on('error', reject);
      
      // Invia query
      let query = sql;
      if (params.length > 0) {
        // Sostituisci parametri (basic implementation)
        params.forEach((param, index) => {
          query = query.replace(`?`, typeof param === 'string' ? `'${param}'` : param);
        });
      }
      
      sqlite.stdin.write(query + '\n');
      sqlite.stdin.end();
    });
  }

  // Crea tabella
  async createTable(tableName, columns) {
    if (!tableName || !columns || typeof columns !== 'object') {
      throw new Error('Nome tabella e definizione colonne richiesti');
    }

    const columnDefs = Object.entries(columns).map(([name, type]) => {
      return `${name} ${type}`;
    }).join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${columnDefs},
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`;

    await this.executeSQL(sql);
    
    return {
      success: true,
      message: `Tabella ${tableName} creata`,
      sql
    };
  }

  // Inserisci record
  async insert(tableName, data) {
    if (!tableName || !data || typeof data !== 'object') {
      throw new Error('Nome tabella e dati richiesti');
    }

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    
    await this.executeSQL(sql, values);
    
    // Ottieni l'ID inserito
    const lastId = await this.executeSQL('SELECT last_insert_rowid() as id');
    
    return {
      success: true,
      insertedId: Array.isArray(lastId) ? lastId[0]?.id : null,
      message: `Record inserito in ${tableName}`
    };
  }

  // Seleziona records
  async select(tableName, where = null, limit = null, orderBy = null) {
    if (!tableName) {
      throw new Error('Nome tabella richiesto');
    }

    let sql = `SELECT * FROM ${tableName}`;
    const params = [];

    if (where) {
      const conditions = Object.entries(where).map(([key, value]) => {
        params.push(value);
        return `${key} = ?`;
      }).join(' AND ');
      sql += ` WHERE ${conditions}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ${limit}`;
    }

    const result = await this.executeSQL(sql, params);
    
    return {
      success: true,
      data: Array.isArray(result) ? result : [],
      count: Array.isArray(result) ? result.length : 0
    };
  }

  // Aggiorna records
  async update(tableName, where, data) {
    if (!tableName || !where || !data) {
      throw new Error('Nome tabella, condizioni e dati richiesti');
    }

    const setClauses = Object.entries(data).map(([key]) => `${key} = ?`).join(', ');
    const whereClause = Object.entries(where).map(([key]) => `${key} = ?`).join(' AND ');
    
    const params = [...Object.values(data), ...Object.values(where)];
    const sql = `UPDATE ${tableName} SET ${setClauses} WHERE ${whereClause}`;

    await this.executeSQL(sql, params);
    
    // Conta righe modificate
    const changes = await this.executeSQL('SELECT changes() as count');
    
    return {
      success: true,
      updatedCount: Array.isArray(changes) ? changes[0]?.count : 0,
      message: `Records aggiornati in ${tableName}`
    };
  }

  // Elimina records
  async delete(tableName, where) {
    if (!tableName || !where) {
      throw new Error('Nome tabella e condizioni richiesti');
    }

    const whereClause = Object.entries(where).map(([key]) => `${key} = ?`).join(' AND ');
    const params = Object.values(where);
    const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;

    await this.executeSQL(sql, params);
    
    const changes = await this.executeSQL('SELECT changes() as count');
    
    return {
      success: true,
      deletedCount: Array.isArray(changes) ? changes[0]?.count : 0,
      message: `Records eliminati da ${tableName}`
    };
  }

  // Lista tabelle
  async getTables() {
    const result = await this.executeSQL("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    return {
      success: true,
      tables: Array.isArray(result) ? result.map(row => row.name) : []
    };
  }

  // Info tabella
  async getTableInfo(tableName) {
    if (!tableName) {
      throw new Error('Nome tabella richiesto');
    }

    const schema = await this.executeSQL(`PRAGMA table_info(${tableName})`);
    const count = await this.executeSQL(`SELECT COUNT(*) as count FROM ${tableName}`);
    
    return {
      success: true,
      name: tableName,
      columns: Array.isArray(schema) ? schema : [],
      recordCount: Array.isArray(count) ? count[0]?.count : 0
    };
  }

  // Esegui query personalizzata
  async customQuery(sql, params = []) {
    if (!sql || typeof sql !== 'string') {
      throw new Error('Query SQL richiesta');
    }

    // Solo SELECT per sicurezza nelle query custom
    if (!sql.trim().toLowerCase().startsWith('select')) {
      throw new Error('Solo query SELECT permesse in customQuery');
    }

    const result = await this.executeSQL(sql, params);
    
    return {
      success: true,
      data: Array.isArray(result) ? result : [],
      sql
    };
  }

  // Backup database
  async backup(backupPath) {
    if (!backupPath) {
      throw new Error('Percorso backup richiesto');
    }

    try {
      const command = `sqlite3 "${this.dbPath}" ".backup '${backupPath}'"`;
      await this.executeCommand(command);
      
      return {
        success: true,
        message: `Backup creato: ${backupPath}`,
        path: backupPath
      };
    } catch (error) {
      throw new Error(`Errore backup: ${error.message}`);
    }
  }

  // Vacuum database
  async vacuum() {
    await this.executeSQL('VACUUM');
    
    return {
      success: true,
      message: 'Database ottimizzato (VACUUM)'
    };
  }

  // Statistiche database
  async getDatabaseStats() {
    const tables = await this.getTables();
    const size = await this.fileExists(this.dbPath) ? 
      (await fs.stat(this.dbPath)).size : 0;
    
    const version = await this.executeSQL('SELECT sqlite_version() as version');
    
    let totalRecords = 0;
    for (const tableName of tables.tables) {
      const info = await this.getTableInfo(tableName);
      totalRecords += info.recordCount;
    }
    
    return {
      success: true,
      database: this.dbPath,
      size: size,
      sizeFormatted: `${Math.round(size / 1024)}KB`,
      tables: tables.tables.length,
      totalRecords,
      version: Array.isArray(version) ? version[0]?.version : 'unknown',
      isInitialized: this.isInitialized
    };
  }
}

export { RealSQLiteTools };