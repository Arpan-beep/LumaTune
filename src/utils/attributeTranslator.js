/**
 * Attribute Translator Utility
 * Translates numeric attribute scores (0 - 3) into human-readable label strings.
 * Also preserves existing non-numeric text strings if passed.
 */

export const getWifiLabel = (val) => {
  if (val === undefined || val === null) return 'None';
  if (typeof val === 'string' && isNaN(Number(val))) return val;
  const num = Number(val);
  if (isNaN(num) || num <= 0) return 'None';
  if (num >= 0.1 && num <= 1.4) return 'Weak';
  if (num >= 1.5 && num <= 2.4) return 'Moderate';
  if (num >= 2.5) return 'Strong';
  return 'None';
};

export const getSoundLabel = (val) => {
  if (val === undefined || val === null) return 'Loud';
  if (typeof val === 'string' && isNaN(Number(val))) return val;
  const num = Number(val);
  if (isNaN(num) || num <= 0) return 'Loud';
  if (num >= 0.1 && num <= 1.4) return 'Loud';
  if (num >= 1.5 && num <= 2.4) return 'Moderate';
  if (num >= 2.5) return 'Quite';
  return 'Loud';
};

export const getOutletsLabel = (val) => {
  if (val === undefined || val === null) return 'None';
  if (typeof val === 'string' && isNaN(Number(val))) return val;
  const num = Number(val);
  if (isNaN(num) || num <= 0) return 'None';
  if (num >= 0.1 && num <= 1.4) return 'Very Few';
  if (num >= 1.5 && num <= 2.4) return 'Some';
  if (num >= 2.5) return 'Many';
  return 'None';
};

export const translateAttribute = (val, type) => {
  if (!type) return String(val);
  const t = type.toLowerCase();
  if (t === 'wifi') return getWifiLabel(val);
  if (t === 'sound') return getSoundLabel(val);
  if (t === 'outlets' || t === 'poweroutlets') return getOutletsLabel(val);
  return String(val);
};

export default {
  getWifiLabel,
  getSoundLabel,
  getOutletsLabel,
  translateAttribute,
};
