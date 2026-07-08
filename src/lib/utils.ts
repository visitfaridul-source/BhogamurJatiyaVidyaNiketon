import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

