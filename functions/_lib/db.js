// D1 helpers — JSON column parsing, timestamps, id generation.

export const nowIso = () => new Date().toISOString();

export const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const safeParseJson = (value, fallback) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const parseJsonColumns = (row, jsonCols = []) => {
  if (!row) return row;
  const out = { ...row };
  for (const col of jsonCols) {
    if (col in out) {
      out[col] = safeParseJson(out[col], {});
    }
  }
  return out;
};

export const parseJsonRows = (rows, jsonCols = []) =>
  Array.isArray(rows) ? rows.map((r) => parseJsonColumns(r, jsonCols)) : [];

export const intToBool = (row, boolCols = []) => {
  if (!row) return row;
  const out = { ...row };
  for (const col of boolCols) {
    if (col in out) {
      out[col] = out[col] === 1 || out[col] === true;
    }
  }
  return out;
};

export const normalizeRow = (row, jsonCols = [], boolCols = []) => {
  if (!row) return row;
  return intToBool(parseJsonColumns(row, jsonCols), boolCols);
};

export const normalizeRows = (rows, jsonCols = [], boolCols = []) =>
  Array.isArray(rows) ? rows.map((r) => normalizeRow(r, jsonCols, boolCols)) : [];
