/**
 * iMazing Message Parser
 * Handles both CSV and PDF exports from iMazing
 * 
 * CSV Format: Structured columns with Type (Incoming/Outgoing), Text, dates, etc.
 * PDF Format: Timestamp-based with sender name line for incoming messages
 */

export interface ParsedMessage {
    id: string;
    timestamp: Date;
    sender: 'user' | 'coparent';
    senderName?: string;
    text: string;
    isEdited: boolean;
    editedAt?: Date;
    isReaction: boolean;
    replyingTo?: string;
    attachmentType?: 'Image' | 'Video' | 'Attachment' | null;
    attachmentName?: string;
    rawLine?: string; // For debugging
  }
  
  export interface ParseResult {
    success: boolean;
    messages: ParsedMessage[];
    metadata: {
      format: 'csv' | 'pdf';
      totalMessages: number;
      dateRange: { start: Date; end: Date } | null;
      coparentName: string;
      coparentPhone?: string;
      reactionsFiltered: number;
      attachmentsCount: number;
    };
    errors: string[];
    warnings: string[];
  }
  
  // ============================================
  // CSV PARSER
  // ============================================
  
  export function parseCSV(csvContent: string): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const messages: ParsedMessage[] = [];
    
    const lines = csvContent.split('\n');
    if (lines.length < 2) {
      return {
        success: false,
        messages: [],
        metadata: {
          format: 'csv',
          totalMessages: 0,
          dateRange: null,
          coparentName: '',
          reactionsFiltered: 0,
          attachmentsCount: 0
        },
        errors: ['CSV file appears to be empty or has no data rows'],
        warnings: []
      };
    }
  
    // Parse header row
    const headers = parseCSVRow(lines[0]);
    const columnMap = createColumnMap(headers);
    
    // Validate required columns
    const requiredColumns = ['Message Date', 'Type', 'Text'];
    const missingColumns = requiredColumns.filter(col => columnMap[col] === undefined);
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return {
        success: false,
        messages: [],
        metadata: {
          format: 'csv',
          totalMessages: 0,
          dateRange: null,
          coparentName: '',
          reactionsFiltered: 0,
          attachmentsCount: 0
        },
        errors,
        warnings: []
      };
    }
  
    let coparentName = '';
    let coparentPhone = '';
    let reactionsFiltered = 0;
    let attachmentsCount = 0;
  
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
  
      try {
        const columns = parseCSVRow(line);
        
        const messageDate = columns[columnMap['Message Date']];
        const type = columns[columnMap['Type']];
        const text = columns[columnMap['Text']] || '';
        const senderName = columns[columnMap['Sender Name']] || '';
        const senderId = columns[columnMap['Sender ID']] || '';
        const editedDate = columns[columnMap['Edited Date']] || '';
        const replyingTo = columns[columnMap['Replying to']] || '';
        const attachment = columns[columnMap['Attachment']] || '';
        const attachmentType = columns[columnMap['Attachment type']] || '';
  
        // Skip reactions (e.g., 'Liked "..."')
        if (text.startsWith('Liked "') || text.startsWith('Loved "') || 
            text.startsWith('Disliked "') || text.startsWith('Laughed at "') ||
            text.startsWith('Emphasized "') || text.startsWith('Questioned "')) {
          reactionsFiltered++;
          continue;
        }
  
        // Track coparent info from incoming messages
        if (type === 'Incoming' && senderName && !coparentName) {
          coparentName = senderName;
          coparentPhone = senderId;
        }
  
        // Count attachments
        if (attachment) {
          attachmentsCount++;
        }
  
        // Skip empty messages (unless they have attachments)
        if (!text && !attachment) {
          continue;
        }
  
        const timestamp = parseDate(messageDate);
        if (!timestamp) {
          warnings.push(`Row ${i + 1}: Could not parse date "${messageDate}"`);
          continue;
        }
  
        const message: ParsedMessage = {
          id: `csv-${i}-${timestamp.getTime()}`,
          timestamp,
          sender: type === 'Incoming' ? 'coparent' : 'user',
          senderName: type === 'Incoming' ? senderName : undefined,
          text: text,
          isEdited: !!editedDate,
          editedAt: editedDate ? parseDate(editedDate) ?? undefined : undefined,
          isReaction: false,
          replyingTo: replyingTo || undefined,
          attachmentType: attachmentType as any || null,
          attachmentName: attachment || undefined,
          rawLine: line
        };
  
        messages.push(message);
      } catch (err) {
        warnings.push(`Row ${i + 1}: Parse error - ${err}`);
      }
    }
  
    // Calculate date range
    let dateRange: { start: Date; end: Date } | null = null;
    if (messages.length > 0) {
      const sorted = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      dateRange = {
        start: sorted[0].timestamp,
        end: sorted[sorted.length - 1].timestamp
      };
    }
  
    return {
      success: true,
      messages,
      metadata: {
        format: 'csv',
        totalMessages: messages.length,
        dateRange,
        coparentName,
        coparentPhone,
        reactionsFiltered,
        attachmentsCount
      },
      errors,
      warnings
    };
  }
  
  // ============================================
  // PDF PARSER
  // ============================================
  
  export function parsePDF(pdfText: string): ParseResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const messages: ParsedMessage[] = [];
  
    // Clean up the text - remove page footers
    const cleanedText = pdfText
      .replace(/Messages - .+? \+\d+\s*Page \d+ of \d+/g, '')
      .replace(/\r\n/g, '\n');
  
    // Regex patterns for iMazing PDF format
    // Timestamp: MM/DD/YYYY h:mm:ss AM/PM
    const timestampRegex = /^(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))(?:\s+\(Edited\s+(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))\))?$/m;
    
    // Sender line: Name (+phone)
    const senderRegex = /^(.+?)\s+\(\+(\d+)\)$/;
  
    // Split into chunks by timestamp
    const chunks = cleanedText.split(/(?=\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM))/);
    
    let coparentName = '';
    let coparentPhone = '';
    let messageIndex = 0;
  
    for (const chunk of chunks) {
      const trimmedChunk = chunk.trim();
      if (!trimmedChunk) continue;
  
      const lines = trimmedChunk.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) continue;
  
      // First line should be timestamp (possibly with edited indicator)
      const timestampMatch = lines[0].match(timestampRegex);
      if (!timestampMatch) {
        continue; // Not a message start
      }
  
      const timestampStr = timestampMatch[1];
      const editedStr = timestampMatch[2];
      
      const timestamp = parsePDFDate(timestampStr);
      if (!timestamp) {
        warnings.push(`Could not parse timestamp: "${timestampStr}"`);
        continue;
      }
  
      const editedAt = editedStr ? parsePDFDate(editedStr) : undefined;
  
      // Check if second line is a sender (indicates incoming message)
      let sender: 'user' | 'coparent' = 'user';
      let senderName: string | undefined;
      let textStartIndex = 1;
  
      if (lines.length > 1) {
        const senderMatch = lines[1].match(senderRegex);
        if (senderMatch) {
          sender = 'coparent';
          senderName = senderMatch[1];
          if (!coparentName) {
            coparentName = senderMatch[1];
            coparentPhone = senderMatch[2];
          }
          textStartIndex = 2;
        }
      }
  
      // Remaining lines are the message text
      const text = lines.slice(textStartIndex).join('\n').trim();
      
      // Skip if no text
      if (!text) continue;
  
      // Skip reactions
      if (text.startsWith('Liked "') || text.startsWith('Loved "')) {
        continue;
      }
  
      const message: ParsedMessage = {
        id: `pdf-${messageIndex++}-${timestamp.getTime()}`,
        timestamp,
        sender,
        senderName,
        text,
        isEdited: !!editedAt,
        editedAt: editedAt ?? undefined,
        isReaction: false,
        rawLine: trimmedChunk
      };
  
      messages.push(message);
    }
  
    // Calculate date range
    let dateRange: { start: Date; end: Date } | null = null;
    if (messages.length > 0) {
      const sorted = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      dateRange = {
        start: sorted[0].timestamp,
        end: sorted[sorted.length - 1].timestamp
      };
    }
  
    return {
      success: messages.length > 0,
      messages,
      metadata: {
        format: 'pdf',
        totalMessages: messages.length,
        dateRange,
        coparentName,
        coparentPhone,
        reactionsFiltered: 0,
        attachmentsCount: 0
      },
      errors,
      warnings
    };
  }
  
  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  function parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];
      
      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    
    return result;
  }
  
  function createColumnMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    headers.forEach((header, index) => {
      map[header.trim()] = index;
    });
    return map;
  }
  
  function parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    // Format: 2024-07-10 11:55:01
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      return new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5]),
        parseInt(match[6])
      );
    }
    
    return null;
  }
  
  function parsePDFDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    // Format: 11/15/2025 6:38:02 AM
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[4]);
      const isPM = match[7].toUpperCase() === 'PM';
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      return new Date(
        parseInt(match[3]),
        parseInt(match[1]) - 1,
        parseInt(match[2]),
        hours,
        parseInt(match[5]),
        parseInt(match[6])
      );
    }
    
    return null;
  }
  
  // ============================================
  // FORMAT DETECTION & UNIFIED PARSER
  // ============================================
  
  export type FileFormat = 'csv' | 'pdf' | 'image' | 'unknown';
  
  export function detectFormat(filename: string, content?: string): FileFormat {
    const ext = filename.toLowerCase().split('.').pop();
    
    if (ext === 'csv') return 'csv';
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext || '')) return 'image';
    
    // Try to detect from content
    if (content) {
      if (content.includes('Chat Session,Message Date,')) return 'csv';
      if (content.includes('iMessage') && content.includes('Page')) return 'pdf';
    }
    
    return 'unknown';
  }
  
  export interface CourtCoachingMessage {
    type: 'info' | 'warning' | 'suggestion';
    message: string;
    action?: string;
  }
  
  export function getCourtCoaching(format: FileFormat, messageCount: number): CourtCoachingMessage[] {
    const messages: CourtCoachingMessage[] = [];
    
    if (format === 'image') {
      messages.push({
        type: 'warning',
        message: 'Screenshots can be disputed in court as they\'re easy to manipulate.',
        action: 'For stronger evidence, export messages directly from iMazing as PDF.'
      });
      
      if (messageCount > 2) {
        messages.push({
          type: 'suggestion',
          message: 'You have multiple screenshots. Bulk PDF exports are more efficient and credible.',
          action: 'Would you like a quick guide on exporting from iMazing?'
        });
      }
    }
    
    if (format === 'csv') {
      messages.push({
        type: 'info',
        message: 'CSV format includes metadata (delivery times, read receipts) which strengthens evidence.'
      });
      
      messages.push({
        type: 'suggestion',
        message: 'For court exhibits, PDF format is preferred as it\'s harder to alter and easier to present.',
        action: 'We can generate a court-ready PDF from this CSV.'
      });
    }
    
    if (format === 'pdf') {
      messages.push({
        type: 'info',
        message: 'PDF is the preferred format for court. It preserves formatting and is difficult to alter.'
      });
    }
    
    return messages;
  }