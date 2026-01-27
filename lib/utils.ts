/**
 * Image compression utility
 */
export async function compressImage(file: File, quality = 0.7, maxWidth = 1200): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Scale down if width exceeds maxWidth
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas to Blob conversion failed'));
                            return;
                        }
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Generate a unique code with prefix
 * @param prefix - Prefix for the code (e.g., "PR", "PO", "GRN")
 */
export function generateCode(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * API Base URL - uses environment variable for flexibility
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Fetch wrapper with base URL
 */
export async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'An error occurred');
    }

    return response.json();
}

/**
 * Format number to currency string
 * @param amount - The number to format
 * @param currency - Currency code (default: 'IDR')
 * @param locale - Locale code (default: 'id-ID')
 */
export function formatCurrency(
    amount: number,
    currency: string = 'IDR',
    locale: string = 'id-ID'
): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Recursively converts Prisma Decimal objects to numbers
 * Useful for passing server data to client components
 */
export function serializeDecimal(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'number') return obj;
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'boolean') return obj;
    if (obj instanceof Date) return obj;

    // Handle Prisma Decimal
    if (typeof obj === 'object' && obj !== null) {
        if (typeof obj.toNumber === 'function') {
            return obj.toNumber();
        }

        if (Array.isArray(obj)) {
            return obj.map(serializeDecimal);
        }

        const newObj: any = {};
        for (const key of Object.keys(obj)) {
            newObj[key] = serializeDecimal(obj[key]);
        }
        return newObj;
    }

    return obj;
}

/**
 * Format date to local string
 */
export function formatDate(date: Date | string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}
