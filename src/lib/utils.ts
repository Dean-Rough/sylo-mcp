import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Icon size utilities for consistent Lucide icon usage
export const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const

export type IconSize = keyof typeof iconSizes

// Helper function for consistent icon styling
export function iconClass(size: IconSize = 'sm', className?: string) {
  return cn(iconSizes[size], className)
}
