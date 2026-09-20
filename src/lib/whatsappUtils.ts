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
  openBrowserTabs?: boolean;
  onProgress?: (completed: number, total: number, latestResult: DispatchResult) => void;
}

export interface TestMessageResult {
  success: boolean;
  message: string;
  statusCode?: number;
  details?: any;
}

/**
 * Sends a single test WhatsApp notification to verify Meta Cloud API or Webhook Gateway connectivity.
 */
export async function sendTestWhatsAppMessage(
  targetPhone: string,
  testText: string,
  options: {
    dispatchMode?: 'direct_batch' | 'meta_cloud_api' | 'webhook';
    defaultCountryCode?: string;
    metaPhoneNumberId?: string;
    metaAccessToken?: string;
    webhookUrl?: string;
    webhookAuthKey?: string;
  }
): Promise<TestMessageResult> {
  const defaultCountryCode = options.defaultCountryCode || '91';
  const normalizedPhone = formatWhatsAppNumber(targetPhone, defaultCountryCode);

  if (!normalizedPhone || !isValidWhatsAppPhone(targetPhone)) {
    return {
      success: false,
      message: 'Invalid phone number format. Please enter a valid 10-digit mobile number.'
    };
  }

  if (options.dispatchMode === 'meta_cloud_api') {
    if (!options.metaPhoneNumberId || !options.metaAccessToken) {
      return {
        success: false,
        message: 'Missing Meta Phone Number ID or Access Token. Please provide credentials in the settings.'
      };
    }

    try {
      const authHeader = options.metaAccessToken.startsWith('Bearer ')
        ? options.metaAccessToken
        : `Bearer ${options.metaAccessToken}`;

      const resp = await fetch(`https://graph.facebook.com/v19.0/${options.metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: testText }
        })
      });

      const responseText = await resp.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // non-json response
      }

      if (!resp.ok) {
        const errorMsg = responseJson?.error?.message || responseText || `HTTP ${resp.status}`;
        return {
          success: false,
          statusCode: resp.status,
          message: `Meta API Error (${resp.status}): ${errorMsg}`,
          details: responseJson || responseText
        };
      }

      const msgId = responseJson?.messages?.[0]?.id || 'OK';
      return {
        success: true,
        statusCode: resp.status,
        message: `Test message successfully accepted by Meta Cloud API! Message ID: ${msgId}`,
        details: responseJson
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Network or CORS error connecting to Meta Graph API: ${err.message || 'Failed to fetch'}`
      };
    }
  }

  if (options.dispatchMode === 'webhook') {
    if (!options.webhookUrl) {
      return {
        success: false,
        message: 'Missing Webhook Endpoint URL. Please configure the URL.'
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (options.webhookAuthKey) {
        headers['Authorization'] = options.webhookAuthKey;
      }

      const resp = await fetch(options.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'whatsapp_test',
          to: normalizedPhone,
          message: testText,
          timestamp: new Date().toISOString()
        })
      });

      const responseText = await resp.text();
      if (!resp.ok) {
        return {
          success: false,
          statusCode: resp.status,
          message: `Webhook Gateway returned HTTP ${resp.status}: ${responseText.slice(0, 150)}`
        };
      }

      return {
        success: true,
        statusCode: resp.status,
        message: `Webhook Gateway accepted test message (HTTP ${resp.status})!`,
        details: responseText
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to reach Webhook Gateway: ${err.message}. Verify the URL and CORS headers.`
      };
    }
  }

  // Direct WhatsApp Web
  const link = createWhatsAppLink(normalizedPhone, testText, defaultCountryCode);
  return {
    success: true,
    message: 'Direct WhatsApp link generated.',
    details: { link }
  };
}

/**
 * Dispatches bulk WhatsApp messages in parallel asynchronous batches.
 * Handles Meta Cloud API, Webhook Gateway, or real browser batch opening.
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

        // 1. Handle Meta WhatsApp Cloud API
        if (options.dispatchMode === 'meta_cloud_api') {
          if (!options.metaPhoneNumberId || !options.metaAccessToken) {
            const res: DispatchResult = {
              studentId: item.studentId,
              studentName: item.studentName,
              className: item.className,
              roll: item.roll,
              phone: normalizedPhone,
              status: 'failed',
              errorMessage: 'Meta Cloud API credentials missing (Phone Number ID or Access Token)',
              timestamp,
              messageText: item.message
            };
            results.push(res);
            completed++;
            options.onProgress?.(completed, total, res);
            return;
          }

          try {
            const authHeader = options.metaAccessToken.startsWith('Bearer ')
              ? options.metaAccessToken
              : `Bearer ${options.metaAccessToken}`;

            const resp = await fetch(`https://graph.facebook.com/v19.0/${options.metaPhoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: normalizedPhone,
                type: 'text',
                text: { body: item.message }
              })
            });

            const respText = await resp.text();
            let respJson: any = null;
            try {
              respJson = JSON.parse(respText);
            } catch {
              // non-json
            }

            if (!resp.ok) {
              const detailedError = respJson?.error?.message || respText || `HTTP ${resp.status}`;
              throw new Error(`Meta API error (${resp.status}): ${detailedError}`);
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
        // 2. Handle Webhook Gateway
        else if (options.dispatchMode === 'webhook') {
          if (!options.webhookUrl) {
            const res: DispatchResult = {
              studentId: item.studentId,
              studentName: item.studentName,
              className: item.className,
              roll: item.roll,
              phone: normalizedPhone,
              status: 'failed',
              errorMessage: 'Webhook Gateway URL is missing',
              timestamp,
              messageText: item.message
            };
            results.push(res);
            completed++;
            options.onProgress?.(completed, total, res);
            return;
          }

          try {
            const headers: Record<string, string> = {
              'Content-Type': 'application/json'
            };
            if (options.webhookAuthKey) {
              headers['Authorization'] = options.webhookAuthKey;
            }

            const resp = await fetch(options.webhookUrl, {
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

            if (!resp.ok) {
              const errBody = await resp.text();
              throw new Error(`Webhook error (${resp.status}): ${errBody.slice(0, 100)}`);
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
              errorMessage: err.message || 'Webhook gateway delivery failed',
              timestamp,
              messageText: item.message
            };
            results.push(res);
          }
        }
        // 3. Direct Browser Dispatch Mode (Requires opening WhatsApp Web or Step-by-Step Queue)
        else {
          if (options.openBrowserTabs) {
            // Actually open WhatsApp Web link in browser tab
            const link = createWhatsAppLink(normalizedPhone, item.message, defaultCountryCode);
            if (link) {
              window.open(link, '_blank');
            }
            // Small pause between tabs to give browser window management time
            await new Promise((r) => setTimeout(r, 600));

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
          } else {
            // When no API is configured and no browser tabs are opened, do NOT mislead user by saying "sent"!
            const res: DispatchResult = {
              studentId: item.studentId,
              studentName: item.studentName,
              className: item.className,
              roll: item.roll,
              phone: normalizedPhone,
              status: 'failed',
              errorMessage: 'WhatsApp requires Meta Cloud API or Webhook Gateway for automatic background delivery. Please use the Step-by-Step WhatsApp Queue or configure an API.',
              timestamp,
              messageText: item.message
            };
            results.push(res);
          }
        }

        completed++;
        options.onProgress?.(completed, total, results[results.length - 1]);
      })
    );
  }

  return results;
}
