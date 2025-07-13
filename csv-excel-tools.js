// CSV/Excel tools per manipolazione dati
import fs from 'fs/promises';
import path from 'path';

class CSVExcelTools {
  constructor() {
    this.csvCache = new Map();
  }

  // Parse CSV
  parseCSV(csvContent, options = {}) {
    const {
      delimiter = ',',
      quote = '"',
      escape = '"',
      hasHeader = true,
      skipEmptyLines = true
    } = options;

    if (!csvContent || typeof csvContent !== 'string') {
      throw new Error('Contenuto CSV richiesto');
    }

    const lines = csvContent.split('\n');
    const result = [];
    let headers = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let rowIndex = 0;

    for (const line of lines) {
      if (skipEmptyLines && line.trim() === '') continue;

      currentField = '';
      inQuotes = false;
      currentRow = [];

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === quote) {
          if (inQuotes && nextChar === quote) {
            // Escaped quote
            currentField += quote;
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          // Field separator
          currentRow.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }

      // Add last field
      currentRow.push(currentField);

      if (rowIndex === 0 && hasHeader) {
        headers = currentRow;
      } else {
        if (hasHeader) {
          const rowObject = {};
          headers.forEach((header, index) => {
            rowObject[header] = currentRow[index] || '';
          });
          result.push(rowObject);
        } else {
          result.push(currentRow);
        }
      }

      rowIndex++;
    }

    return {
      data: result,
      headers: headers,
      rowCount: result.length,
      columnCount: headers.length || (result[0] ? result[0].length : 0)
    };
  }

  // Generate CSV
  generateCSV(data, options = {}) {
    const {
      delimiter = ',',
      quote = '"',
      includeHeaders = true,
      headers = null
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Array di dati richiesto');
    }

    let csvContent = '';
    let actualHeaders = headers;

    // Determina headers se non forniti
    if (!actualHeaders && typeof data[0] === 'object' && data[0] !== null) {
      actualHeaders = Object.keys(data[0]);
    }

    // Aggiungi headers se richiesto
    if (includeHeaders && actualHeaders) {
      csvContent += actualHeaders.map(header => this.escapeCSVField(header, delimiter, quote)).join(delimiter) + '\n';
    }

    // Aggiungi righe dati
    data.forEach(row => {
      let rowData = [];

      if (Array.isArray(row)) {
        rowData = row;
      } else if (typeof row === 'object' && row !== null) {
        rowData = actualHeaders ? actualHeaders.map(header => row[header] || '') : Object.values(row);
      } else {
        rowData = [row];
      }

      const csvRow = rowData.map(field => this.escapeCSVField(String(field || ''), delimiter, quote)).join(delimiter);
      csvContent += csvRow + '\n';
    });

    return csvContent.trim();
  }

  escapeCSVField(field, delimiter, quote) {
    if (field.includes(delimiter) || field.includes(quote) || field.includes('\n') || field.includes('\r')) {
      return quote + field.replace(new RegExp(quote, 'g'), quote + quote) + quote;
    }
    return field;
  }

  // Operazioni su CSV
  filterCSV(data, filterFunction) {
    if (!Array.isArray(data)) {
      throw new Error('Array di dati richiesto');
    }

    if (typeof filterFunction !== 'function') {
      throw new Error('Funzione di filtro richiesta');
    }

    return data.filter(filterFunction);
  }

  sortCSV(data, sortBy, direction = 'asc') {
    if (!Array.isArray(data)) {
      throw new Error('Array di dati richiesto');
    }

    return [...data].sort((a, b) => {
      let valueA = typeof a === 'object' ? a[sortBy] : a;
      let valueB = typeof b === 'object' ? b[sortBy] : b;

      // Converti in numeri se possibile
      const numA = parseFloat(valueA);
      const numB = parseFloat(valueB);
      if (!isNaN(numA) && !isNaN(numB)) {
        valueA = numA;
        valueB = numB;
      }

      if (direction === 'desc') {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      } else {
        return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
      }
    });
  }

  groupByCSV(data, groupByField) {
    if (!Array.isArray(data)) {
      throw new Error('Array di dati richiesto');
    }

    const groups = {};

    data.forEach(row => {
      const key = typeof row === 'object' ? row[groupByField] : row;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    return groups;
  }

  aggregateCSV(data, groupByField, aggregations) {
    if (!Array.isArray(data)) {
      throw new Error('Array di dati richiesto');
    }

    const groups = this.groupByCSV(data, groupByField);
    const result = [];

    Object.entries(groups).forEach(([key, groupData]) => {
      const aggregated = { [groupByField]: key };

      Object.entries(aggregations).forEach(([field, operation]) => {
        const values = groupData.map(row => parseFloat(row[field])).filter(val => !isNaN(val));

        switch (operation) {
          case 'sum':
            aggregated[`${field}_sum`] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggregated[`${field}_avg`] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'min':
            aggregated[`${field}_min`] = values.length > 0 ? Math.min(...values) : null;
            break;
          case 'max':
            aggregated[`${field}_max`] = values.length > 0 ? Math.max(...values) : null;
            break;
          case 'count':
            aggregated[`${field}_count`] = groupData.length;
            break;
        }
      });

      result.push(aggregated);
    });

    return result;
  }

  // Pivot table
  createPivotTable(data, rowField, columnField, valueField, aggregation = 'sum') {
    if (!Array.isArray(data)) {
      throw new Error('Array di dati richiesto');
    }

    const pivot = {};
    const columns = new Set();

    // Raccoglie tutti i valori unici per le colonne
    data.forEach(row => {
      columns.add(row[columnField]);
    });

    const sortedColumns = Array.from(columns).sort();

    // Crea struttura pivot
    data.forEach(row => {
      const rowKey = row[rowField];
      const colKey = row[columnField];
      const value = parseFloat(row[valueField]) || 0;

      if (!pivot[rowKey]) {
        pivot[rowKey] = {};
        sortedColumns.forEach(col => {
          pivot[rowKey][col] = [];
        });
      }

      pivot[rowKey][colKey].push(value);
    });

    // Applica aggregazione
    Object.keys(pivot).forEach(rowKey => {
      sortedColumns.forEach(colKey => {
        const values = pivot[rowKey][colKey];
        
        switch (aggregation) {
          case 'sum':
            pivot[rowKey][colKey] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            pivot[rowKey][colKey] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'count':
            pivot[rowKey][colKey] = values.length;
            break;
          case 'min':
            pivot[rowKey][colKey] = values.length > 0 ? Math.min(...values) : 0;
            break;
          case 'max':
            pivot[rowKey][colKey] = values.length > 0 ? Math.max(...values) : 0;
            break;
        }
      });
    });

    return {
      pivot,
      columns: sortedColumns,
      rows: Object.keys(pivot).sort()
    };
  }

  // Merge CSV data
  mergeCSV(data1, data2, joinField, joinType = 'inner') {
    if (!Array.isArray(data1) || !Array.isArray(data2)) {
      throw new Error('Due array di dati richiesti');
    }

    const result = [];
    const data2Map = new Map();

    // Crea mappa per data2
    data2.forEach(row => {
      const key = row[joinField];
      if (!data2Map.has(key)) {
        data2Map.set(key, []);
      }
      data2Map.get(key).push(row);
    });

    // Effettua join
    data1.forEach(row1 => {
      const key = row1[joinField];
      const matchingRows = data2Map.get(key) || [];

      if (matchingRows.length > 0) {
        matchingRows.forEach(row2 => {
          result.push({ ...row1, ...row2 });
        });
      } else if (joinType === 'left') {
        result.push({ ...row1 });
      }
    });

    // Per right join, aggiungi righe di data2 non matchate
    if (joinType === 'right') {
      data2.forEach(row2 => {
        const key = row2[joinField];
        const hasMatch = data1.some(row1 => row1[joinField] === key);
        if (!hasMatch) {
          result.push({ ...row2 });
        }
      });
    }

    return result;
  }

  // Statistiche descrittive
  getDescriptiveStats(data, numericFields) {
    if (!Array.isArray(data)) {
      throw new Error('Array di dati richiesto');
    }

    const stats = {};

    numericFields.forEach(field => {
      const values = data.map(row => parseFloat(row[field])).filter(val => !isNaN(val));
      
      if (values.length === 0) {
        stats[field] = null;
        return;
      }

      const sorted = values.sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;

      stats[field] = {
        count: values.length,
        sum: sum,
        mean: mean,
        median: sorted[Math.floor(sorted.length / 2)],
        min: Math.min(...values),
        max: Math.max(...values),
        variance: variance,
        standardDeviation: Math.sqrt(variance),
        q1: sorted[Math.floor(sorted.length * 0.25)],
        q3: sorted[Math.floor(sorted.length * 0.75)]
      };
    });

    return stats;
  }

  // Validazione dati
  validateData(data, schema) {
    if (!Array.isArray(data)) {
      throw new Error('Array di dati richiesto');
    }

    const errors = [];
    const warnings = [];

    data.forEach((row, index) => {
      Object.entries(schema).forEach(([field, rules]) => {
        const value = row[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push({
            row: index + 1,
            field,
            error: 'Campo richiesto mancante',
            value
          });
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rules.type === 'number') {
            const num = parseFloat(value);
            if (isNaN(num)) {
              errors.push({
                row: index + 1,
                field,
                error: 'Valore deve essere un numero',
                value
              });
            } else {
              if (rules.min !== undefined && num < rules.min) {
                errors.push({
                  row: index + 1,
                  field,
                  error: `Valore deve essere >= ${rules.min}`,
                  value
                });
              }
              if (rules.max !== undefined && num > rules.max) {
                errors.push({
                  row: index + 1,
                  field,
                  error: `Valore deve essere <= ${rules.max}`,
                  value
                });
              }
            }
          }

          if (rules.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push({
                row: index + 1,
                field,
                error: 'Formato email non valido',
                value
              });
            }
          }

          if (rules.enum && !rules.enum.includes(value)) {
            errors.push({
              row: index + 1,
              field,
              error: `Valore deve essere uno di: ${rules.enum.join(', ')}`,
              value
            });
          }

          if (rules.pattern) {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(value)) {
              errors.push({
                row: index + 1,
                field,
                error: 'Valore non corrisponde al pattern richiesto',
                value
              });
            }
          }
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      validRows: data.length - errors.length,
      totalRows: data.length
    };
  }

  // Pulizia dati
  cleanData(data, options = {}) {
    const {
      removeEmptyRows = true,
      trimWhitespace = true,
      removeEmptyFields = false,
      defaultValues = {}
    } = options;

    let cleaned = [...data];

    if (removeEmptyRows) {
      cleaned = cleaned.filter(row => {
        if (Array.isArray(row)) {
          return row.some(field => field !== '' && field !== null && field !== undefined);
        } else {
          return Object.values(row).some(field => field !== '' && field !== null && field !== undefined);
        }
      });
    }

    cleaned = cleaned.map(row => {
      const cleanedRow = {};

      Object.entries(row).forEach(([key, value]) => {
        let cleanedValue = value;

        if (trimWhitespace && typeof cleanedValue === 'string') {
          cleanedValue = cleanedValue.trim();
        }

        if (removeEmptyFields && (cleanedValue === '' || cleanedValue === null || cleanedValue === undefined)) {
          return; // Skip this field
        }

        if ((cleanedValue === '' || cleanedValue === null || cleanedValue === undefined) && defaultValues[key] !== undefined) {
          cleanedValue = defaultValues[key];
        }

        cleanedRow[key] = cleanedValue;
      });

      return cleanedRow;
    });

    return cleaned;
  }
}

export { CSVExcelTools };