// Email/SMTP tools per invio email
import https from 'https';
import http from 'http';
import crypto from 'crypto';

class EmailTools {
  constructor() {
    this.templates = new Map();
    this.emailQueue = [];
    this.sentEmails = [];
  }

  // Configurazione SMTP simulata (per testing)
  configureProvider(provider, config) {
    const providers = {
      gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requiresAuth: true
      },
      outlook: {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        requiresAuth: true
      },
      yahoo: {
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
        requiresAuth: true
      },
      custom: config
    };

    const providerConfig = providers[provider];
    if (!providerConfig) {
      throw new Error(`Provider non supportato: ${provider}`);
    }

    return {
      success: true,
      provider,
      config: providerConfig,
      message: `Provider ${provider} configurato`
    };
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

    // Controlli aggiuntivi
    const [localPart, domain] = email.split('@');
    
    if (localPart.length > 64) {
      return { valid: false, error: 'Parte locale troppo lunga' };
    }

    if (domain.length > 253) {
      return { valid: false, error: 'Dominio troppo lungo' };
    }

    return { valid: true, email: email.toLowerCase() };
  }

  // Creazione template email
  createTemplate(name, template) {
    if (!name || !template) {
      throw new Error('Nome e template richiesti');
    }

    const templateData = {
      name,
      subject: template.subject || '',
      htmlBody: template.htmlBody || '',
      textBody: template.textBody || '',
      variables: template.variables || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(name, templateData);

    return {
      success: true,
      template: name,
      message: `Template ${name} creato`
    };
  }

  // Rendering template con variabili
  renderTemplate(templateName, variables = {}) {
    if (!this.templates.has(templateName)) {
      throw new Error(`Template ${templateName} non trovato`);
    }

    const template = this.templates.get(templateName);
    let renderedSubject = template.subject;
    let renderedHtmlBody = template.htmlBody;
    let renderedTextBody = template.textBody;

    // Sostituisci variabili nel formato {{variabile}}
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedSubject = renderedSubject.replace(placeholder, value);
      renderedHtmlBody = renderedHtmlBody.replace(placeholder, value);
      renderedTextBody = renderedTextBody.replace(placeholder, value);
    });

    return {
      subject: renderedSubject,
      htmlBody: renderedHtmlBody,
      textBody: renderedTextBody,
      template: templateName,
      variables: variables
    };
  }

  // Invio email simulato (per testing senza SMTP reale)
  async sendEmail(emailData) {
    const { to, subject, htmlBody, textBody, from, cc, bcc, attachments } = emailData;

    // Validazione dati email
    if (!to || !subject || (!htmlBody && !textBody)) {
      throw new Error('Destinatario, soggetto e corpo email richiesti');
    }

    // Validazione email destinatario
    const toValidation = this.validateEmail(to);
    if (!toValidation.valid) {
      throw new Error(`Email destinatario non valida: ${toValidation.error}`);
    }

    // Validazione email mittente
    if (from) {
      const fromValidation = this.validateEmail(from);
      if (!fromValidation.valid) {
        throw new Error(`Email mittente non valida: ${fromValidation.error}`);
      }
    }

    // Simula invio email (in un caso reale qui ci sarebbe la logica SMTP)
    const emailId = crypto.randomUUID();
    const email = {
      id: emailId,
      to: toValidation.email,
      from: from || 'noreply@mcp-server.local',
      subject,
      htmlBody: htmlBody || '',
      textBody: textBody || htmlBody?.replace(/<[^>]*>/g, '') || '',
      cc: cc || [],
      bcc: bcc || [],
      attachments: attachments || [],
      sentAt: new Date(),
      status: 'sent',
      provider: 'simulated'
    };

    this.sentEmails.push(email);

    // Simula ritardo di invio
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      emailId,
      message: 'Email inviata con successo',
      details: {
        to: email.to,
        subject: email.subject,
        sentAt: email.sentAt
      }
    };
  }

  // Invio email con template
  async sendTemplateEmail(templateName, to, variables = {}, options = {}) {
    const rendered = this.renderTemplate(templateName, variables);

    const emailData = {
      to,
      subject: rendered.subject,
      htmlBody: rendered.htmlBody,
      textBody: rendered.textBody,
      ...options
    };

    return await this.sendEmail(emailData);
  }

  // Invio email bulk
  async sendBulkEmail(emails) {
    if (!Array.isArray(emails)) {
      throw new Error('Array di email richiesto');
    }

    const results = [];
    const errors = [];

    for (const emailData of emails) {
      try {
        const result = await this.sendEmail(emailData);
        results.push(result);
      } catch (error) {
        errors.push({
          email: emailData.to,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      sent: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  // Lista template
  listTemplates() {
    return Array.from(this.templates.entries()).map(([name, template]) => ({
      name,
      subject: template.subject,
      variables: template.variables,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  }

  // Storia email inviate
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

  // Statistiche email
  getEmailStats() {
    const total = this.sentEmails.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEmails = this.sentEmails.filter(email => 
      new Date(email.sentAt) >= today
    ).length;

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekEmails = this.sentEmails.filter(email => 
      new Date(email.sentAt) >= thisWeek
    ).length;

    return {
      total,
      today: todayEmails,
      thisWeek: weekEmails,
      templates: this.templates.size,
      queueSize: this.emailQueue.length
    };
  }

  // Newsletter builder semplificato
  createNewsletter(data) {
    const { title, articles, footer, unsubscribeLink } = data;

    if (!title || !articles || !Array.isArray(articles)) {
      throw new Error('Titolo e articoli richiesti per newsletter');
    }

    const articlesHtml = articles.map(article => `
      <div style="margin-bottom: 30px; padding: 20px; border-left: 4px solid #007bff;">
        <h3 style="color: #333; margin-top: 0;">${article.title}</h3>
        <p style="color: #666; line-height: 1.6;">${article.content}</p>
        ${article.link ? `<a href="${article.link}" style="color: #007bff; text-decoration: none;">Leggi di più →</a>` : ''}
      </div>
    `).join('');

    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <header style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #eee;">
        <h1 style="color: #007bff; margin: 0;">${title}</h1>
        <p style="color: #666; margin: 10px 0 0 0;">Newsletter - ${new Date().toLocaleDateString('it-IT')}</p>
      </header>
      
      <main>
        ${articlesHtml}
      </main>
      
      <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
        ${footer || 'Grazie per aver letto la nostra newsletter!'}
        ${unsubscribeLink ? `<br><br><a href="${unsubscribeLink}" style="color: #999;">Annulla iscrizione</a>` : ''}
      </footer>
    </body>
    </html>
    `;

    const textBody = `
${title}
Newsletter - ${new Date().toLocaleDateString('it-IT')}

${articles.map(article => `
${article.title}
${article.content}
${article.link ? `Leggi di più: ${article.link}` : ''}
`).join('\n---\n')}

${footer || 'Grazie per aver letto la nostra newsletter!'}
${unsubscribeLink ? `\nAnnulla iscrizione: ${unsubscribeLink}` : ''}
    `;

    return {
      subject: title,
      htmlBody,
      textBody,
      articlesCount: articles.length
    };
  }
}

export { EmailTools };