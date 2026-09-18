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
