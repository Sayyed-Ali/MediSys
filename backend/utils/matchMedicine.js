/**
 * backend/utils/matchMedicine.js
 * Defensive fuzzy matcher using string-similarity.
 */
const stringSimilarity = require('string-similarity');
const Medicine = require('../models/Medicine');

let cachedMedicines = null;
let cachedAt = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

async function loadCache() {
  const now = Date.now();
  if (cachedMedicines && (now - cachedAt) < CACHE_TTL) return cachedMedicines;
  const meds = await Medicine.find({}, 'name').lean();
  cachedMedicines = meds || [];
  cachedAt = now;
  return cachedMedicines;
}

/**
 * Safely match a guessed name to the medicines master list.
 * Returns: { medicine: <doc|null>, rating: <0..1> } or null if no data.
 */
async function matchMedicineByName(nameGuess) {
  try {
    if (!nameGuess || !String(nameGuess).trim()) return null;

    const meds = await loadCache();
    if (!Array.isArray(meds) || meds.length === 0) {
      console.warn('[matchMedicine] Medicine master list is empty.');
      return null;
    }

    // Ensure we have an array of strings for comparison
    const names = meds.map(m => (m && m.name) ? String(m.name) : '');
    const sanitizedNames = names.map(n => n.trim()).filter(n => n.length > 0);

    if (!Array.isArray(sanitizedNames) || sanitizedNames.length === 0) {
      console.warn('[matchMedicine] No valid medicine names to match against.');
      return null;
    }

    // findBestMatch requires: first arg string, second arg array of strings
    const { bestMatch, bestMatchIndex } = stringSimilarity.findBestMatch(String(nameGuess), sanitizedNames);
    const rating = bestMatch && bestMatch.rating ? bestMatch.rating : 0;

    // bestMatchIndex refers to sanitizedNames; map back to original meds
    // Find the original index by matching the sanitized name to the original names list.
    const matchedName = sanitizedNames[bestMatchIndex];
    const originalIndex = names.findIndex(n => n.trim() === matchedName);

    const medicine = originalIndex >= 0 ? meds[originalIndex] : null;
    return { medicine, rating };
  } catch (err) {
    console.error('[matchMedicine] Error while matching:', err && err.message ? err.message : err);
    return null;
  }
}

module.exports = { matchMedicineByName };
