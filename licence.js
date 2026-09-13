/**
 * Pure logic for decoding an Ontario driver's licence number. No I/O.
 *
 * An Ontario licence number is 15 characters, printed as XXXXX-XXXXX-XXXXX:
 *   position 1      the first letter of the surname
 *   positions 2-5   four digits derived from the surname
 *   positions 6-9   four digits derived from the given names
 *   positions 10-15 the birth date as YYMMDD; 50 is added to the month on
 *                   licences issued with a female sex marker (so 01-12 or 51-62)
 */

/**
 * @typedef {"male" | "female"} SexMarker
 *
 * @typedef {object} LicenceCheck
 * @property {boolean} valid
 * @property {string} input            What the caller passed in, untouched.
 * @property {string} [normalized]     Uppercase, letters and digits only.
 * @property {string} [formatted]      Printed form, XXXXX-XXXXX-XXXXX.
 * @property {string} [surnameInitial]
 * @property {string} [birthDate]      ISO date, YYYY-MM-DD.
 * @property {SexMarker} [sexMarker]
 * @property {number} [age]            Age today, in whole years.
 * @property {string} [reason]         Why the number was rejected.
 * @property {string[]} notes
 */

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MIN_LICENSING_AGE = 16;
const IMPLAUSIBLE_AGE = 110;

const FORMAT_ONLY =
  "Format check only: this does not confirm the licence exists, is valid, or belongs to anyone.";

/**
 * Uppercase and strip everything except letters and digits.
 * @param {string} raw
 */
export function normalizeLicence(raw) {
  return String(raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Render a normalized 15-character number the way it is printed on the card.
 * @param {string} normalized
 */
export function formatLicence(normalized) {
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 10)}-${normalized.slice(10, 15)}`;
}

/** @param {number} year */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** @param {number} year @param {number} month */
function daysInMonth(year, month) {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

/** @param {number} year @param {number} month @param {number} day @param {Date} today */
function ageOn(year, month, day, today) {
  let age = today.getUTCFullYear() - year;
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  return age;
}

/** @param {number} n */
function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * @param {string} input
 * @param {string} reason
 * @returns {LicenceCheck}
 */
function fail(input, reason) {
  return { valid: false, input, reason, notes: [FORMAT_ONLY] };
}

/**
 * Validate the format of an Ontario licence number and decode what it encodes.
 * `today` is injectable so the age calculation is testable.
 * @param {string} raw
 * @param {Date} [today]
 * @returns {LicenceCheck}
 */
export function checkLicence(raw, today = new Date()) {
  const input = String(raw ?? "");
  const normalized = normalizeLicence(input);

  if (normalized.length !== 15) {
    return fail(
      input,
      `An Ontario licence number has 15 characters once spaces and dashes are removed; this one has ${normalized.length}.`,
    );
  }
  if (!/^[A-Z]\d{14}$/.test(normalized)) {
    return fail(input, "An Ontario licence number is one letter followed by 14 digits.");
  }

  const yy = Number(normalized.slice(9, 11));
  let month = Number(normalized.slice(11, 13));
  const day = Number(normalized.slice(13, 15));

  /** @type {SexMarker} */
  let sexMarker = "male";
  if (month > 50) {
    sexMarker = "female";
    month -= 50;
  }
  if (month < 1 || month > 12) {
    return fail(input, "The birth-month digits (positions 12 and 13) are not a valid month (01-12 or 51-62).");
  }

  // Two-digit years are ambiguous. A licence holder is at least 16, so if the
  // 20xx reading makes them younger than that, the 19xx reading is the only fit.
  let year = 2000 + yy;
  let age = ageOn(year, month, day, today);
  if (age < MIN_LICENSING_AGE) {
    year -= 100;
    age += 100;
  }

  if (day < 1 || day > daysInMonth(year, month)) {
    return fail(input, `The birth-day digits (positions 14 and 15) are not a valid day for month ${pad(month)} of ${year}.`);
  }

  const notes = [FORMAT_ONLY];
  if (age > IMPLAUSIBLE_AGE) {
    notes.push(`The decoded birth year (${year}) is more than ${IMPLAUSIBLE_AGE} years ago, so the year digits are probably wrong.`);
  }

  return {
    valid: true,
    input,
    normalized,
    formatted: formatLicence(normalized),
    surnameInitial: normalized[0],
    birthDate: `${year}-${pad(month)}-${pad(day)}`,
    sexMarker,
    age,
    notes,
  };
}

/**
 * One short human-readable line for the agent to relay.
 * @param {LicenceCheck} result
 */
export function describeCheck(result) {
  if (!result.valid) {
    return `Not a valid Ontario licence number format. ${result.reason} ${FORMAT_ONLY}`;
  }
  const parts = [
    `Valid Ontario licence number format: ${result.formatted}.`,
    `Surname initial ${result.surnameInitial}.`,
    `Encoded birth date ${result.birthDate} (age ${result.age}), ${result.sexMarker} sex marker.`,
    ...result.notes,
    "The official driving record itself (an Ontario driver's abstract) can be ordered at https://mydriversabstract.ca.",
  ];
  return parts.join(" ");
}
