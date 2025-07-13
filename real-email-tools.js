// SMTP REALE usando solo Node.js built-in - NO DEMO!
import tls from 'tls';
import net from 'net';
import crypto from 'crypto';

class RealEmailTools {
  constructor() {
    this.templates = new Map();
    this.emailQueue = [];
    this.sentEmails = [];
    this.smtpConfig = null;
  }

  // Configurazione SMTP REALE
  configureSMTP(config) {
    const { host, port, secure = true, auth } = config;
    
    if (!host || !port || !auth?.user || !auth?.pass) {
      throw new Error('Configurazione SMTP incompleta: host, port, auth.user, auth.pass richiesti');
    }

    this.smtpConfig = {
      host,
      port: parseInt(port),
      secure,
      auth: {
        user: auth.user,
        pass: auth.pass
      }
    };

    return {
      success: true,
      message: `SMTP configurato per ${host}:${port}`,
      config: { host, port, secure, user: auth.user }
    };
  }

  // Connessione SMTP REALE
  async connectSMTP() {
    if (!this.smtpConfig) {
      throw new Error('SMTP non configurato. Usa configureSMTP() prima.');
    }

    return new Promise((resolve, reject) => {
      const { host, port, secure } = this.smtpConfig;
      
      const socket = secure ? 
        tls.connect(port, host, { rejectUnauthorized: false }) :
        net.connect(port, host);

      let buffer = '';
      let authenticated = false;

      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line) continue;
          
          const code = parseInt(line.substring(0, 3));
          
          if (code === 220 && !authenticated) {
            // Server pronto
            socket.write(`EHLO ${require('os').hostname()}\r\n`);
          } else if (code === 250 && line.includes('AUTH') && !authenticated) {
            // Auth supportato
            const authString = Buffer.from(`\0${this.smtpConfig.auth.user}\0${this.smtpConfig.auth.pass}`).toString('base64');
            socket.write(`AUTH PLAIN ${authString}\r\n`);
          } else if (code === 235) {
            // Autenticazione riuscita
            authenticated = true;
            resolve({ socket, authenticated: true });
          } else if (code >= 400) {
            // Errore
            socket.end();
            reject(new Error(`SMTP Error ${code}: ${line}`));
          }
        }
      });

      socket.on('error', (error) => {
        reject(new Error(`Errore connessione SMTP: ${error.message}`));
      });

      socket.on('timeout', () => {
        socket.end();
        reject(new Error('Timeout connessione SMTP'));
      });

      socket.setTimeout(10000);
    });
  }

  // Invio email REALE
  async sendRealEmail(emailData) {
    if (!this.smtpConfig) {
      throw new Error('SMTP non configurato');
    }

    const { to, subject, htmlBody, textBody, from, cc, bcc } = emailData;

    // Validazione
    if (!to || !subject || (!htmlBody && !textBody)) {
      throw new Error('Destinatario, soggetto e corpo email richiesti');
    }

    if (!this.validateEmail(to).valid) {
      throw new Error('Email destinatario non valida');
    }

    try {
      const { socket } = await this.connectSMTP();
      
      return new Promise((resolve, reject) => {
        let step = 'MAIL_FROM';
        const emailId = crypto.randomUUID();
        
        const fromAddress = from || this.smtpConfig.auth.user;
        const messageId = `<${emailId}@${require('os').hostname()}>`;
        const timestamp = new Date().toUTCString();
        
        // Costruisci messaggio email
        const headers = [
          `Message-ID: ${messageId}`,
          `Date: ${timestamp}`,
          `From: ${fromAddress}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0'
        ];

        if (cc) headers.push(`Cc: ${cc}`);
        if (bcc) headers.push(`Bcc: ${bcc}`);

        let body = '';
        if (htmlBody && textBody) {
          const boundary = crypto.randomBytes(16).toString('hex');
          headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
          body = [
            `--${boundary}`,
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            textBody,
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            htmlBody,
            '',
            `--${boundary}--`
          ].join('\r\n');
        } else if (htmlBody) {
          headers.push('Content-Type: text/html; charset=utf-8');
          body = htmlBody;
        } else {
          headers.push('Content-Type: text/plain; charset=utf-8');
          body = textBody;
        }

        const message = headers.join('\r\n') + '\r\n\r\n' + body + '\r\n.\r\n';

        socket.on('data', (data) => {
          const response = data.toString();
          const code = parseInt(response.substring(0, 3));

          switch (step) {
            case 'MAIL_FROM':
              if (code === 250) {
                step = 'RCPT_TO';
                socket.write(`RCPT TO:<${to}>\r\n`);
              } else {
                socket.end();
                reject(new Error(`MAIL FROM failed: ${response}`));
              }
              break;

            case 'RCPT_TO':
              if (code === 250) {
                step = 'DATA';
                socket.write('DATA\r\n');
              } else {
                socket.end();
                reject(new Error(`RCPT TO failed: ${response}`));
              }
              break;

            case 'DATA':
              if (code === 354) {
                step = 'MESSAGE';
                socket.write(message);
              } else {
                socket.end();
                reject(new Error(`DATA failed: ${response}`));
              }
              break;

            case 'MESSAGE':
              socket.write('QUIT\r\n');
              socket.end();
              
              if (code === 250) {
                // Email inviata con successo!
                const emailRecord = {
                  id: emailId,
                  to,
                  from: fromAddress,
                  subject,
                  sentAt: new Date(),
                  status: 'sent',
                  provider: 'real_smtp'
                };
                
                this.sentEmails.push(emailRecord);
                
                resolve({
                  success: true,
                  emailId,
                  message: 'Email REALE inviata con successo!',
                  details: {
                    to,
                    subject,
                    sentAt: emailRecord.sentAt,
                    messageId
                  }
                });
              } else {
                reject(new Error(`Invio fallito: ${response}`));
              }
              break;
          }
        });

        // Inizia sequenza SMTP
        socket.write(`MAIL FROM:<${fromAddress}>\r\n`);
      });

    } catch (error) {
      throw new Error(`Errore invio email: ${error.message}`);
    }
  }

  // Validazione email
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email richiesta' };
    }

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Formato email non valido' };
    }

    const [localPart, domain] = email.split('@');
    
    if (localPart.length > 64) {
      return { valid: false, error: 'Parte locale troppo lunga' };
    }

    if (domain.length > 253) {
      return { valid: false, error: 'Dominio troppo lungo' };
    }

    return { valid: true, email: email.toLowerCase() };
  }

  // Test connessione SMTP
  async testSMTPConnection() {
    if (!this.smtpConfig) {
      throw new Error('SMTP non configurato');
    }

    try {
      const { socket, authenticated } = await this.connectSMTP();
      socket.write('QUIT\r\n');
      socket.end();
      
      return {
        success: true,
        authenticated,
        message: 'Connessione SMTP testata con successo',
        config: {
          host: this.smtpConfig.host,
          port: this.smtpConfig.port,
          user: this.smtpConfig.auth.user
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Test connessione fallito: ${error.message}`,
        error: error.message
      };
    }
  }

  // Template email (stesso di prima)
  createTemplate(name, template) {
    if (!name || !template) {
      throw new Error('Nome e template richiesti');
    }

    this.templates.set(name, {
      ...template,
      createdAt: new Date()
    });

    return {
      success: true,
      template: name,
      message: `Template ${name} creato`
    };
  }

  renderTemplate(templateName, variables = {}) {
    if (!this.templates.has(templateName)) {
      throw new Error(`Template ${templateName} non trovato`);
    }

    const template = this.templates.get(templateName);
    let renderedSubject = template.subject || '';
    let renderedHtmlBody = template.htmlBody || '';
    let renderedTextBody = template.textBody || '';

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedSubject = renderedSubject.replace(placeholder, value);
      renderedHtmlBody = renderedHtmlBody.replace(placeholder, value);
      renderedTextBody = renderedTextBody.replace(placeholder, value);
    });

    return {
      subject: renderedSubject,
      htmlBody: renderedHtmlBody,
      textBody: renderedTextBody
    };
  }

  // Statistiche email REALI
  getEmailStats() {
    const total = this.sentEmails.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEmails = this.sentEmails.filter(email => 
      new Date(email.sentAt) >= today
    ).length;

    const successful = this.sentEmails.filter(email => 
      email.status === 'sent'
    ).length;

    return {
      total,
      today: todayEmails,
      successful,
      failed: total - successful,
      templates: this.templates.size,
      lastSent: this.sentEmails.length > 0 ? 
        this.sentEmails[this.sentEmails.length - 1].sentAt : null,
      isConfigured: !!this.smtpConfig
    };
  }

  // Lista email inviate
  getEmailHistory(limit = 50) {
    return this.sentEmails
      .slice(-limit)
      .map(email => ({
        id: email.id,
        to: email.to,
        from: email.from,
        subject: email.subject,
        sentAt: email.sentAt,
        status: email.status
      }));
  }

  // Provider preconfigurati
  getPresetProviders() {
    return {
      gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        description: 'Gmail SMTP (require App Password)'
      },
      outlook: {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        description: 'Outlook/Hotmail SMTP'
      },
      yahoo: {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        description: 'Yahoo Mail SMTP'
      }
    };
  }
}

export { RealEmailTools };