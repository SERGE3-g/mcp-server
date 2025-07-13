# 🚀 MCP Server - Advanced Toolkit

**Un server MCP (Model Context Protocol) completo e potente con 19+ tools integrati per ogni esigenza di automazione e integrazione.**

![MCP Server](https://img.shields.io/badge/MCP-Server-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-ISC-yellow)

## 📋 Panoramica

Questo server MCP fornisce un ecosistema completo di strumenti per interagire con Claude AI, offrendo funzionalità che vanno dalla gestione file e database, all'invio di email reali, generazione di PDF e QR code, fino a operazioni avanzate di AI/ML.

### ✨ Caratteristiche Principali

- **19 Tools Integrati** - Dalla gestione file alle operazioni AI
- **Email SMTP Reali** - Invio email autentiche con Gmail, Outlook, Yahoo
- **Database SQLite Autentico** - Database vero con query SQL
- **WebSocket Real-time** - Comunicazione bidirezionale
- **Generazione PDF** - Fatture, report, documenti
- **QR Code Generator** - WiFi, vCard, SMS, URL
- **Sistema Plugin** - Estensibilità completa
- **Cache Intelligente** - Performance ottimizzate
- **Rate Limiting** - Controllo utilizzo
- **Interfaccia Web** - Dashboard di controllo
- **Sicurezza Avanzata** - Validazione e controlli

## 🛠️ Installazione

### Prerequisiti

- **Node.js 18+** (Windows/macOS/Linux)
- **sqlite3** (opzionale, per database reali)
- **Claude Desktop** installato

### Setup Rapido

**🍎 macOS/Linux:**
```bash
# Clona il repository
git clone <repository-url>
cd mcp-server

# Installa dipendenze
npm install

# Configura automaticamente
./setup-claude.sh

# Avvia server
npm start
```

**🪟 Windows:**
```cmd
REM Clona il repository
git clone <repository-url>
cd mcp-server

REM Installa dipendenze  
npm install

REM Configura automaticamente
setup-claude-windows.bat

REM Avvia server
npm start
```

### Configurazione

Crea un file `.env` basato su `.env.example`:

```bash
# Configurazione Server MCP
MCP_SERVER_NAME=mcp-server
MCP_SERVER_VERSION=1.0.0

# Debug mode
DEBUG=false

# Dimensione massima file (in bytes)
MAX_FILE_SIZE=1048576

# Cache e Rate Limiting
CACHE_SIZE=100
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

## 📚 Tools Disponibili

### 🔧 **Tools Base (5)**

#### `get_system_info`
Ottiene informazioni dettagliate sul sistema.

```json
{
  "name": "get_system_info",
  "arguments": {
    "detailed": true
  }
}
```

#### `echo`
Test di connessione - restituisce il testo fornito.

#### `list_files`
Esplora directory e file.

#### `read_file`
Legge il contenuto di file.

#### `execute_command`
Esegue comandi di sistema sicuri (whitelist).

### 🌐 **Tools di Rete (3)**

#### `http_request`
Client HTTP/HTTPS completo.

```json
{
  "name": "http_request",
  "arguments": {
    "url": "https://api.example.com",
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "body": "{\"key\": \"value\"}"
  }
}
```

#### `websocket_server`
Server WebSocket real-time.

```json
{
  "name": "websocket_server",
  "arguments": {
    "action": "start",
    "port": 8080
  }
}
```

### 📧 **Email Tools (1)**

#### `email_operations`
Sistema email completo con SMTP reale.

```json
{
  "name": "email_operations",
  "arguments": {
    "operation": "send",
    "to": "destinatario@email.com",
    "subject": "Test Email",
    "body": "<h1>Email HTML</h1>"
  }
}
```

**Configurazione SMTP:**
```javascript
// Prima configura il provider
{
  "operation": "configure_smtp",
  "provider": "gmail",
  "auth": {
    "user": "tua@gmail.com",
    "pass": "app-password"
  }
}
```

### 🤖 **AI/ML Tools (1)**

#### `ai_operations`
Operazioni di intelligenza artificiale.

```json
{
  "name": "ai_operations",
  "arguments": {
    "operation": "sentiment",
    "text": "Questo prodotto è fantastico!"
  }
}
```

**Operazioni disponibili:**
- `sentiment` - Analisi sentimenti
- `summarize` - Riassunto testo
- `classify` - Classificazione
- `enhance` - Miglioramento testo
- `detect_language` - Rilevamento lingua
- `similarity` - Similarità tra testi

### 📊 **Data Tools (3)**

#### `json_tools`
Manipolazione JSON/YAML.

#### `csv_operations`
Elaborazione completa CSV/Excel.

```json
{
  "name": "csv_operations",
  "arguments": {
    "operation": "parse",
    "data": "name,age\nMario,30\nLuigi,25",
    "options": {"hasHeader": true}
  }
}
```

#### `sqlite_db`
Database SQLite completo.

```json
{
  "name": "sqlite_db",
  "arguments": {
    "operation": "create_table",
    "table": "users",
    "columns": {"name": "TEXT", "email": "TEXT"}
  }
}
```

### 🔐 **Security & Text Tools (2)**

#### `crypto_tools`
Strumenti crittografici.

```json
{
  "name": "crypto_tools",
  "arguments": {
    "operation": "hash",
    "data": "testo da hashare",
    "algorithm": "sha256"
  }
}
```

#### `text_processing`
Elaborazione testo avanzata.

### 📁 **File & Git Tools (2)**

#### `file_operations`
Operazioni file avanzate.

#### `git_operations`
Operazioni Git (sola lettura).

### 🎨 **Creative Tools (1)**

#### `template_engine`
Motore template con helpers.

```json
{
  "name": "template_engine",
  "arguments": {
    "operation": "render_string",
    "content": "Ciao {{name}}! Oggi è {{date \"DD/MM/YYYY\"}}",
    "data": {"name": "Mario"}
  }
}
```

### 🏥 **System Tools (2)**

#### `health_check`
Monitoraggio server e metriche.

#### `plugin_manager`
Sistema plugin dinamico.

## 🔥 **Features Avanzate**

### 📱 **QR Code Generator**
Genera QR code per diversi scopi:

```javascript
// QR WiFi
qrTools.generateWiFiQR({
  ssid: "MiaRete",
  password: "password123",
  security: "WPA"
});

// QR vCard
qrTools.generateVCardQR({
  name: "Mario Rossi",
  phone: "+39123456789",
  email: "mario@email.com"
});

// QR URL
qrTools.generateURLQR("https://example.com");
```

### 📄 **PDF Generator**
Crea documenti PDF professionali:

```javascript
// Fattura PDF
await pdfTools.createInvoice({
  number: "2024-001",
  date: "2024-01-15",
  customer: {
    name: "Cliente SpA",
    address: "Via Roma 1",
    city: "Milano",
    zip: "20100"
  },
  items: [
    {description: "Servizio", quantity: 1, price: 100, total: 100}
  ],
  total: 100
});

// Report PDF
await pdfTools.createReport({
  title: "Report Mensile",
  author: "Sistema",
  sections: [...]
});
```

### 🔧 **Sistema Plugin**
Estendi il server con plugin personalizzati:

```javascript
// Plugin di esempio
export default {
  name: 'custom',
  version: '1.0.0',
  description: 'Plugin personalizzato',
  
  tools: [{
    name: 'my_tool',
    description: 'Il mio strumento',
    inputSchema: { /* schema */ }
  }],

  async execute(toolName, args) {
    // Logica del plugin
    return { content: [{ type: 'text', text: 'Risultato' }] };
  }
};
```

## 🌐 **Interfaccia Web**

Il server include una dashboard web completa accessibile aprendo `web-interface.html`:

- **Controlli Server** - Start/Stop/Riavvio
- **Monitoring Real-time** - Metriche e log live
- **Test Tools** - Interfaccia per testare tutti i tools
- **Gestione Plugin** - Carica/scarica plugin
- **WebSocket Status** - Stato connessioni

## ⚙️ **Configurazione Avanzata**

### Email SMTP

Supporta i principali provider:

```javascript
// Gmail (App Password richiesta)
{
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: 'email@gmail.com', pass: 'app-password' }
}

// Outlook
{
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: { user: 'email@outlook.com', pass: 'password' }
}
```

### Database SQLite

Per utilizzare SQLite reale:

```bash
# macOS
brew install sqlite3

# Ubuntu/Debian
sudo apt-get install sqlite3

# Windows
# Scarica da https://sqlite.org/download.html
```

### WebSocket

Il server WebSocket supporta:
- **Rooms** - Canali di comunicazione
- **Broadcast** - Messaggi a tutti
- **Private Messages** - Messaggi diretti
- **Presenza** - Stato utenti

## 🔒 **Sicurezza**

### Controlli Implementati

- **Path Traversal Protection** - Accesso solo directory corrente
- **Command Whitelist** - Solo comandi sicuri
- **Rate Limiting** - Controllo frequenza richieste
- **Input Validation** - Validazione parametri
- **File Size Limits** - Controllo dimensioni file
- **Error Handling** - Gestione errori sicura

### Best Practices

1. **Non committare credenziali** - Usa file `.env`
2. **App Password** - Usa app password per Gmail
3. **Firewall** - Configura firewall per WebSocket
4. **Monitoring** - Monitora log e metriche
5. **Backup** - Backup regolari database

## 📖 **Esempi di Utilizzo**

### Scenario 1: Email Marketing
```json
{
  "name": "email_operations",
  "arguments": {
    "operation": "create_template",
    "template_name": "newsletter",
    "template": {
      "subject": "Newsletter {{month}}",
      "htmlBody": "<h1>Ciao {{name}}!</h1><p>{{content}}</p>"
    }
  }
}
```

### Scenario 2: Report Automatico
```json
{
  "name": "sqlite_db",
  "arguments": {
    "operation": "select",
    "table": "sales",
    "where": {"month": "2024-01"}
  }
}
```

### Scenario 3: QR Code Menu Ristorante
```javascript
qrTools.generateURLQR("https://menu.ristorante.com", {
  size: 300,
  errorCorrectionLevel: 'H'
});
```

### Scenario 4: Backup Automatico
```json
{
  "name": "file_operations",
  "arguments": {
    "operation": "copy",
    "source": "./data",
    "destination": "./backup/data-2024-01-15"
  }
}
```

## 🤝 **Contribuire**

1. Fork del repository
2. Crea branch feature (`git checkout -b feature/nome-feature`)
3. Commit modifiche (`git commit -am 'Aggiunge feature'`)
4. Push al branch (`git push origin feature/nome-feature`)
5. Crea Pull Request

### Sviluppo Plugin

Per creare un nuovo plugin:

1. Crea file `plugins/mio-plugin.js`
2. Implementa interfaccia plugin
3. Carica con `plugin_manager`
4. Testa funzionalità

## 📊 **Performance**

### Metriche

- **Startup Time:** < 1 secondo
- **Memory Usage:** 50-100MB base
- **Request Latency:** < 100ms (cached)
- **Concurrent Requests:** 100+ simultanee
- **File Processing:** 1MB default limit
- **Database:** SQLite ottimizzato

### Ottimizzazioni

- **Cache intelligente** con TTL
- **Connection pooling** database
- **Lazy loading** plugin
- **Stream processing** file grandi
- **Compression** WebSocket

## 🐛 **Troubleshooting**

### Problemi Comuni

**Email non invia:**
- Verifica credenziali SMTP
- Usa App Password per Gmail
- Controlla firewall

**SQLite non funziona:**
- Installa `sqlite3` nel sistema
- Verifica permessi file database
- Controlla path database

**WebSocket errori:**
- Verifica porta disponibile
- Controlla firewall
- Verifica formato messaggi

**Plugin non carica:**
- Controlla sintassi JavaScript
- Verifica export default
- Controlla schema tools

## 📄 **License**

ISC License - Vedi file LICENSE per dettagli.

## 🙏 **Crediti**

- **MCP SDK** - Anthropic
- **Node.js** - Runtime JavaScript
- **SQLite** - Database embedded
- **Community** - Contributi e feedback

---

## 🚀 **Quick Start Commands**

```bash
# Sviluppo
npm run dev

# Produzione  
npm start

# Test tools
curl -X POST http://localhost:3000/health

# WebSocket test
wscat -c ws://localhost:8080

# Plugin test
node -e "console.log('Plugin loaded')"
```

**🎯 Pronto per l'uso con Claude AI - Il tuo server MCP definitivo!**