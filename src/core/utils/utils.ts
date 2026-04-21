import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}
