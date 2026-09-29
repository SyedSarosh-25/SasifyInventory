// Public data only. Coalesce simultaneous reads and never cache failures.
export function createCatalogCache(ttlMs = 5000, now = Date.now) {
  let value, expiresAt = 0, pending, generation = 0;
  return {
    invalidate() { generation++; value = undefined; expiresAt = 0; pending = undefined; },
    async read(load) {
      if (value !== undefined && now() < expiresAt) return value;
      if (pending) return pending;
      const version = generation;
      const request = Promise.resolve().then(load).then((result) => {
        if (version === generation) { value = result; expiresAt = now() + ttlMs; }
        return result;
      }).finally(() => { if (pending === request) pending = undefined; });
      pending = request;
      return request;
    },
  };
}

export async function parallelCatalogReads(pool, statements) {
  // Separate connections are required: pg serializes queries on one client.
  return Promise.all(statements.map(async (sql) => {
    const connection = await pool.connect();
    try { return await connection.query(sql); }
    finally { connection.release(); }
  }));
}
