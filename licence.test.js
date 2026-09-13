import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLicence, describeCheck, formatLicence, normalizeLicence } from "./licence.js";

// Fixed clock so ages are stable.
const TODAY = new Date(Date.UTC(2026, 8, 12));

// Surname initial S, four surname digits, four given-name digits, then YYMMDD.
const num = (yy, mm, dd) => `S12345678${yy}${mm}${dd}`;

test("normalizes case, spaces and dashes", () => {
  assert.equal(normalizeLicence(" s1234-56789 00514 "), "S12345678900514");
  assert.equal(formatLicence("S12345678900514"), "S1234-56789-00514");
});

test("decodes a male birth date", () => {
  const r = checkLicence("S1234-56789-00514", TODAY);
  assert.equal(r.valid, true);
  assert.equal(r.formatted, "S1234-56789-00514");
  assert.equal(r.surnameInitial, "S");
  assert.equal(r.birthDate, "1990-05-14");
  assert.equal(r.sexMarker, "male");
  assert.equal(r.age, 36);
});

test("month over 50 means a female sex marker", () => {
  const r = checkLicence(num("90", "55", "14"), TODAY);
  assert.equal(r.valid, true);
  assert.equal(r.birthDate, "1990-05-14");
  assert.equal(r.sexMarker, "female");
});

test("age counts the birthday exactly and picks the century", () => {
  // Born 2010-09-13 would turn 16 the day after TODAY, so the 20xx reading is
  // too young to hold a licence and the number is read as 1910 instead.
  const r = checkLicence(num("10", "09", "13"), TODAY);
  assert.equal(r.valid, true);
  assert.equal(r.birthDate, "1910-09-13");
  assert.equal(r.age, 115);
  assert.ok(r.notes.some((n) => n.includes("probably wrong")));

  // Born 2010-09-12 is exactly 16 today, so it stays in this century.
  const s = checkLicence(num("10", "09", "12"), TODAY);
  assert.equal(s.birthDate, "2010-09-12");
  assert.equal(s.age, 16);
  assert.equal(s.notes.length, 1);
});

test("leap day is accepted only in leap years", () => {
  assert.equal(checkLicence(num("00", "02", "29"), TODAY).birthDate, "2000-02-29");
  const bad = checkLicence(num("01", "02", "29"), TODAY);
  assert.equal(bad.valid, false);
  assert.match(bad.reason ?? "", /not a valid day/);
});

test("rejects wrong length, wrong shape and bad months", () => {
  assert.match(checkLicence("S1234", TODAY).reason ?? "", /15 characters/);
  assert.match(checkLicence("SS2345678900514", TODAY).reason ?? "", /one letter followed by 14 digits/);
  assert.match(checkLicence(num("90", "13", "14"), TODAY).reason ?? "", /valid month/);
  assert.match(checkLicence(num("90", "63", "14"), TODAY).reason ?? "", /valid month/);
  assert.match(checkLicence(num("90", "00", "14"), TODAY).reason ?? "", /valid month/);
  assert.equal(checkLicence("", TODAY).valid, false);
});

test("describeCheck gives one line either way", () => {
  const ok = describeCheck(checkLicence("S1234-56789-00514", TODAY));
  assert.match(ok, /^Valid Ontario licence number format: S1234-56789-00514\./);
  assert.match(ok, /1990-05-14/);
  const bad = describeCheck(checkLicence("nope", TODAY));
  assert.match(bad, /^Not a valid Ontario licence number format\./);
});
