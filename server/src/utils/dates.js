// Pure calendar date utility for Indian Standard Time (IST / Asia/Kolkata)
// Ensures calendar dates (YYYY-MM-DD) are preserved without timezone drift

/**
 * Returns the current calendar date in Indian Standard Time (Asia/Kolkata)
 * formatted strictly as 'YYYY-MM-DD'.
 *
 * @param {Date} [referenceDate=new Date()] - Optional date reference for testing
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function todayIST(referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(referenceDate);
}

/**
 * Normalizes a date input (string YYYY-MM-DD or Date object) into a Date
 * set precisely at midnight UTC.
 *
 * @param {string|Date} input
 * @returns {Date} Normalized midnight UTC Date
 */
export function toDateOnly(input) {
  if (!input) return null;
  const dateStr = typeof input === "string" ? input.slice(0, 10) : input.toISOString().slice(0, 10);
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Formats a Date object or string into a clean 'YYYY-MM-DD' calendar string.
 *
 * @param {Date|string} date
 * @returns {string} Calendar date string 'YYYY-MM-DD'
 */
export function formatDateString(date) {
  if (!date) return null;
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/**
 * Adds n calendar days to a given date and returns the result as 'YYYY-MM-DD'.
 *
 * @param {string|Date} date - Starting calendar date
 * @param {number} n - Number of days to add
 * @returns {string} Resulting calendar date as YYYY-MM-DD
 */
export function addDays(date, n) {
  const d = toDateOnly(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes elapsed integer calendar days between two dates (b - a).
 *
 * @param {string|Date} a - Earlier date
 * @param {string|Date} b - Later date
 * @returns {number} Integer day difference
 */
export function daysBetween(a, b) {
  const dateA = toDateOnly(a);
  const dateB = toDateOnly(b);
  const diffMs = dateB.getTime() - dateA.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

