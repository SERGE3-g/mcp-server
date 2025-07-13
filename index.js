#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { spawn } from 'child_process';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import url from 'url';
import { SimpleSQLite } from './sqlite-tools.js';
import { PluginManager } from './plugin-system.js';
import { WebSocketManager } from './websocket-tools.js';
import { AITools } from './ai-tools.js';
import { EmailTools } from './email-tools.js';
import { CSVExcelTools } from './csv-excel-tools.js';
import { TemplateTools } from './template-tools.js';
import { RealEmailTools } from './real-email-tools.js';
import { RealSQLiteTools } from './real-sqlite-tools.js';
import { QRCodeTools } from './qr-tools.js';
import { PDFTools } from './pdf-tools.js';
import zlib from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Logger {
  static log(level, message, ...args) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${level.toUpperCase()}] ${message}`, ...args);
  }

  static info(message, ...args) {
    this.log('info', message, ...args);
  }

  static error(message, ...args) {
    this.log('error', message, ...args);
  }

  static warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  static debug(message, ...args) {
    if (process.env.DEBUG === 'true') {
      this.log('debug', message, ...args);
    }
  }
}

function validateInput(schema, data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Input deve essere un oggetto');
  }
  
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        throw new Error(`Campo richiesto mancante: ${field}`);
      }
    }
  }
  
  return true;
}

function checkRateLimit(clientId = 'default') {
  const now = Date.now();
  const windowStart = now - CONFIG.rateLimitWindow;
  
  if (!rateLimitStore.has(clientId)) {
    rateLimitStore.set(clientId, []);
  }
  
  const requests = rateLimitStore.get(clientId);
  const validRequests = requests.filter(time => time > windowStart);
  
  if (validRequests.length >= CONFIG.rateLimitMax) {
    throw new Error(`Rate limit superato: ${CONFIG.rateLimitMax} richieste per minuto`);
  }
  
  validRequests.push(now);
  rateLimitStore.set(clientId, validRequests);
}

function getCacheKey(tool, args) {
  return `${tool}:${JSON.stringify(args)}`;
}

function getFromCache(key) {
  return cache.get(key);
}

function setCache(key, value, ttl = 300000) { // 5 minuti default
  if (cache.size >= CONFIG.cacheSize) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  cache.set(key, {
    value,
    expires: Date.now() + ttl
  });
  
  setTimeout(() => cache.delete(key), ttl);
}

function makeHttpRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(urlStr);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'MCP-Server/1.0',
        ...options.headers
      },
      timeout: options.timeout || 10000
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

function processText(text, operation, params = {}) {
  switch (operation) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'trim':
      return text.trim();
    case 'reverse':
      return text.split('').reverse().join('');
    case 'replace':
      return text.replace(new RegExp(params.search, params.flags || 'g'), params.replace || '');
    case 'extract':
      const regex = new RegExp(params.pattern, params.flags || 'g');
      return [...text.matchAll(regex)].map(match => match[0]);
    case 'split':
      return text.split(params.delimiter || '\n');
    case 'join':
      return Array.isArray(text) ? text.join(params.delimiter || '\n') : text;
    case 'encode':
      const encoding = params.encoding || 'base64';
      if (encoding === 'base64') return Buffer.from(text).toString('base64');
      if (encoding === 'url') return encodeURIComponent(text);
      if (encoding === 'html') return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
      throw new Error(`Encoding non supportato: ${encoding}`);
    case 'decode':
      const decoding = params.encoding || 'base64';
      if (decoding === 'base64') return Buffer.from(text, 'base64').toString();
      if (decoding === 'url') return decodeURIComponent(text);
      throw new Error(`Decoding non supportato: ${decoding}`);
    default:
      throw new Error(`Operazione non supportata: ${operation}`);
  }
}

const CONFIG = {
  name: process.env.MCP_SERVER_NAME || 'mcp-server',
  version: process.env.MCP_SERVER_VERSION || '1.0.0',
  debug: process.env.DEBUG === 'true',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 1024 * 1024, // 1MB default
  cacheSize: parseInt(process.env.CACHE_SIZE) || 100,
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minuto
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
};

const cache = new Map();
const rateLimitStore = new Map();
const healthMetrics = {
  requestCount: 0,
  errorCount: 0,
  startTime: Date.now(),
  lastRequest: null,
};

// Inizializza tools
const sqliteDb = new SimpleSQLite(path.join(process.cwd(), "data.db"));
const pluginManager = new PluginManager();
const wsManager = new WebSocketManager();
const aiTools = new AITools();
const emailTools = new EmailTools();
const csvTools = new CSVExcelTools();
const templateEngine = new TemplateTools();
const realEmailTools = new RealEmailTools();
const realSqliteDb = new RealSQLiteTools(path.join(process.cwd(), 'real-data.db'));
const qrTools = new QRCodeTools();
const pdfTools = new PDFTools();
const server = new Server(
  {
    name: CONFIG.name,
    version: CONFIG.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  Logger.debug('Richiesta lista tools');
  return {
    tools: [
      {
        name: 'get_system_info',
        description: 'Ottiene informazioni dettagliate sul sistema',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: {
              type: 'boolean',
              description: 'Se true, include informazioni aggiuntive',
              default: false
            }
          },
        },
      },
      {
        name: 'echo',
        description: 'Restituisce il testo che gli viene passato',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Il testo da restituire',
              maxLength: 1000
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'list_files',
        description: 'Elenca i file in una directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Percorso della directory da listare',
              default: '.'
            },
            hidden: {
              type: 'boolean',
              description: 'Include file nascosti',
              default: false
            }
          },
        },
      },
      {
        name: 'read_file',
        description: 'Legge il contenuto di un file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Percorso del file da leggere'
            },
            encoding: {
              type: 'string',
              description: 'Encoding del file',
              default: 'utf8'
            }
          },
          required: ['path'],
        },
      },
      {
        name: 'execute_command',
        description: 'Esegue un comando di sistema (solo comandi sicuri)',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Comando da eseguire'
            },
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Argomenti del comando',
              default: []
            }
          },
          required: ['command'],
        },
      },
      {
        name: 'json_tools',
        description: 'Strumenti per manipolare JSON/YAML',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['parse', 'stringify', 'validate', 'query', 'merge'],
              description: 'Operazione da eseguire'
            },
            data: {
              type: 'string',
              description: 'Dati JSON/YAML da processare'
            },
            query: {
              type: 'string',
              description: 'Query path (es: user.name)'
            },
            merge_with: {
              type: 'string',
              description: 'JSON da unire'
            },
            format: {
              type: 'string',
              enum: ['json', 'yaml'],
              default: 'json'
            }
          },
          required: ['operation', 'data']
        }
      },
      {
        name: 'http_request',
        description: 'Effettua richieste HTTP/HTTPS',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL da chiamare'
            },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              default: 'GET'
            },
            headers: {
              type: 'object',
              description: 'Headers HTTP'
            },
            body: {
              type: 'string',
              description: 'Body della richiesta'
            },
            timeout: {
              type: 'number',
              description: 'Timeout in millisecondi',
              default: 10000
            }
          },
          required: ['url']
        }
      },
      {
        name: 'text_processing',
        description: 'Strumenti per processare testo',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Testo da processare'
            },
            operation: {
              type: 'string',
              enum: ['upper', 'lower', 'trim', 'reverse', 'replace', 'extract', 'split', 'join', 'encode', 'decode'],
              description: 'Operazione da eseguire'
            },
            params: {
              type: 'object',
              description: 'Parametri per l\'operazione'
            }
          },
          required: ['text', 'operation']
        }
      },
      {
        name: 'crypto_tools',
        description: 'Strumenti crittografici e hash',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['hash', 'uuid', 'random', 'base64_encode', 'base64_decode'],
              description: 'Operazione da eseguire'
            },
            data: {
              type: 'string',
              description: 'Dati da processare'
            },
            algorithm: {
              type: 'string',
              enum: ['md5', 'sha1', 'sha256', 'sha512'],
              default: 'sha256'
            },
            length: {
              type: 'number',
              description: 'Lunghezza per random bytes',
              default: 16
            }
          },
          required: ['operation']
        }
      },
      {
        name: 'file_operations',
        description: 'Operazioni avanzate sui file',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['copy', 'move', 'delete', 'compress', 'decompress', 'stats', 'search'],
              description: 'Operazione da eseguire'
            },
            source: {
              type: 'string',
              description: 'File/directory sorgente'
            },
            destination: {
              type: 'string',
              description: 'File/directory destinazione'
            },
            pattern: {
              type: 'string',
              description: 'Pattern di ricerca'
            },
            recursive: {
              type: 'boolean',
              default: false
            }
          },
          required: ['operation', 'source']
        }
      },
      {
        name: 'git_operations',
        description: 'Operazioni Git (solo lettura)',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['status', 'log', 'diff', 'branch', 'remote'],
              description: 'Operazione Git da eseguire'
            },
            path: {
              type: 'string',
              description: 'Percorso repository',
              default: '.'
            },
            limit: {
              type: 'number',
              description: 'Limite risultati per log',
              default: 10
            }
          },
          required: ['operation']
        }
      },
      {
        name: 'health_check',
        description: 'Controllo stato server e metriche',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: {
              type: 'boolean',
              description: 'Informazioni dettagliate',
              default: false
            }
          }
        }
      },
    ],
  };
});

async function executeCommand(command, args = []) {
  const allowedCommands = ['ls', 'pwd', 'date', 'whoami', 'uname', 'df', 'free', 'ps', 'git'];
  
  if (!allowedCommands.includes(command)) {
    throw new Error(`Comando non consentito: ${command}`);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { timeout: 5000 });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Comando fallito con codice ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    healthMetrics.requestCount++;
    healthMetrics.lastRequest = new Date().toISOString();
    
    checkRateLimit();
    
    const cacheKey = getCacheKey(name, args);
    const cached = getFromCache(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      Logger.debug(`Cache hit per tool: ${name}`);
      return cached.value;
    }
    
    Logger.debug(`Esecuzione tool: ${name}`, args);

    switch (name) {
      case 'get_system_info': {
        const basicInfo = {
          sistema: process.platform,
          nodejs: process.version,
          pid: process.pid,
          cwd: process.cwd(),
          uptime: Math.floor(process.uptime()),
        };

        if (args?.detailed) {
          const detailedInfo = {
            ...basicInfo,
            arch: process.arch,
            memoria: {
              usata: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              totale: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              sistema: Math.round(os.totalmem() / 1024 / 1024),
              libera: Math.round(os.freemem() / 1024 / 1024)
            },
            cpu: os.cpus().length,
            hostname: os.hostname(),
            user: os.userInfo().username
          };
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(detailedInfo, null, 2)
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: Object.entries(basicInfo)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n')
          }]
        };
      }

      case 'echo': {
        validateInput({ required: ['text'] }, args);
        if (args.text.length > 1000) {
          throw new Error('Testo troppo lungo (max 1000 caratteri)');
        }
        return {
          content: [{
            type: 'text',
            text: args.text
          }]
        };
      }

      case 'list_files': {
        const dirPath = args?.path || '.';
        const showHidden = args?.hidden || false;
        
        const resolvedPath = path.resolve(dirPath);
        if (!resolvedPath.startsWith(process.cwd())) {
          throw new Error('Accesso negato: percorso fuori dalla directory corrente');
        }

        const files = await fs.readdir(resolvedPath, { withFileTypes: true });
        const fileList = files
          .filter(file => showHidden || !file.name.startsWith('.'))
          .map(file => ({
            nome: file.name,
            tipo: file.isDirectory() ? 'directory' : 'file',
            simbolico: file.isSymbolicLink()
          }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(fileList, null, 2)
          }]
        };
      }

      case 'read_file': {
        validateInput({ required: ['path'] }, args);
        const filePath = path.resolve(args.path);
        
        if (!filePath.startsWith(process.cwd())) {
          throw new Error('Accesso negato: percorso fuori dalla directory corrente');
        }

        const stats = await fs.stat(filePath);
        if (stats.size > CONFIG.maxFileSize) {
          throw new Error(`File troppo grande (max ${CONFIG.maxFileSize} bytes)`);
        }

        const content = await fs.readFile(filePath, args.encoding || 'utf8');
        return {
          content: [{
            type: 'text',
            text: content
          }]
        };
      }

      case 'execute_command': {
        validateInput({ required: ['command'] }, args);
        const output = await executeCommand(args.command, args.args || []);
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }

      case 'json_tools': {
        validateInput({ required: ['operation', 'data'] }, args);
        const { operation, data, query, merge_with, format } = args;
        
        let result;
        
        switch (operation) {
          case 'parse':
            try {
              result = JSON.parse(data);
            } catch (e) {
              throw new Error(`Errore parsing JSON: ${e.message}`);
            }
            break;
            
          case 'stringify':
            try {
              const obj = typeof data === 'string' ? JSON.parse(data) : data;
              result = JSON.stringify(obj, null, 2);
            } catch (e) {
              throw new Error(`Errore stringify: ${e.message}`);
            }
            break;
            
          case 'validate':
            try {
              JSON.parse(data);
              result = { valid: true, message: 'JSON valido' };
            } catch (e) {
              result = { valid: false, error: e.message };
            }
            break;
            
          case 'query':
            try {
              const obj = JSON.parse(data);
              const keys = query.split('.');
              let value = obj;
              for (const key of keys) {
                value = value?.[key];
              }
              result = value;
            } catch (e) {
              throw new Error(`Errore query: ${e.message}`);
            }
            break;
            
          case 'merge':
            try {
              const obj1 = JSON.parse(data);
              const obj2 = JSON.parse(merge_with);
              result = { ...obj1, ...obj2 };
            } catch (e) {
              throw new Error(`Errore merge: ${e.message}`);
            }
            break;
        }
        
        return {
          content: [{
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
          }]
        };
      }

      case 'http_request': {
        validateInput({ required: ['url'] }, args);
        const { url: requestUrl, method, headers, body, timeout } = args;
        
        if (!requestUrl.startsWith('http://') && !requestUrl.startsWith('https://')) {
          throw new Error('URL deve iniziare con http:// o https://');
        }
        
        const response = await makeHttpRequest(requestUrl, {
          method,
          headers,
          body,
          timeout
        });
        
        const result = {
          status: response.status,
          headers: response.headers,
          data: response.data
        };
        
        setCache(cacheKey, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }, 60000);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'text_processing': {
        validateInput({ required: ['text', 'operation'] }, args);
        const { text, operation, params } = args;
        
        const result = processText(text, operation, params || {});
        
        return {
          content: [{
            type: 'text',
            text: Array.isArray(result) ? JSON.stringify(result, null, 2) : String(result)
          }]
        };
      }

      case 'crypto_tools': {
        validateInput({ required: ['operation'] }, args);
        const { operation, data, algorithm, length } = args;
        
        let result;
        
        switch (operation) {
          case 'hash':
            if (!data) throw new Error('Data richiesto per hash');
            result = crypto.createHash(algorithm || 'sha256').update(data).digest('hex');
            break;
            
          case 'uuid':
            result = crypto.randomUUID();
            break;
            
          case 'random':
            result = crypto.randomBytes(length || 16).toString('hex');
            break;
            
          case 'base64_encode':
            if (!data) throw new Error('Data richiesto per encoding');
            result = Buffer.from(data).toString('base64');
            break;
            
          case 'base64_decode':
            if (!data) throw new Error('Data richiesto per decoding');
            result = Buffer.from(data, 'base64').toString();
            break;
            
          default:
            throw new Error(`Operazione crypto non supportata: ${operation}`);
        }
        
        return {
          content: [{
            type: 'text',
            text: result
          }]
        };
      }

      case 'file_operations': {
        validateInput({ required: ['operation', 'source'] }, args);
        const { operation, source, destination, pattern, recursive } = args;
        
        const sourcePath = path.resolve(source);
        if (!sourcePath.startsWith(process.cwd())) {
          throw new Error('Accesso negato: percorso fuori dalla directory corrente');
        }
        
        let result;
        
        switch (operation) {
          case 'stats':
            const stats = await fs.stat(sourcePath);
            result = {
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime,
              isDirectory: stats.isDirectory(),
              isFile: stats.isFile(),
              permissions: stats.mode.toString(8)
            };
            break;
            
          case 'copy':
            if (!destination) throw new Error('Destinazione richiesta per copy');
            const destPath = path.resolve(destination);
            if (!destPath.startsWith(process.cwd())) {
              throw new Error('Accesso negato: destinazione fuori dalla directory corrente');
            }
            await fs.copyFile(sourcePath, destPath);
            result = 'File copiato con successo';
            break;
            
          case 'search':
            if (!pattern) throw new Error('Pattern richiesto per search');
            const files = await fs.readdir(sourcePath, { recursive: recursive || false });
            const regex = new RegExp(pattern, 'i');
            result = files.filter(file => regex.test(file));
            break;
            
          default:
            throw new Error(`Operazione file non supportata: ${operation}`);
        }
        
        return {
          content: [{
            type: 'text',
            text: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)
          }]
        };
      }

      case 'git_operations': {
        validateInput({ required: ['operation'] }, args);
        const { operation, path: gitPath, limit } = args;
        
        const allowedGitCommands = ['status', 'log', 'diff', 'branch', 'remote'];
        if (!allowedGitCommands.includes(operation)) {
          throw new Error(`Operazione Git non consentita: ${operation}`);
        }
        
        const gitArgs = {
          status: ['status', '--porcelain'],
          log: ['log', '--oneline', `-${limit || 10}`],
          diff: ['diff', '--name-only'],
          branch: ['branch', '-v'],
          remote: ['remote', '-v']
        }[operation];
        
        const output = await executeCommand('git', gitArgs);
        
        setCache(cacheKey, { content: [{ type: 'text', text: output }] }, 30000);
        
        return {
          content: [{
            type: 'text',
            text: output || 'Nessun output'
          }]
        };
      }

      case 'health_check': {
        const uptime = Date.now() - healthMetrics.startTime;
        const basicHealth = {
          status: 'healthy',
          uptime: Math.floor(uptime / 1000),
          requests: healthMetrics.requestCount,
          errors: healthMetrics.errorCount,
          lastRequest: healthMetrics.lastRequest,
          cacheSize: cache.size,
          memory: process.memoryUsage()
        };
        
        if (args?.detailed) {
          basicHealth.rateLimits = Object.fromEntries(rateLimitStore);
          basicHealth.config = CONFIG;
          basicHealth.nodeVersion = process.version;
          basicHealth.platform = process.platform;
        }
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(basicHealth, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Tool sconosciuto: ${name}`);
    }
  } catch (error) {
    healthMetrics.errorCount++;
    Logger.error(`Errore nell'esecuzione del tool ${name}:`, error.message);
    throw error;
  }
});

// Definisci le risorse disponibili
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'system://info',
        name: 'Informazioni Sistema',
        description: 'Informazioni sul sistema corrente',
        mimeType: 'text/plain',
      },
    ],
  };
});

// Implementa la lettura delle risorse
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'system://info':
      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `Sistema: ${process.platform}\nNode.js: ${process.version}\nArchitettura: ${process.arch}\nMemoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          },
        ],
      };

    default:
      throw new Error(`Risorsa non trovata: ${uri}`);
  }
});

process.on('uncaughtException', (error) => {
  Logger.error('Eccezione non gestita:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Promise rejection non gestita:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  Logger.info('Ricevuto SIGINT, chiusura server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('Ricevuto SIGTERM, chiusura server...');
  process.exit(0);
});

async function main() {
  try {
    Logger.info(`Avvio server MCP ${CONFIG.name} v${CONFIG.version}`);
    Logger.debug('Configurazione:', CONFIG);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    Logger.info('Server MCP avviato e in ascolto...');
  } catch (error) {
    Logger.error('Errore durante l\'avvio del server:', error);
    process.exit(1);
  }
}

main();
