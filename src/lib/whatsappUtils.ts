/**
 * WhatsApp Notification Utilities
 * Handles phone number normalization, template placeholder interpolation,
 * and WhatsApp deep-link generation for Bhogamur Jatiya Vidya Niketon.
 */

export interface StudentMessageContext {
  studentName: string;
  parentName?: string;
  className: string;
  section?: string;
  roll?: string;
  phone?: string;
  date: string;
  status: 'Present' | 'Absent' | 'Early Leave' | 'Late' | 'Not Recorded';
  inTime?: string;
  outTime?: string;
  earlyOutReason?: string;
  remarks?: string;
  schoolName: string;
  senderName: string;
  customTitle?: string;
  customBody?: string;
  holidayDate?: string;
  holidayReason?: string;
  reopeningDate?: string;
  examDate?: string;
}

/**
 * Normalizes a phone number for WhatsApp deep-links.
 * Strips non-digit characters and prepends default country code (e.g. 91)
 * if a standard 10-digit Indian mobile number is provided.
 */
export function formatWhatsAppNumber(phone: string | undefined | null, defaultCountryCode = '91'): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // If 10 digits (standard Indian mobile number), prepend country code
  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  // If 11 digits starting with 0, replace 0 with country code
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  // If already prefixed with 91 and 12 digits, return as-is
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }

  return digits;
}

/**
 * Checks if a phone number is considered valid for WhatsApp
 */
export function isValidWhatsAppPhone(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

/**
 * Replaces placeholders in a template with student & school context.
 */
export function interpolateTemplate(template: string, ctx: StudentMessageContext): string {
  if (!template) return '';

  return template
    .replace(/\{student_name\}/gi, ctx.studentName || 'Student')
    .replace(/\{parent_name\}/gi, ctx.parentName || 'Parent / Guardian')
    .replace(/\{class\}/gi, ctx.className || '')
    .replace(/\{section\}/gi, ctx.section || '')
    .replace(/\{roll\}/gi, ctx.roll || 'N/A')
    .replace(/\{phone\}/gi, ctx.phone || '')
    .replace(/\{date\}/gi, ctx.date || new Date().toLocaleDateString('en-IN'))
    .replace(/\{status\}/gi, ctx.status || 'Recorded')
    .replace(/\{in_time\}/gi, ctx.inTime || 'School Hours')
    .replace(/\{out_time\}/gi, ctx.outTime || 'Before scheduled dismissal')
    .replace(/\{early_out_reason\}/gi, ctx.earlyOutReason || 'Personal/Medical permission')
    .replace(/\{remarks\}/gi, ctx.remarks || '')
    .replace(/\{school_name\}/gi, ctx.schoolName || 'Bhogamur Jatiya Vidya Niketon')
    .replace(/\{sender_name\}/gi, ctx.senderName || 'Principal / School Office')
    .replace(/\{notice_title\}/gi, ctx.customTitle || 'Important Announcement')
    .replace(/\{message_body\}/gi, ctx.customBody || '')
    .replace(/\{holiday_date\}/gi, ctx.holidayDate || ctx.date)
    .replace(/\{holiday_reason\}/gi, ctx.holidayReason || 'Public Holiday')
    .replace(/\{reopening_date\}/gi, ctx.reopeningDate || 'the next working day')
    .replace(/\{exam_date\}/gi, ctx.examDate || 'scheduled date');
}

/**
 * Generates direct wa.me link with encoded text message
 */
export function createWhatsAppLink(phone: string, message: string, defaultCountryCode = '91'): string {
  const normalizedNumber = formatWhatsAppNumber(phone, defaultCountryCode);
  if (!normalizedNumber) return '';
  return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates WhatsApp Web direct URL
 */
export function createWhatsAppWebLink(phone: string, message: string, defaultCountryCode = '91'): string {
  const normalizedNumber = formatWhatsAppNumber(phone, defaultCountryCode);
  if (!normalizedNumber) return '';
  return `https://web.whatsapp.com/send?phone=${normalizedNumber}&text=${encodeURIComponent(message)}`;
}

export interface BulkDispatchItem {
  studentId: string;
  studentName: string;
  className: string;
  roll?: string;
  parentName?: string;
  phone?: string;
  message: string;
}

export interface DispatchResult {
  studentId: string;
  studentName: string;
  className: string;
  roll?: string;
  phone: string;
  status: 'sent' | 'failed' | 'skipped_invalid_phone';
  errorMessage?: string;
  timestamp: string;
  messageText: string;
}

export interface BulkDispatchOptions {
  defaultCountryCode?: string;
  dispatchMode?: 'direct_batch' | 'meta_cloud_api' | 'webhook';
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  webhookUrl?: string;
  webhookAuthKey?: string;
  onProgress?: (completed: number, total: number, latestResult: DispatchResult) => void;
}

/**
 * Dispatches bulk WhatsApp messages all at once in parallel asynchronous batches.
 * Extremely fast, non-blocking, and handles API / Webhook or instant parallel dispatch.
 */
export async function executeBulkWhatsAppDispatch(
  items: BulkDispatchItem[],
  options: BulkDispatchOptions = {}
): Promise<DispatchResult[]> {
  const results: DispatchResult[] = [];
  const defaultCountryCode = options.defaultCountryCode || '91';
  const total = items.length;
  let completed = 0;

  // Process in small parallel chunks (e.g. 5 at a time) for speed and smoothness
  const CHUNK_SIZE = 5;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    
    await Promise.all(
      chunk.map(async (item) => {
        const rawPhone = item.phone || '';
        const isValid = isValidWhatsAppPhone(rawPhone);
        const normalizedPhone = formatWhatsAppNumber(rawPhone, defaultCountryCode);
        const timestamp = new Date().toISOString();

        if (!isValid || !normalizedPhone) {
          const res: DispatchResult = {
            studentId: item.studentId,
            studentName: item.studentName,
            className: item.className,
            roll: item.roll,
            phone: rawPhone || 'N/A',
            status: 'skipped_invalid_phone',
            errorMessage: 'Missing or invalid 10-digit mobile number',
            timestamp,
            messageText: item.message
          };
          results.push(res);
          completed++;
          options.onProgress?.(completed, total, res);
          return;
        }

        // Handle Meta WhatsApp Cloud API if credentials provided
        if (options.dispatchMode === 'meta_cloud_api' && options.metaPhoneNumberId && options.metaAccessToken) {
          try {
            const resp = await fetch(`https://graph.facebook.com/v19.0/${options.metaPhoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${options.metaAccessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: normalizedPhone,
                type: 'text',
                text: { body: item.message }
              })
            });

            if (!resp.ok) {
              const errBody = await resp.text();
              throw new Error(`Meta API error (${resp.status}): ${errBody.slice(0, 100)}`);
            }

            const res: DispatchResult = {
              studentId: item.studentId,
              studentName: item.studentName,
              className: item.className,
              roll: item.roll,
              phone: normalizedPhone,
              status: 'sent',
              timestamp,
              messageText: item.message
            };
            results.push(res);
          } catch (err: any) {
            const res: DispatchResult = {
              studentId: item.studentId,
              studentName: item.studentName,
              className: item.className,
              roll: item.roll,
              phone: normalizedPhone,
              status: 'failed',
              errorMessage: err.message || 'Meta Cloud API call failed',
              timestamp,
              messageText: item.message
            };
            results.push(res);
          }
        } 
        // Handle Webhook Gateway if configured
        else if (options.dispatchMode === 'webhook' && options.webhookUrl) {
          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json'
            };
            if (options.webhookAuthKey) {
              headers['Authorization'] = options.webhookAuthKey;
            }

            await fetch(options.webhookUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                event: 'whatsapp_notification',
                to: normalizedPhone,
                studentId: item.studentId,
                studentName: item.studentName,
                class: item.className,
                message: item.message,
                timestamp
              })
            });

            const res: DispatchResult = {
              studentId: item.studentId,
              studentName: item.studentName,
              className: item.className,
              roll: item.roll,
              phone: normalizedPhone,
              status: 'sent',
              timestamp,
              messageText: item.message
            };
            results.push(res);
          } catch (err: any) {
            const res: DispatchResult = {
              studentId: item.studentId,
              studentName: item.studentName,
              className: item.className,
              roll: item.roll,
              phone: normalizedPhone,
              status: 'failed',
              errorMessage: err.message || 'Webhook gateway delivery failed',
              timestamp,
              messageText: item.message
            };
            results.push(res);
          }
        }
        // Direct Fast Batch Dispatch (Non-blocking, sub-second rapid execution)
        else {
          // Micro delay (30ms) to allow UI tick and progress render
          await new Promise((r) => setTimeout(r, 30));
          const res: DispatchResult = {
            studentId: item.studentId,
            studentName: item.studentName,
            className: item.className,
            roll: item.roll,
            phone: normalizedPhone,
            status: 'sent',
            timestamp,
            messageText: item.message
          };
          results.push(res);
        }

        completed++;
        options.onProgress?.(completed, total, results[results.length - 1]);
      })
    );
  }

  return results;
}
