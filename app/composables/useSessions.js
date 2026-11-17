/**
 * Sessies worden per apparaat in localStorage bewaard:
 * - game master: host-token per kamercode
 * - speler: speler-token (+ naam) per kamercode
 * Zo kan iemand na een refresh of verbroken verbinding gewoon verder.
 */

const HOST_KEY = 'pubquiz:host-tokens'
const PLAYER_KEY = 'pubquiz:player-sessions'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  }
  catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  }
  catch {
    // opslag niet beschikbaar (privé-modus); sessie leeft dan alleen in dit tabblad
  }
}

const norm = code => code.trim().toUpperCase()

// --- Game master -----------------------------------------------------------

/** @returns {Record<string, string>} kamercode → host-token */
export function getHostTokens() {
  return read(HOST_KEY, {})
}

export function getHostToken(code) {
  return getHostTokens()[norm(code)] ?? null
}

export function saveHostToken(code, token) {
  write(HOST_KEY, { ...getHostTokens(), [norm(code)]: token })
}

export function removeHostToken(code) {
  const tokens = getHostTokens()
  delete tokens[norm(code)]
  write(HOST_KEY, tokens)
}

// --- Speler ----------------------------------------------------------------

/** @returns {{ playerId: number, token: string, name: string } | null} */
export function getPlayerSession(code) {
  return read(PLAYER_KEY, {})[norm(code)] ?? null
}

export function savePlayerSession(code, session) {
  write(PLAYER_KEY, { ...read(PLAYER_KEY, {}), [norm(code)]: session })
}

export function clearPlayerSession(code) {
  const sessions = read(PLAYER_KEY, {})
  delete sessions[norm(code)]
  write(PLAYER_KEY, sessions)
}

/** Nette foutmelding uit een $fetch-fout halen. */
export function errorMessage(error, fallback = 'Er ging iets mis') {
  return error?.data?.statusMessage || error?.data?.message || error?.statusMessage || fallback
}

export function errorStatus(error) {
  return error?.statusCode ?? error?.status
}
