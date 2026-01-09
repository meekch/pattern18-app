/**
 * Generic Message Parser
 * Handles CSV exports from common co-parenting apps:
 * - iMazing (iMessage export) - PRIORITY FORMAT
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

  // Parse header to get column indices
  const headerRow = parseCSVRow(lines[0]);
  const headers = headerRow.map(h => h.toLowerCase().trim());
  
  // Detect format from headers
  const format = detectCSVFormat(headers);
  
  if (format === 'unknown') {
    return {
      success: false,
      messages: [],
      errors: ['Could not detect CSV format. Expected columns: date/timestamp, sender/from/type, message/text/body'],
      metadata: { format: 'unknown', totalRows: lines.length - 1, parsedRows: 0 }
    };
  }

  const messages: ParsedMessage[] = [];
  const errors: string[] = [];
  const senderCounts: Record<string, number> = {};
  let coparentName = 'Co-parent';
  let userName = 'You';

  // Get column indices based on format
  const colMap = getColumnMap(headers, format);

  // Parse each row
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVRow(lines[i]);
      const parsed = parseRowWithMap(row, colMap, format);
      
      if (parsed && parsed.text) {
        // Skip reactions/likes unless they have meaningful content
        if (parsed.text.startsWith('Liked "') || parsed.text.startsWith('Loved "')) {
          continue;
        }
        
        messages.push({
          ...parsed,
          id: `msg-${i}`
        });
        
        // Track sender names for metadata
        if (parsed.senderName && parsed.senderName !== 'You' && parsed.senderName !== 'Unknown') {
          senderCounts[parsed.senderName] = (senderCounts[parsed.senderName] || 0) + 1;
        }
      }
    } catch (err) {
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

  // Get co-parent name from the most frequent sender name
  const topSender = Object.entries(senderCounts).sort((a, b) => b[1] - a[1])[0];
  if (topSender) {
    coparentName = topSender[0];
  }

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
 * Detect CSV format from headers array
 */
function detectCSVFormat(headers: string[]): string {
  const headerStr = headers.join(',');
  
  // iMazing (iMessage export) - has "type" with incoming/outgoing and "text" column
  // Headers: chat session, message date, delivered date, read date, edited date, service, type, sender id, sender name, status, replying to, subject, text, attachment, attachment type
  if (headers.includes('type') && headers.includes('text') && headers.includes('message date')) {
    return 'imazing';
  }
  
  // OurFamilyWizard
  if (headerStr.includes('sent by') && headerStr.includes('message')) {
    return 'ofw';
  }
  
  // TalkingParents
  if (headers.includes('sender') && headers.includes('body')) {
    return 'talkingparents';
  }
  
  // AppClose
  if (headers.includes('from') && headers.includes('content')) {
    return 'appclose';
  }
  
  // WhatsApp export
  if (headerStr.includes('date') && headers.includes('message')) {
    return 'whatsapp';
  }
  
  // Generic - has some date column and some text column
  const hasDate = headers.some(h => 
    h.includes('date') || h.includes('time') || h.includes('timestamp')
  );
  const hasText = headers.some(h => 
    h === 'text' || h === 'message' || h === 'body' || h === 'content'
  );
  
  if (hasDate && hasText) {
    return 'generic';
  }
  
  return 'unknown';
}

/**
 * Get column indices for each field based on format
 */
interface ColumnMap {
  timestamp: number;
  sender: number;
  senderName: number;
  text: number;
  type: number; // For iMazing: Incoming/Outgoing
  editedDate: number;
}

function getColumnMap(headers: string[], format: string): ColumnMap {
  const findCol = (names: string[], exact = false): number => {
    for (const name of names) {
      const idx = exact 
        ? headers.findIndex(h => h === name)
        : headers.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  switch (format) {
    case 'imazing':
      return {
        timestamp: findCol(['message date'], false),
        sender: findCol(['sender id'], false),
        senderName: findCol(['sender name'], false),
        text: findCol(['text'], true), // Exact match to avoid "attachment type"
        type: findCol(['type'], true), // Exact match - Incoming/Outgoing
        editedDate: findCol(['edited date'], false)
      };
    
    case 'ofw':
      return {
        timestamp: findCol(['date', 'sent']),
        sender: findCol(['sent by', 'sender', 'from']),
        senderName: findCol(['sent by', 'sender', 'from']),
        text: findCol(['message', 'text', 'body']),
        type: -1,
        editedDate: -1
      };
    
    case 'talkingparents':
      return {
        timestamp: findCol(['date', 'time', 'sent']),
        sender: findCol(['sender', 'from']),
        senderName: findCol(['sender', 'from']),
        text: findCol(['body', 'message', 'text']),
        type: -1,
        editedDate: -1
      };
    
    case 'appclose':
      return {
        timestamp: findCol(['date', 'timestamp']),
        sender: findCol(['from', 'sender']),
        senderName: findCol(['from', 'sender']),
        text: findCol(['content', 'message', 'text']),
        type: -1,
        editedDate: -1
      };
    
    case 'whatsapp':
      return {
        timestamp: findCol(['date', 'time']),
        sender: findCol(['sender', 'contact', 'from']),
        senderName: findCol(['sender', 'contact', 'from']),
        text: findCol(['message', 'text']),
        type: -1,
        editedDate: -1
      };
    
    default: // generic
      return {
        timestamp: findCol(['date', 'time', 'timestamp', 'sent', 'datetime']),
        sender: findCol(['sender', 'from', 'sent by', 'author', 'name']),
        senderName: findCol(['sender', 'from', 'sent by', 'author', 'name']),
        text: findCol(['text', 'message', 'body', 'content']),
        type: findCol(['type', 'direction']),
        editedDate: -1
      };
  }
}

/**
 * Parse row using column map
 */
function parseRowWithMap(row: string[], colMap: ColumnMap, format: string): Omit<ParsedMessage, 'id'> | null {
  const getValue = (idx: number): string => {
    if (idx === -1 || idx >= row.length) return '';
    return (row[idx] || '').trim();
  };

  const timestampStr = getValue(colMap.timestamp);
  const timestamp = parseDate(timestampStr);
  
  if (!timestamp || isNaN(timestamp.getTime())) {
    return null;
  }

  const text = getValue(colMap.text);
  if (!text) {
    return null;
  }

  let sender: 'user' | 'coparent' = 'coparent';
  let senderName = getValue(colMap.senderName) || 'Unknown';

  // For iMazing format, use Type column (Incoming = coparent, Outgoing = user)
  if (format === 'imazing' && colMap.type !== -1) {
    const typeValue = getValue(colMap.type).toLowerCase();
    if (typeValue === 'outgoing') {
      sender = 'user';
      senderName = 'You';
    } else if (typeValue === 'incoming') {
      sender = 'coparent';
      // senderName already set from Sender Name column
    }
  }

  // Check for edited
  const editedStr = getValue(colMap.editedDate);
  const isEdited = !!editedStr && editedStr.length > 0;
  const editedAt = isEdited ? parseDate(editedStr) : undefined;

  return {
    timestamp,
    sender,
    senderName,
    text,
    isEdited,
    editedAt: editedAt && !isNaN(editedAt.getTime()) ? editedAt : undefined
  };
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
 * Parse various date formats
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  
  // Clean the string
  dateStr = dateStr.trim().replace(/^["']|["']$/g, '');
  
  // Try standard parsing first (handles ISO format like "2024-07-10 11:55:01")
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try common formats
  // MM/DD/YYYY HH:MM:SS or MM/DD/YYYY HH:MM
  const usFormat = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (usFormat) {
    const [, month, day, year, hour, min, sec] = usFormat;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec || '0'));
  }
  
  // YYYY-MM-DD HH:MM:SS
  const isoLike = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s*(\d{2}):(\d{2}):(\d{2})/);
  if (isoLike) {
    const [, year, month, day, hour, min, sec] = isoLike;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec));
  }
  
  // YYYY-MM-DD
  const isoFormat = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoFormat) {
    return new Date(dateStr);
  }
  
  return new Date(NaN);
}