import mysql from 'mysql2/promise'

/** @type {import('mysql2/promise').Pool | undefined} */
let pool

/** Gedeelde MySQL connection pool (lazy aangemaakt). */
export function useDb() {
  if (!pool) {
    const { db } = useRuntimeConfig()
    pool = mysql.createPool({
      host: db.host,
      port: Number(db.port),
      user: db.user,
      password: db.password,
      database: db.database,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      timezone: 'Z',
      charset: 'utf8mb4',
    })
    // Alle tijden in UTC opslaan/lezen
    pool.on('connection', (conn) => {
      conn.query(`SET time_zone = '+00:00'`)
    })
  }
  return pool
}

/** SELECT → array met rijen. */
export async function dbQuery(sql, params = []) {
  const [rows] = await useDb().query(sql, params)
  return rows
}

/** SELECT → eerste rij of null. */
export async function dbQueryOne(sql, params = []) {
  const rows = await dbQuery(sql, params)
  return rows[0] ?? null
}

/** INSERT / UPDATE / DELETE → resultaat met o.a. `insertId` en `affectedRows`. */
export async function dbExecute(sql, params = []) {
  const [result] = await useDb().query(sql, params)
  return result
}

/** MySQL DATETIME-string (UTC) → ISO 8601, bijv. '2026-11-14 20:00:00' → '2026-11-14T20:00:00Z'. */
export function toIso(value) {
  return value ? `${value.replace(' ', 'T')}Z` : null
}

/**
 * Voer meerdere queries uit in één transactie.
 * @example await dbTransaction(async (conn) => { await conn.query(...); await conn.query(...) })
 */
export async function dbTransaction(fn) {
  const conn = await useDb().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  }
  catch (error) {
    await conn.rollback()
    throw error
  }
  finally {
    conn.release()
  }
}
