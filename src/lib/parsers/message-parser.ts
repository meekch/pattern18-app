/**
 * Generic Message Parser
 * Handles CSV exports from common co-parenting apps:
 * - OurFamilyWizard
 * - TalkingParents
 * - AppClose
 * - WhatsApp exports
 * - Generic CSV with timestamp/sender/message columns
 */

export type FileFormat = 'csv' | 'unknown';

export interface ParsedMessage {
  id: string;
  timestamp: Date;
  sender: 'user' | 'coparent';
  senderName: string;
  text: string;
  isEdited?: boolean;
  editedAt?: Date;
  reactions?: string[];
}

export interface ParseResult {
  success: boolean;
  messages: ParsedMessage[];
  errors?: string[];
  metadata: {
    format: string;
    totalRows: number;
    parsedRows: number;
    coparentName?: string;
    userName?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export function detectFormat(filename: string): FileFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  return 'unknown';
}

/**
 * Parse CSV content from various messaging app exports
 */
export function parseCSV(content: string): ParseResult {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
  
  if (lines.length < 2) {
    return {
      success: false,
      messages: [],
      errors: ['File appears to be empty or has no data rows'],
      metadata: { format: 'unknown', totalRows: 0, parsedRows: 0 }
    };
  }

  // Detect format from headers
  const headerLine = lines[0].toLowerCase();
  const format = detectCSVFormat(headerLine);
  
  if (format === 'unknown') {
    return {
      success: false,
      messages: [],
      errors: ['Could not detect CSV format. Expected columns: date/timestamp, sender/from, message/text/body'],
      metadata: { format: 'unknown', totalRows: lines.length - 1, parsedRows: 0 }
    };
  }

  const messages: ParsedMessage[] = [];
  const errors: string[] = [];
  const senderCounts: Record<string, number> = {};

  // Parse each row
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVRow(lines[i]);
      const parsed = parseRowByFormat(row, format, lines[0]);
      
      if (parsed) {
        messages.push({
          ...parsed,
          id: `msg-${i}`
        });
        senderCounts[parsed.senderName] = (senderCounts[parsed.senderName] || 0) + 1;
      }
    } catch (err) {
      // Skip malformed rows silently unless there are many
      if (errors.length < 5) {
        errors.push(`Row ${i + 1}: Could not parse`);
      }
    }
  }

  if (messages.length === 0) {
    return {
      success: false,
      messages: [],
      errors: ['No valid messages found in file'],
      metadata: { format, totalRows: lines.length - 1, parsedRows: 0 }
    };
  }

  // Sort by timestamp
  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Determine who is user vs coparent (user typically sends fewer messages in abuse situations)
  const senders = Object.entries(senderCounts).sort((a, b) => b[1] - a[1]);
  const coparentName = senders[0]?.[0] || 'Co-parent';
  const userName = senders[1]?.[0] || 'You';

  // Assign sender roles
  messages.forEach(msg => {
    msg.sender = msg.senderName === coparentName ? 'coparent' : 'user';
  });

  return {
    success: true,
    messages,
    errors: errors.length > 0 ? errors : undefined,
    metadata: {
      format,
      totalRows: lines.length - 1,
      parsedRows: messages.length,
      coparentName,
      userName,
      dateRange: messages.length > 0 ? {
        start: messages[0].timestamp,
        end: messages[messages.length - 1].timestamp
      } : undefined
    }
  };
}

/**
 * Detect CSV format from header line
 */
function detectCSVFormat(headerLine: string): string {
  // OurFamilyWizard
  if (headerLine.includes('sent by') && headerLine.includes('message')) {
    return 'ofw';
  }
  // TalkingParents
  if (headerLine.includes('sender') && headerLine.includes('body')) {
    return 'talkingparents';
  }
  // AppClose
  if (headerLine.includes('from') && headerLine.includes('content')) {
    return 'appclose';
  }
  // WhatsApp export
  if (headerLine.includes('date') && headerLine.includes('message')) {
    return 'whatsapp';
  }
  // iMazing / generic
  if (headerLine.includes('date') || headerLine.includes('time') || headerLine.includes('timestamp')) {
    if (headerLine.includes('text') || headerLine.includes('message') || headerLine.includes('body')) {
      return 'generic';
    }
  }
  return 'unknown';
}

/**
 * Parse a CSV row handling quoted fields
 */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

/**
 * Parse row based on detected format
 */
function parseRowByFormat(row: string[], format: string, headerLine: string): Omit<ParsedMessage, 'id'> | null {
  const headers = parseCSVRow(headerLine).map(h => h.toLowerCase());
  
  const getCol = (names: string[]): string => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name));
      if (idx !== -1 && row[idx]) {
        return row[idx];
      }
    }
    return '';
  };

  let timestamp: Date;
  let senderName: string;
  let text: string;

  switch (format) {
    case 'ofw':
      timestamp = parseDate(getCol(['date', 'sent']));
      senderName = getCol(['sent by', 'sender', 'from']);
      text = getCol(['message', 'text', 'body']);
      break;
    
    case 'talkingparents':
      timestamp = parseDate(getCol(['date', 'time', 'sent']));
      senderName = getCol(['sender', 'from']);
      text = getCol(['body', 'message', 'text']);
      break;
    
    case 'appclose':
      timestamp = parseDate(getCol(['date', 'timestamp']));
      senderName = getCol(['from', 'sender']);
      text = getCol(['content', 'message', 'text']);
      break;
    
    case 'whatsapp':
      timestamp = parseDate(getCol(['date', 'time']));
      senderName = getCol(['sender', 'contact', 'from']);
      text = getCol(['message', 'text']);
      break;
    
    case 'generic':
    default:
      timestamp = parseDate(getCol(['date', 'time', 'timestamp', 'sent', 'datetime']));
      senderName = getCol(['sender', 'from', 'sent by', 'author', 'name']);
      text = getCol(['text', 'message', 'body', 'content']);
      break;
  }

  if (!timestamp || isNaN(timestamp.getTime()) || !text) {
    return null;
  }

  return {
    timestamp,
    senderName: senderName || 'Unknown',
    text: text.trim(),
    sender: 'coparent' // Will be reassigned later
  };
}

/**
 * Parse various date formats
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  
  // Try standard parsing first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try common formats
  // MM/DD/YYYY HH:MM
  const usFormat = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{2})/);
  if (usFormat) {
    const [, month, day, year, hour, min] = usFormat;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min));
  }
  
  // DD/MM/YYYY HH:MM
  const euFormat = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{2})/);
  if (euFormat) {
    const [, day, month, year, hour, min] = euFormat;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min));
  }
  
  // YYYY-MM-DD
  const isoFormat = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoFormat) {
    return new Date(dateStr);
  }
  
  return new Date(NaN);
}