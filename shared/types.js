/**
 * Gedeelde datavormen (alleen documentatie via JSDoc, geen runtime-code).
 * Editors als VS Code gebruiken dit voor autocompletion: `@type {import('#shared/types').PublicRoom}`.
 */

/** @typedef {'lobby' | 'playing' | 'finished'} RoomStatus */

/**
 * @typedef {object} PublicPlayer
 * @property {number} id
 * @property {string} name
 * @property {boolean} isConnected
 * @property {number} score
 * @property {string} joinedAt  ISO-datum
 */

/**
 * @typedef {object} PublicRoom
 * @property {string} code
 * @property {string} name
 * @property {RoomStatus} status
 * @property {{ id: number, title: string } | null} questionSet
 * @property {number} totalQuestions
 * @property {number | null} currentQuestionIndex  0-based
 * @property {string} createdAt
 * @property {string | null} startedAt
 * @property {string | null} finishedAt
 * @property {PublicPlayer[]} players
 */

/**
 * Eén medium bij een vraag. Een vraag heeft er 0..n, op volgorde.
 * @typedef {object} QuestionMedia
 * @property {number} id
 * @property {'image' | 'video' | 'audio'} kind
 * @property {string} url  '/media/...' (map public/media) of een volledige URL
 * @property {string | null} caption
 * @property {number | null} startSeconds  video/audio: vanaf hier afspelen
 * @property {number | null} endSeconds    video/audio: tot hier afspelen
 */

/**
 * Antwoordtypes:
 *  - 'open'             → vrije tekst. Goede antwoorden: questions.correct_answer, bijv. ["Canberra"]
 *  - 'single_choice'    → precies één optie kiezen (antwoord: { optionIds: [id] })
 *  - 'multiple_choice'  → één of meer opties kiezen (antwoord: { optionIds: [...] }, goed = exact de goede set)
 * @typedef {'open' | 'single_choice' | 'multiple_choice'} AnswerType
 */

/**
 * Antwoordoptie bij een keuzevraag.
 * @typedef {object} QuestionOption
 * @property {number} id
 * @property {string} label
 * @property {boolean} [isCorrect]  alleen voor de game master
 */

/**
 * Staat van een vraag in een kamer (tabel `room_questions`).
 * @typedef {object} QuestionState
 * @property {string} openedAt  ISO; start van de vraag/timer
 * @property {string | null} closesAt  ISO; deadline (null = geen tijdslimiet)
 * @property {string} serverNow  ISO; servertijd bij het ophalen (om de klok van het apparaat te corrigeren)
 * @property {boolean} timeUp
 * @property {boolean} locked  antwoorden kan niet meer (tijd om of onthuld)
 * @property {boolean} revealed  goede antwoord is zichtbaar voor iedereen
 */

/**
 * Antwoord zoals opgeslagen in `answers.answer`:
 *   open → { text: 'Canberra' } · keuzevragen → { optionIds: [12, 14] }
 * @typedef {{ text: string } | { optionIds: number[] }} AnswerValue
 */

/**
 * @typedef {object} PublicAnswer
 * @property {number} id
 * @property {number} playerId
 * @property {string} [playerName]
 * @property {AnswerValue} answer
 * @property {string} answeredAt
 * @property {boolean | null} [isCorrect]  null = (nog) niet beoordeeld; voor spelers pas na onthullen
 * @property {number} [pointsAwarded]
 */

/**
 * Live statistieken van één vraag (GET /api/rooms/:code/answers, alleen game master).
 * @typedef {object} QuestionStats
 * @property {number} questionIndex
 * @property {number} questionId
 * @property {AnswerType} answerType
 * @property {number} playerCount
 * @property {number} answeredCount
 * @property {number} correctCount
 * @property {PublicAnswer[]} answers
 * @property {Record<number, number>} optionCounts  keuzevragen: option-id → aantal keer gekozen
 * @property {{ text: string, count: number, answerIds: number[], playerNames: string[], isCorrect: boolean | null }[]} groups
 *           open vragen: antwoorden gegroepeerd op tekst (hoofdletters/accenten/leestekens genegeerd)
 */

/**
 * Stand (GET /api/rooms/:code/standings). Gelijke score = gedeelde plek.
 * @typedef {object} Standings
 * @property {RoomStatus} status
 * @property {number} totalQuestions
 * @property {number} maxScore  som van de punten van alle vragen
 * @property {{ rank: number, id: number, name: string, score: number, correctCount: number, answeredCount: number }[]} players
 */

/**
 * De huidige vraag, zoals GET /api/rooms/:code/question hem teruggeeft.
 * @typedef {object} PublicQuestion
 * @property {number} id
 * @property {number} index   0-based plek in de set
 * @property {number} number  1-based (voor weergave)
 * @property {number} total   aantal vragen in de set
 * @property {string} prompt
 * @property {AnswerType} answerType
 * @property {number} points
 * @property {number | null} timeLimitSeconds
 * @property {QuestionMedia[]} media  leeg = tekstvraag
 * @property {QuestionOption[]} options  leeg bij open vragen
 * @property {QuestionState | null} state
 * @property {unknown} [correctAnswer]  game master, of iedereen zodra het antwoord onthuld is
 * @property {string | null} [hostNotes]  alleen voor de game master
 * @property {PublicAnswer | null} [myAnswer]  alleen met `x-player-token`: het eigen antwoord
 */

/**
 * @typedef {object} PlayerSession
 * @property {number} playerId
 * @property {string} token
 * @property {string} name
 */

/**
 * Realtime-signalen via de websocket.
 * Principe: de database is de bron van waarheid; een signaal zegt alleen "er is iets veranderd"
 * (eventueel met een kleine payload). Clients halen bij twijfel de actuele staat op via de API.
 *
 * Bekende signalen:
 *  - { type: 'players_changed' }
 *  - { type: 'player_removed', playerId }
 *  - { type: 'game_started', questionIndex }
 *  - { type: 'question_changed', questionIndex }               (volgende én vorige vraag)
 *  - { type: 'question_state_changed', questionIndex }         (onthuld/verborgen, timer herstart → vraag opnieuw ophalen)
 *  - { type: 'answer_submitted', playerId, questionIndex }     (alleen naar de host)
 *  - { type: 'answers_changed', questionIndex }                (game master heeft antwoorden goed/fout gekeurd)
 *  - { type: 'game_ended' }
 *  - { type: 'room_closed' }
 *
 * @typedef {{ type: string, [key: string]: unknown }} RealtimeEvent
 */

/**
 * Berichten van server naar client:
 *  - { type: 'welcome', role, room }
 *  - { type: 'error', message }
 *  - { type: 'pong' }
 *  - { type: 'event', room, at, event: RealtimeEvent }
 *
 * Berichten van client naar server:
 *  - { type: 'join', room, role: 'host' | 'player', token }
 *  - { type: 'ping' }
 */

export {}
