export function extractId(input) {
  if (input === null || input === undefined) return null;
  // If it's already a primitive string/number, return as-is
  if (typeof input === 'string' || typeof input === 'number') return input;
  // If object, try common id/value keys
  if (typeof input === 'object') {
    if (input.value !== undefined && input.value !== null) return input.value;
    if (input.id !== undefined && input.id !== null) return input.id;
    // fallback to toString if possible
    try {
      return String(input);
    } catch (e) {
      return null;
    }
  }
  return null;
}
