// Database-tool. Leest de verbinding uit .env.
//
//   npm run db:migrate   → maakt de database aan (indien nodig) en voert nieuwe migraties uit
//   npm run db:seed      → laadt de voorbeelddata uit server/database/seeds/*.sql
//
// Migraties staan in server/database/migrations en worden op naamvolgorde uitgevoerd (001_, 002_, ...).
// Welke al zijn uitgevoerd, staat in de tabel `schema_migrations`. Een uitgevoerde migratie pas je
// nooit meer aan: maak voor elke wijziging een nieuw bestand.
import { readdir, readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'

const command = process.argv[2]
if (!['migrate', 'seed'].includes(command)) {
  console.error('Gebruik: node scripts/db.mjs <migrate|seed>')
  process.exit(1)
}

const database = process.env.NUXT_DB_DATABASE || 'pubquiz'
if (!/^\w+$/.test(database)) throw new Error(`Ongeldige databasenaam: ${database}`)

const dir = name => new URL(`../server/database/${name}/`, import.meta.url)
const sqlFiles = async name => (await readdir(dir(name))).filter(f => f.endsWith('.sql')).sort()

const connection = await mysql.createConnection({
  host: process.env.NUXT_DB_HOST || 'localhost',
  port: Number(process.env.NUXT_DB_PORT || 3306),
  user: process.env.NUXT_DB_USER || 'root',
  password: process.env.NUXT_DB_PASSWORD || '',
  multipleStatements: true,
  charset: 'utf8mb4',
})

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  )
  await connection.query(`USE \`${database}\``)
  await connection.query(`SET time_zone = '+00:00'`)

  if (command === 'migrate') {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`)
    const [rows] = await connection.query('SELECT name FROM schema_migrations')
    const applied = new Set(rows.map(r => r.name))

    let count = 0
    for (const file of await sqlFiles('migrations')) {
      if (applied.has(file)) continue
      console.log(`→ ${file}`)
      await connection.query(await readFile(new URL(file, dir('migrations')), 'utf8'))
      await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file])
      count++
    }
    console.log(count ? `✔ ${count} migratie(s) uitgevoerd.` : '✔ Database is al up-to-date.')
  }

  if (command === 'seed') {
    for (const file of await sqlFiles('seeds')) {
      console.log(`→ ${file}`)
      await connection.query(await readFile(new URL(file, dir('seeds')), 'utf8'))
    }
    console.log('✔ Seed-data geladen.')
  }
}
finally {
  await connection.end()
}
