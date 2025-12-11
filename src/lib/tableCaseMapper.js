const defaultTables = [
  'factura_detalles',
  'movimientos_inventario',
  'producto_unidades',
  'config_tasa_cambio',
  'stock_sucursal',
  'factura_descuento',
  'factura_pagos',
  'producto_existencia',
  'reservas',
  'stock_danados',
  'nivelacion',
  'productos',
  'clientes',
  'usuarios',
  'sucursal',
  'factura',
  'descuentos',
  'subcategorias',
  'producto_bodegas',
  'producto_kits',
  'stock_movimientos',
  'stock_alertas'
].filter(Boolean);

const tableNameCache = new Map();
const identifierPatternsCache = new Map();
const appliedPools = new WeakMap();

const escapeRegex = (value) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const buildVariants = (base) => {
  const parts = base.split('_');
  const pascal = parts
    .map(segment => segment ? segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase() : segment)
    .join('_');
  const lower = base.toLowerCase();
  const upper = base.toUpperCase();
  const camel = parts
    .map((segment, index) => {
      if (!segment) return segment;
      const lowerSegment = segment.toLowerCase();
      if (index === 0) return lowerSegment;
      return lowerSegment.charAt(0).toUpperCase() + lowerSegment.slice(1);
    })
    .join('');
  return Array.from(new Set([base, lower, upper, pascal, camel])).filter(Boolean);
};

async function resolveTableName(executor, base) {
  if (tableNameCache.has(base)) return tableNameCache.get(base);
  const variants = buildVariants(base);
  const placeholders = variants.map(() => '?').join(', ');
  let actual = base;
  try {
    const [rows] = await executor(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) LIMIT ${variants.length}`,
      variants
    );
    if (Array.isArray(rows) && rows.length) {
      const found = new Set(rows.map(row => String(row.TABLE_NAME)));
      for (const variant of variants) {
        if (found.has(variant)) {
          actual = variant;
          break;
        }
      }
    }
  } catch {
    actual = base;
  }
  const meta = { raw: actual, quoted: `\`${actual}\`` };
  tableNameCache.set(base, meta);
  return meta;
}

const buildPatterns = (base, meta) => {
  const cacheKey = `${base}::${meta.raw}`;
  if (identifierPatternsCache.has(cacheKey)) return identifierPatternsCache.get(cacheKey);
  const escapedBase = escapeRegex(base);
  const patterns = [
    { regex: new RegExp("`" + escapedBase + "`", 'gi'), value: meta.quoted },
    { regex: new RegExp("\\b" + escapedBase + "\\b", 'gi'), value: meta.quoted },
    { regex: new RegExp("'" + escapedBase + "'", 'gi'), value: `'${meta.raw}'` },
    { regex: new RegExp("\"" + escapedBase + "\"", 'gi'), value: `"${meta.raw}"` }
  ];
  identifierPatternsCache.set(cacheKey, patterns);
  return patterns;
};

export function enableCaseMapping(pool, extraTables = []) {
  if (!pool || typeof pool.query !== 'function') return (conn) => conn;

  let state = appliedPools.get(pool);
  if (!state) {
    state = {
      originalQuery: pool.query.bind(pool),
      tableSet: new Set(defaultTables),
      sortedBases: [],
      matchers: new Map(),
    };
    appliedPools.set(pool, state);
  }

  extraTables.filter(Boolean).forEach(name => state.tableSet.add(name));
  state.sortedBases = Array.from(state.tableSet).sort((a, b) => b.length - a.length);
  state.matchers = new Map();
  state.sortedBases.forEach(base => {
    state.matchers.set(base, new RegExp(`(${escapeRegex(base)})`, 'i'));
  });

  const mapSqlIdentifiers = async (executor, sql) => {
    if (typeof sql !== 'string') return sql;
    const matchedBases = state.sortedBases.filter(base => state.matchers.get(base)?.test(sql));
    if (!matchedBases.length) return sql;
    const entries = await Promise.all(matchedBases.map(async base => [base, await resolveTableName(executor, base)]));
    const tableMap = Object.fromEntries(entries);
    let mapped = sql;
    for (const base of matchedBases) {
      const meta = tableMap[base];
      if (!meta) continue;
      const patterns = buildPatterns(base, meta);
      for (const { regex, value } of patterns) {
        mapped = mapped.replace(regex, value);
      }
    }
    return mapped;
  };

  const queryWithResolvedTables = async (executor, sql, params = []) => {
    const mappedSql = await mapSqlIdentifiers(executor, sql);
    return executor(mappedSql, params);
  };

  pool.query = function caseAwarePoolQuery(sql, params) {
    return queryWithResolvedTables(state.originalQuery, sql, params);
  };

  const wrapConnection = (conn) => {
    if (!conn || typeof conn.query !== 'function') return conn;
    if (conn.__caseAwareWrapped) return conn;
    const original = conn.query.bind(conn);
    conn.__caseAwareWrapped = true;
    conn.__caseAwareOriginal = original;
    conn.query = (sql, params) => queryWithResolvedTables(original, sql, params);
    return conn;
  };

  return wrapConnection;
}

export default enableCaseMapping;
