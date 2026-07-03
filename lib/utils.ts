import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSafeImageSrc(src: any): string {
  if (!src || typeof src !== 'string') {
    return 'https://picsum.photos/seed/suit/600/600';
  }
  const s = src.trim();
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:') || s.startsWith('/')) {
    return s;
  }
  if (s.startsWith('images/') || s.startsWith('assets/')) {
    return '/' + s;
  }
  return 'https://picsum.photos/seed/suit/600/600';
}
