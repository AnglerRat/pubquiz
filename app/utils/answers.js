/**
 * Hulpjes voor antwoordopties en antwoorden (automatisch geïmporteerd in de app).
 */

/** Vaste kleur per optiepositie (host én spelers), zodat "A = paars" overal klopt. */
export const OPTION_COLORS = [
  'bg-violet-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-fuchsia-500',
]

export const optionColor = i => OPTION_COLORS[i % OPTION_COLORS.length]
export const optionLetter = i => String.fromCharCode(65 + i)

/**
 * Een opgeslagen antwoord als leesbare tekst, bijv. "Canberra" of "B · Mercurius".
 * @param {{ text?: string, optionIds?: number[] } | null | undefined} answer
 * @param {import('#shared/types').QuestionOption[]} [options]
 */
export function formatAnswer(answer, options = []) {
  if (!answer) return ''
  if (answer.text != null) return answer.text
  return (answer.optionIds ?? [])
    .map((id) => {
      const i = options.findIndex(o => o.id === id)
      return i === -1 ? '?' : `${optionLetter(i)} · ${options[i].label}`
    })
    .join(', ')
}

/** "1e", "2e", ... */
export const ordinal = n => `${n}e`

/** Punt(en) */
export const pointsLabel = n => `${n} ${n === 1 ? 'punt' : 'punten'}`
