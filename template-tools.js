// Template engine tools per generazione dinamica
class TemplateTools {
  constructor() {
    this.templates = new Map();
    this.partials = new Map();
    this.helpers = new Map();
    this.setupDefaultHelpers();
  }

  setupDefaultHelpers() {
    // Helper per condizioni
    this.helpers.set('if', (condition, options) => {
      return condition ? options.fn(this) : options.inverse(this);
    });

    this.helpers.set('unless', (condition, options) => {
      return !condition ? options.fn(this) : options.inverse(this);
    });

    // Helper per loops
    this.helpers.set('each', (array, options) => {
      if (!Array.isArray(array)) return '';
      return array.map((item, index) => {
        return options.fn({ ...item, '@index': index, '@first': index === 0, '@last': index === array.length - 1 });
      }).join('');
    });

    // Helper per formattazione
    this.helpers.set('upper', (str) => String(str).toUpperCase());
    this.helpers.set('lower', (str) => String(str).toLowerCase());
    this.helpers.set('capitalize', (str) => String(str).charAt(0).toUpperCase() + String(str).slice(1));
    
    // Helper per date
    this.helpers.set('date', (date, format = 'YYYY-MM-DD') => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      
      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes);
    });

    // Helper per numeri
    this.helpers.set('currency', (amount, symbol = '€') => {
      return `${symbol}${Number(amount).toFixed(2)}`;
    });

    this.helpers.set('number', (num, decimals = 0) => {
      return Number(num).toFixed(decimals);
    });

    // Helper per stringhe
    this.helpers.set('truncate', (str, length = 50) => {
      return String(str).length > length ? String(str).slice(0, length) + '...' : String(str);
    });

    this.helpers.set('join', (array, separator = ', ') => {
      return Array.isArray(array) ? array.join(separator) : String(array);
    });

    // Helper per comparazioni
    this.helpers.set('eq', (a, b) => a === b);
    this.helpers.set('ne', (a, b) => a !== b);
    this.helpers.set('gt', (a, b) => a > b);
    this.helpers.set('lt', (a, b) => a < b);
    this.helpers.set('gte', (a, b) => a >= b);
    this.helpers.set('lte', (a, b) => a <= b);
  }

  // Registra template
  registerTemplate(name, content) {
    if (!name || !content) {
      throw new Error('Nome e contenuto template richiesti');
    }

    this.templates.set(name, {
      content,
      compiled: this.compile(content),
      createdAt: new Date()
    });

    return {
      success: true,
      template: name,
      message: `Template ${name} registrato`
    };
  }

  // Registra partial
  registerPartial(name, content) {
    if (!name || !content) {
      throw new Error('Nome e contenuto partial richiesti');
    }

    this.partials.set(name, {
      content,
      compiled: this.compile(content),
      createdAt: new Date()
    });

    return {
      success: true,
      partial: name,
      message: `Partial ${name} registrato`
    };
  }

  // Registra helper personalizzato
  registerHelper(name, fn) {
    if (!name || typeof fn !== 'function') {
      throw new Error('Nome e funzione helper richiesti');
    }

    this.helpers.set(name, fn);

    return {
      success: true,
      helper: name,
      message: `Helper ${name} registrato`
    };
  }

  // Compila template
  compile(template) {
    if (!template || typeof template !== 'string') {
      throw new Error('Template string richiesto');
    }

    // Pattern per diversi tipi di placeholder
    const patterns = {
      // {{variable}}
      variable: /\{\{([^{}#\/!>]+?)\}\}/g,
      // {{#if condition}}...{{/if}}
      block: /\{\{#(\w+)\s*([^}]*?)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      // {{#if condition}}...{{else}}...{{/if}}
      blockWithElse: /\{\{#(\w+)\s*([^}]*?)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/\1\}\}/g,
      // {{>partial}}
      partial: /\{\{>\s*(\w+)\s*\}\}/g,
      // {{!comment}}
      comment: /\{\{![^}]*\}\}/g
    };

    return (data = {}) => {
      let result = template;

      // Rimuovi commenti
      result = result.replace(patterns.comment, '');

      // Sostituisci partials
      result = result.replace(patterns.partial, (match, partialName) => {
        const partial = this.partials.get(partialName);
        if (partial) {
          return partial.compiled(data);
        }
        return `<!-- Partial ${partialName} not found -->`;
      });

      // Gestisci blocchi con else
      result = result.replace(patterns.blockWithElse, (match, helperName, args, ifContent, elseContent) => {
        const helper = this.helpers.get(helperName);
        if (helper) {
          const condition = this.evaluateExpression(args.trim(), data);
          const options = {
            fn: (context) => this.compile(ifContent)(context || data),
            inverse: (context) => this.compile(elseContent)(context || data)
          };
          return helper(condition, options);
        }
        return match;
      });

      // Gestisci blocchi semplici
      result = result.replace(patterns.block, (match, helperName, args, content) => {
        const helper = this.helpers.get(helperName);
        if (helper) {
          const arg = this.evaluateExpression(args.trim(), data);
          const options = {
            fn: (context) => this.compile(content)(context || data),
            inverse: () => ''
          };
          return helper(arg, options);
        }
        return match;
      });

      // Sostituisci variabili
      result = result.replace(patterns.variable, (match, expression) => {
        const value = this.evaluateExpression(expression.trim(), data);
        return value !== undefined && value !== null ? String(value) : '';
      });

      return result;
    };
  }

  // Valuta espressione
  evaluateExpression(expression, data) {
    // Se è una stringa quotata, restituisci il valore
    if ((expression.startsWith('"') && expression.endsWith('"')) || 
        (expression.startsWith("'") && expression.endsWith("'"))) {
      return expression.slice(1, -1);
    }

    // Se è un numero
    if (/^\d+(\.\d+)?$/.test(expression)) {
      return parseFloat(expression);
    }

    // Se è un booleano
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    if (expression === 'null') return null;
    if (expression === 'undefined') return undefined;

    // Controlla se è un helper con argomenti
    const helperMatch = expression.match(/^(\w+)\s+(.+)$/);
    if (helperMatch) {
      const [, helperName, argsStr] = helperMatch;
      const helper = this.helpers.get(helperName);
      if (helper) {
        const args = this.parseArguments(argsStr, data);
        return helper(...args);
      }
    }

    // Naviga nell'oggetto dati usando dot notation
    const path = expression.split('.');
    let current = data;

    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  // Parse argomenti per helpers
  parseArguments(argsStr, data) {
    const args = [];
    const parts = argsStr.split(/\s+/);

    for (const part of parts) {
      args.push(this.evaluateExpression(part, data));
    }

    return args;
  }

  // Renderizza template
  render(templateName, data = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} non trovato`);
    }

    try {
      return template.compiled(data);
    } catch (error) {
      throw new Error(`Errore rendering template ${templateName}: ${error.message}`);
    }
  }

  // Renderizza string template diretto
  renderString(templateString, data = {}) {
    if (!templateString) {
      throw new Error('Template string richiesto');
    }

    try {
      const compiled = this.compile(templateString);
      return compiled(data);
    } catch (error) {
      throw new Error(`Errore rendering template: ${error.message}`);
    }
  }

  // Lista templates
  listTemplates() {
    return Array.from(this.templates.entries()).map(([name, template]) => ({
      name,
      createdAt: template.createdAt,
      preview: template.content.slice(0, 100) + (template.content.length > 100 ? '...' : '')
    }));
  }

  // Lista partials
  listPartials() {
    return Array.from(this.partials.entries()).map(([name, partial]) => ({
      name,
      createdAt: partial.createdAt,
      preview: partial.content.slice(0, 100) + (partial.content.length > 100 ? '...' : '')
    }));
  }

  // Lista helpers
  listHelpers() {
    return Array.from(this.helpers.keys());
  }

  // Template predefiniti utili
  createEmailTemplate() {
    const emailTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{title}}</h1>
            {{#if subtitle}}<p>{{subtitle}}</p>{{/if}}
        </div>
        
        <div class="content">
            {{#if greeting}}
            <p>{{greeting}} {{user.name}},</p>
            {{/if}}
            
            {{{content}}}
            
            {{#if signature}}
            <p>{{signature}}</p>
            {{/if}}
        </div>
        
        <div class="footer">
            <p>&copy; {{date "YYYY"}} {{company}}. Tutti i diritti riservati.</p>
            {{#if unsubscribe}}
            <p><a href="{{unsubscribe}}">Annulla iscrizione</a></p>
            {{/if}}
        </div>
    </div>
</body>
</html>`;

    this.registerTemplate('email', emailTemplate);
    return { success: true, template: 'email' };
  }

  createReportTemplate() {
    const reportTemplate = `# {{title}}

**Data:** {{date created "DD/MM/YYYY"}}
**Autore:** {{author}}

## Sommario Esecutivo

{{summary}}

## Dati

{{#each sections}}
### {{title}}

{{description}}

{{#if data}}
{{#each data}}
- **{{name}}:** {{value}} {{#if unit}}({{unit}}){{/if}}
{{/each}}
{{/if}}

{{/each}}

## Conclusioni

{{conclusion}}

---
*Report generato automaticamente il {{date "DD/MM/YYYY HH:mm"}}*`;

    this.registerTemplate('report', reportTemplate);
    return { success: true, template: 'report' };
  }

  createInvoiceTemplate() {
    const invoiceTemplate = `# FATTURA N. {{invoice.number}}

**Data:** {{date invoice.date "DD/MM/YYYY"}}
**Scadenza:** {{date invoice.dueDate "DD/MM/YYYY"}}

## Fattura a:
{{customer.name}}
{{customer.address}}
{{customer.city}}, {{customer.zip}}

## Dettagli:

| Descrizione | Quantità | Prezzo | Totale |
|-------------|----------|--------|--------|
{{#each items}}
| {{description}} | {{quantity}} | {{currency price}} | {{currency total}} |
{{/each}}

**Subtotale:** {{currency subtotal}}
{{#if tax}}**IVA ({{tax.rate}}%):** {{currency tax.amount}}{{/if}}
**TOTALE:** {{currency total}}

{{#if notes}}
## Note:
{{notes}}
{{/if}}`;

    this.registerTemplate('invoice', invoiceTemplate);
    return { success: true, template: 'invoice' };
  }

  // Validazione template
  validateTemplate(templateString) {
    const errors = [];
    const warnings = [];

    try {
      // Controlla bilanciamento parentesi graffe
      const openBraces = (templateString.match(/\{\{/g) || []).length;
      const closeBraces = (templateString.match(/\}\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push('Parentesi graffe non bilanciate');
      }

      // Controlla blocchi aperti/chiusi
      const openBlocks = (templateString.match(/\{\{#\w+/g) || []).length;
      const closeBlocks = (templateString.match(/\{\{\/\w+/g) || []).length;
      
      if (openBlocks !== closeBlocks) {
        errors.push('Blocchi non bilanciati');
      }

      // Controlla helpers esistenti
      const helperMatches = templateString.match(/\{\{#(\w+)/g);
      if (helperMatches) {
        helperMatches.forEach(match => {
          const helperName = match.replace('{{#', '');
          if (!this.helpers.has(helperName)) {
            warnings.push(`Helper '${helperName}' non riconosciuto`);
          }
        });
      }

      // Controlla partials esistenti
      const partialMatches = templateString.match(/\{\{>\s*(\w+)/g);
      if (partialMatches) {
        partialMatches.forEach(match => {
          const partialName = match.replace(/\{\{>\s*/, '');
          if (!this.partials.has(partialName)) {
            warnings.push(`Partial '${partialName}' non trovato`);
          }
        });
      }

      // Tenta compilazione
      this.compile(templateString);

    } catch (error) {
      errors.push(`Errore compilazione: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export { TemplateTools };