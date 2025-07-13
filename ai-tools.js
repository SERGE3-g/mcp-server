// AI/ML tools per operazioni intelligenti
import crypto from 'crypto';
import https from 'https';
import http from 'http';

class AITools {
  constructor() {
    this.textTemplates = new Map();
    this.sentimentCache = new Map();
  }

  // Sentiment Analysis semplificato
  analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Testo richiesto per sentiment analysis');
    }

    const cacheKey = crypto.createHash('md5').update(text).digest('hex');
    if (this.sentimentCache.has(cacheKey)) {
      return this.sentimentCache.get(cacheKey);
    }

    const positiveWords = [
      'ottimo', 'fantastico', 'eccellente', 'meraviglioso', 'perfetto',
      'grande', 'bello', 'buono', 'felice', 'contento', 'soddisfatto',
      'amazing', 'awesome', 'excellent', 'fantastic', 'great', 'good',
      'happy', 'love', 'wonderful', 'perfect', 'best', 'brilliant'
    ];

    const negativeWords = [
      'terribile', 'orribile', 'pessimo', 'brutto', 'cattivo', 'triste',
      'arrabbiato', 'deluso', 'odio', 'male', 'sbagliato', 'problema',
      'terrible', 'awful', 'bad', 'horrible', 'worst', 'hate', 'angry',
      'sad', 'disappointed', 'wrong', 'problem', 'issue', 'broken'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });

    let sentiment = 'neutral';
    let score = 0;

    if (positiveScore > negativeScore) {
      sentiment = 'positive';
      score = (positiveScore - negativeScore) / words.length;
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';
      score = (negativeScore - positiveScore) / words.length;
    }

    const result = {
      sentiment,
      score: Math.min(score, 1),
      confidence: Math.min((Math.abs(positiveScore - negativeScore) / words.length) * 2, 1),
      details: {
        positiveWords: positiveScore,
        negativeWords: negativeScore,
        totalWords: words.length
      }
    };

    this.sentimentCache.set(cacheKey, result);
    return result;
  }

  // Text summarization semplificata
  summarizeText(text, maxSentences = 3) {
    if (!text || typeof text !== 'string') {
      throw new Error('Testo richiesto per summarization');
    }

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= maxSentences) {
      return {
        summary: text.trim(),
        originalSentences: sentences.length,
        summarySentences: sentences.length,
        compressionRatio: 1
      };
    }

    // Calcola punteggio per ogni frase basato su frequenza parole
    const wordFreq = new Map();
    const allWords = text.toLowerCase().match(/\b\w+\b/g) || [];
    
    allWords.forEach(word => {
      if (word.length > 3) { // Ignora parole troppo corte
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    const sentenceScores = sentences.map(sentence => {
      const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
      const score = words.reduce((sum, word) => {
        return sum + (wordFreq.get(word) || 0);
      }, 0);
      return { sentence: sentence.trim(), score };
    });

    // Seleziona le frasi con punteggio più alto
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .map(item => item.sentence);

    return {
      summary: topSentences.join('. ') + '.',
      originalSentences: sentences.length,
      summarySentences: topSentences.length,
      compressionRatio: topSentences.length / sentences.length
    };
  }

  // Text classification semplificata
  classifyText(text, categories = ['tech', 'business', 'sports', 'entertainment', 'politics']) {
    if (!text || typeof text !== 'string') {
      throw new Error('Testo richiesto per classification');
    }

    const keywords = {
      tech: ['tecnologia', 'computer', 'software', 'app', 'digitale', 'internet', 'AI', 'intelligenza', 'technology', 'digital', 'programming'],
      business: ['business', 'azienda', 'mercato', 'vendite', 'profitto', 'economia', 'market', 'sales', 'profit', 'company', 'finance'],
      sports: ['sport', 'calcio', 'basket', 'tennis', 'olimpiadi', 'football', 'basketball', 'soccer', 'olympics', 'game', 'team'],
      entertainment: ['film', 'musica', 'attore', 'cantante', 'cinema', 'movie', 'music', 'actor', 'singer', 'entertainment', 'show'],
      politics: ['politica', 'governo', 'elezioni', 'presidente', 'politics', 'government', 'election', 'president', 'minister', 'vote']
    };

    const textLower = text.toLowerCase();
    const scores = {};

    categories.forEach(category => {
      const categoryKeywords = keywords[category] || [];
      const matches = categoryKeywords.filter(keyword => 
        textLower.includes(keyword.toLowerCase())
      );
      scores[category] = matches.length / categoryKeywords.length;
    });

    const bestCategory = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      category: bestCategory[0],
      confidence: bestCategory[1],
      scores: scores
    };
  }

  // Text enhancement
  enhanceText(text, options = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Testo richiesto per enhancement');
    }

    let enhanced = text;

    // Correzione capitalizzazione
    if (options.fixCapitalization !== false) {
      enhanced = enhanced.replace(/\b\w/g, l => l.toUpperCase());
      enhanced = enhanced.replace(/([.!?])\s*\w/g, match => match.toUpperCase());
    }

    // Rimozione spazi extra
    if (options.fixSpacing !== false) {
      enhanced = enhanced.replace(/\s+/g, ' ').trim();
      enhanced = enhanced.replace(/\s+([.!?])/g, '$1');
    }

    // Aggiunta punteggiatura mancante
    if (options.addPunctuation !== false) {
      if (!/[.!?]$/.test(enhanced.trim())) {
        enhanced += '.';
      }
    }

    return {
      original: text,
      enhanced: enhanced,
      changes: enhanced !== text,
      improvements: {
        capitalization: options.fixCapitalization !== false,
        spacing: options.fixSpacing !== false,
        punctuation: options.addPunctuation !== false
      }
    };
  }

  // Language detection semplificata
  detectLanguage(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Testo richiesto per language detection');
    }

    const patterns = {
      it: /\b(il|la|di|da|in|con|su|per|tra|fra|che|non|una|uno|dei|gli|alle|dalla|nella|della|della|questo|quella)\b/gi,
      en: /\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|two|way|who|boy|did|man|own|say|she|too|use)\b/gi,
      fr: /\b(le|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|plus|par|grand|en|être|et|à|il|avoir|ne|pas|pour|ce|sur|avec|que|son|dans|sa|du|au|aux)\b/gi,
      es: /\b(el|la|de|que|y|a|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|una|al|del|está|muy|todo|pero|más|hace|le|ya|puede|esto|sí|mi|solo|años|sobre|me|viene|fue|tiene|tanto|ser|ver)\b/gi,
      de: /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|noch|wie|einem)\b/gi
    };

    const scores = {};
    let totalMatches = 0;

    Object.entries(patterns).forEach(([lang, pattern]) => {
      const matches = (text.match(pattern) || []).length;
      scores[lang] = matches;
      totalMatches += matches;
    });

    if (totalMatches === 0) {
      return {
        language: 'unknown',
        confidence: 0,
        scores: scores
      };
    }

    const detectedLang = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      language: detectedLang[0],
      confidence: detectedLang[1] / totalMatches,
      scores: scores
    };
  }

  // Text similarity
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) {
      throw new Error('Due testi richiesti per similarity');
    }

    const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
    const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Levenshtein distance per similarità caratteri
    const levenshteinDistance = this.calculateLevenshtein(text1, text2);
    const maxLength = Math.max(text1.length, text2.length);
    const levenshteinSimilarity = 1 - (levenshteinDistance / maxLength);

    return {
      jaccardSimilarity,
      levenshteinSimilarity,
      averageSimilarity: (jaccardSimilarity + levenshteinSimilarity) / 2,
      details: {
        commonWords: intersection.size,
        totalUniqueWords: union.size,
        levenshteinDistance
      }
    };
  }

  calculateLevenshtein(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export { AITools };