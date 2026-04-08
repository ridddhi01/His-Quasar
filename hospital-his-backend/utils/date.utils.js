/**
 * Date Utilities
 * Date manipulation and formatting functions
 */

/**
 * Format date to YYYY-MM-DD
 */
exports.formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format date to DD/MM/YYYY (Indian format)
 */
exports.formatDateIndian = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Format datetime
 */
exports.formatDateTime = (date) => {
    const d = new Date(date);
    return d.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Format time (HH:MM)
 */
exports.formatTime = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Get start of day
 */
exports.startOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get end of day
 */
exports.endOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Get start of week (Monday)
 */
exports.startOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get start of month
 */
exports.startOfMonth = (date = new Date()) => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get end of month
 */
exports.endOfMonth = (date = new Date()) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Add days to date
 */
exports.addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

/**
 * Add months to date
 */
exports.addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
};

/**
 * Calculate age from date of birth
 */
exports.calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
};

/**
 * Get difference between dates in days
 */
exports.daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get difference between dates in hours
 */
exports.hoursBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60));
};

/**
 * Check if date is today
 */
exports.isToday = (date) => {
    const today = new Date();
    const d = new Date(date);
    return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
    );
};

/**
 * Check if date is in the past
 */
exports.isPast = (date) => {
    return new Date(date) < new Date();
};

/**
 * Check if date is in the future
 */
exports.isFuture = (date) => {
    return new Date(date) > new Date();
};

/**
 * Get relative time string
 */
exports.getRelativeTime = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    return exports.formatDateIndian(date);
};

/**
 * Get date range for given period
 */
exports.getDateRange = (period) => {
    const now = new Date();
    let start, end;

    switch (period) {
        case 'today':
            start = exports.startOfDay(now);
            end = exports.endOfDay(now);
            break;
        case 'yesterday':
            start = exports.startOfDay(exports.addDays(now, -1));
            end = exports.endOfDay(exports.addDays(now, -1));
            break;
        case 'week':
            start = exports.startOfWeek(now);
            end = exports.endOfDay(now);
            break;
        case 'month':
            start = exports.startOfMonth(now);
            end = exports.endOfDay(now);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = exports.endOfDay(now);
            break;
        default:
            start = exports.startOfDay(now);
            end = exports.endOfDay(now);
    }

    return { start, end };
};
