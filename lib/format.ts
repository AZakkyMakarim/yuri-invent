/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - Currency code (default: IDR)
 * @param locale - Locale for formatting (default: id-ID)
 */
export function formatCurrency(
    amount: number | string,
    currency: string = 'IDR',
    locale: string = 'id-ID'
): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numericAmount);
}

/**
 * Format a date
 * @param date - Date to format
 * @param locale - Locale for formatting
 */
export function formatDate(
    date: Date | string,
    locale: string = 'id-ID'
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(dateObj);
}

/**
 * Format a date with time
 * @param date - Date to format
 * @param locale - Locale for formatting
 */
export function formatDateTime(
    date: Date | string,
    locale: string = 'id-ID'
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateObj);
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @param locale - Locale for formatting
 */
export function formatNumber(
    num: number | string,
    locale: string = 'id-ID'
): string {
    const numericValue = typeof num === 'string' ? parseFloat(num) : num;

    return new Intl.NumberFormat(locale).format(numericValue);
}
