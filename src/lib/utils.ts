import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes any roll number string/number into clean serial integer format (1, 2, 3... 55, 56)
 * Removes non-digits, prefixes like 'Roll', and leading zeros.
 */
export function formatSerialRoll(rawRoll?: string | number | null): string {
  if (rawRoll === undefined || rawRoll === null) return '';
  const str = String(rawRoll).trim();
  if (!str || str === '-') return '';
  const digits = str.replace(/\D/g, '');
  const num = parseInt(digits, 10);
  if (!isNaN(num) && num > 0) {
    return String(num);
  }
  return str;
}

/**
 * Matches a student from a list using admission ID (case-insensitive & trimmed),
 * or fallbacks to Name + Class, or Name.
 */
export function findMatchingStudent<T extends { id: string; name: string; class?: string; roll?: string; [key: string]: any }>(
  students: T[],
  studentId?: string,
  studentName?: string,
  className?: string
): T | undefined {
  if (!students || students.length === 0) return undefined;
  const normId = (studentId || '').trim().toLowerCase();
  const normName = (studentName || '').trim().toLowerCase();
  const normClass = (className || '').trim().toLowerCase();

  // 1. Direct ID match (case-insensitive & trimmed)
  if (normId) {
    const byId = students.find(s => (s.id || '').trim().toLowerCase() === normId);
    if (byId) return byId;
  }

  // 2. Exact Name + Class match
  if (normName && normClass) {
    const byNameAndClass = students.find(s =>
      (s.name || '').trim().toLowerCase() === normName &&
      (s.class || '').trim().toLowerCase().includes(normClass.split('-')[0].trim())
    );
    if (byNameAndClass) return byNameAndClass;
  }

  // 3. Name match
  if (normName) {
    const byName = students.find(s => (s.name || '').trim().toLowerCase() === normName);
    if (byName) return byName;
  }

  return undefined;
}

export function compressImage(base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // preserve transparency for PNGs by using webp or png. Webp supports both compression and transparency.
        const outputType = base64Str.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
        
        // If it's a JPEG, we can use quality. For PNG, quality is ignored but that's fine.
        // Even better, just use webp if supported, but let's stick to matching input type for safety.
        if (outputType === 'image/jpeg') {
           ctx.fillStyle = '#FFFFFF';
           ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL(outputType, quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

