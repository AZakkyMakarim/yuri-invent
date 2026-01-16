/**
 * Format number to Indonesian format (periods for thousands, comma for decimals)
 * e.g., 1234567.89 => "1.234.567,89"
 */
export function formatNumber(value: number | string, decimals: number = 0): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';

    const parts = num.toFixed(decimals).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    if (decimals > 0 && parts[1]) {
        return `${integerPart},${parts[1]}`;
    }

    return integerPart;
}

/**
 * Parse Indonesian formatted number back to number
 * e.g., "1.234.567,89" => 1234567.89
 */
export function parseFormattedNumber(value: string): number {
    if (!value) return 0;

    // Remove thousand separators (periods) and replace decimal comma with period
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);

    return isNaN(num) ? 0 : num;
}

/**
 * Format input value as user types (Indonesian format)
 */
export function formatInputValue(value: string, decimals: number = 0): string {
    // Remove everything except digits and comma
    let cleaned = value.replace(/[^\d,]/g, '');

    // Split by comma to handle decimal
    const parts = cleaned.split(',');
    const integerPart = parts[0];
    const decimalPart = decimals > 0 && parts[1] ? parts[1].substring(0, decimals) : '';

    // Format integer part with periods
    const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Add decimal part if applicable
    if (decimals > 0 && (decimalPart || cleaned.includes(','))) {
        return `${formatted},${decimalPart}`;
    }

    return formatted;
}
