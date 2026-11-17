# Pubquiz

Pubquiz-app voor op locatie: een game master maakt een kamer en toont de QR-code op een groot scherm,
spelers joinen met hun telefoon.

**Stack:** Nuxt 4 · Nuxt UI 4 (Tailwind 4) · MySQL (mysql2) · Nitro websockets (crossws)

## Starten

```bash
npm install
cp .env.example .env      # vul NUXT_DB_PASSWORD in
npm run db:migrate        # maakt database aan + voert nieuwe migraties uit
npm run db:seed           # optioneel: voorbeeldquiz (tekst-, afbeelding- en videovraag)
npm run dev               # http://localhost:3000
```

- Game master: `http://localhost:3000/host`
- Spelers: scannen de QR-code, of gaan naar `http://<jouw-LAN-IP>:3000` en vullen de code in.

De dev-server luistert op alle netwerkinterfaces. Telefoons moeten op hetzelfde (wifi)netwerk zitten.
Windows kan de eerste keer vragen om Node door de firewall te laten (privé netwerk).
Kiest de QR-code het verkeerde IP? Kies een ander adres in de lobby, of zet `NUXT_PUBLIC_JOIN_BASE_URL` in `.env`.

## Architectuur

**Database = data, websocket = signalen.** Elke actie gaat via een API-route die eerst de database
bijwerkt en daarna een signaal naar de kamer stuurt. Clients halen bij een signaal (of na herverbinden)
de actuele staat op uit de API.

```
Game master  ── POST /api/rooms/:code/next ──▶  UPDATE rooms ...  ──▶  broadcast('question_changed')
                                                                              │
Spelers  ◀──────────────────────── websocket /_ws ◀───────────────────────────┘
```

### Routes (pagina's)

| Pad | Wie | Wat |
|---|---|---|
| `/` | speler | code invullen |
| `/join/:code` | speler | naam + avatar kiezen |
| `/play/:code` | speler | wachtruimte |
| `/play/:code/game` | speler | **entry point** antwoordscherm |
| `/host` | game master | kamers aanmaken / beheren |
| `/host/:code` | game master | lobby met QR-code + live deelnemers |
| `/host/:code/game` | game master | **entry point** vraag + live antwoorden |

### API

| Methode | Pad | Auth |
|---|---|---|
| GET | `/api/question-sets` | – |
| POST | `/api/rooms` (body: `questionSetId`, `name?`) | – |
| GET | `/api/rooms/:code/question` | – (met `x-host-token` ook het juiste antwoord) |
| POST | `/api/rooms/mine` | host-tokens in body |
| GET | `/api/rooms/:code` | – |
| DELETE | `/api/rooms/:code` | `x-host-token` |
| POST | `/api/rooms/:code/start` · `/next` · `/prev` · `/end` | `x-host-token` |
| POST | `/api/rooms/:code/reveal` (body: `revealed?`) · `/reopen` | `x-host-token` |
| POST | `/api/rooms/:code/answers` (body: `questionIndex`, `answer`) | `x-player-token` |
| GET | `/api/rooms/:code/answers?questionIndex=` (live statistieken) | `x-host-token` |
| POST | `/api/rooms/:code/answers/grade` (body: `answerIds`, `isCorrect`) | `x-host-token` |
| GET | `/api/rooms/:code/standings` | – |
| POST | `/api/rooms/:code/players` | – (join) |
| GET / DELETE | `/api/rooms/:code/players/me` | `x-player-token` |
| DELETE | `/api/rooms/:code/players/:id` | `x-host-token` |
| GET | `/api/network` | – (LAN-IP's voor de QR-code) |

Tokens staan per apparaat in `localStorage`, zodat refreshen of een verbroken verbinding geen probleem is.

### Database

```
question_sets ──< question_set_items >── questions ──< question_media
     ▲              (position)                          (0..n: image / video / audio)
     └── rooms ──< players
           └────< answers >── questions
```

| Tabel | Inhoud |
|---|---|
| `question_sets` | quizzen waaruit je kiest bij een nieuwe kamer (`is_active = 0` verbergt een set) |
| `questions` | losse, herbruikbare vragen: `prompt`, `answer_type`, `correct_answer` (JSON), `points`, `time_limit_seconds`, `host_notes` |
| `question_set_items` | welke vraag in welke set staat, met `position` (volgorde) |
| `question_media` | afbeeldingen/video's/audio bij een vraag, met `position`, `caption` en voor video `start_seconds`/`end_seconds` |
| `question_options` | antwoordopties bij keuzevragen, met `position`, `label` en `is_correct` |
| `rooms` | kamer: gekozen set, status, `current_question_index` (0-based plek in de set) |
| `room_questions` | staat per getoonde vraag: `opened_at`, `closes_at` (timer), `locked_at`, `revealed` |
| `players` · `answers` | spelers en hun antwoorden (één per speler per vraag, nagekeken: `is_correct`, `points_awarded`); `players.score` = som van de punten |

### Spelverloop

- **Timer:** heeft een vraag `time_limit_seconds`, dan start de timer zodra de vraag voor het eerst getoond wordt.
  De deadline staat in `room_questions.closes_at`; daarna (+2 s speling) worden antwoorden geweigerd.
  Terug naar een eerdere vraag houdt de oude staat; de game master kan de timer herstarten.
- **Antwoorden:** spelers kunnen hun antwoord wijzigen tot de tijd om is of het antwoord onthuld wordt.
  Nakijken gebeurt automatisch (open vragen: hoofdletters, accenten en leestekens tellen niet mee;
  `multiple_choice`: precies de goede opties). De game master kan open antwoorden handmatig goed/fout keuren.
- **Onthullen** sluit het antwoorden; spelers zien dan of ze het goed hadden.

**Soort vraag = wat er aan media hangt.** Geen media → tekstvraag; één of meer `image` → afbeeldingsvraag;
een `video` → videovraag. Hoe er geantwoord wordt staat daar los van, in `answer_type`:

| `answer_type` | Goede antwoord staat in | Regel |
|---|---|---|
| `open` | `questions.correct_answer` (JSON-array), bijv. `["Canberra"]` | eerste waarde wordt getoond, de rest telt ook als goed |
| `single_choice` | `question_options.is_correct` | precies één optie goed |
| `multiple_choice` | `question_options.is_correct` | één of meer opties goed |

De game master krijgt een waarschuwing in beeld als een vraag niet aan deze regels voldoet.
Media en antwoordtype zijn vrij te combineren (bijv. een video met een meerkeuzevraag).

#### Schemawijzigingen: migraties

Migraties staan in `server/database/migrations/` en worden op naamvolgorde uitgevoerd door `npm run db:migrate`.
Welke al gedraaid zijn, staat in `schema_migrations`. **Een uitgevoerde migratie pas je nooit meer aan**:
maak voor elke wijziging een nieuw bestand, bijv. `003_multiple_choice.sql`.

## Vragen toevoegen (direct in de database)

Mediabestanden zet je in `public/media/` (bijv. `public/media/ronde1/eiffeltoren.jpg` → url `/media/ronde1/eiffeltoren.jpg`).
Een volledige URL naar een externe afbeelding of video kan ook.

```sql
-- 1. Een set (of gebruik een bestaande)
INSERT INTO question_sets (title, description) VALUES ('Vrijdagquiz', 'Ronde 1: algemeen');
SET @set = LAST_INSERT_ID();

-- 2. Tekstvraag
INSERT INTO questions (prompt, correct_answer) VALUES ('Hoeveel poten heeft een spin?', '["8", "acht"]');
INSERT INTO question_set_items (question_set_id, question_id, position) VALUES (@set, LAST_INSERT_ID(), 10);

-- 3. Vraag met twee afbeeldingen
INSERT INTO questions (prompt, correct_answer) VALUES ('Welke stad zie je op beide foto''s?', '["Parijs"]');
SET @q = LAST_INSERT_ID();
INSERT INTO question_media (question_id, position, kind, url) VALUES
  (@q, 10, 'image', '/media/ronde1/foto1.jpg'),
  (@q, 20, 'image', '/media/ronde1/foto2.jpg');
INSERT INTO question_set_items (question_set_id, question_id, position) VALUES (@set, @q, 20);

-- 4. Videovraag (fragment van 12 t/m 20 seconden)
INSERT INTO questions (prompt, correct_answer, time_limit_seconds) VALUES ('Uit welke film komt dit fragment?', '["Titanic"]', 30);
SET @q = LAST_INSERT_ID();
INSERT INTO question_media (question_id, kind, url, start_seconds, end_seconds) VALUES (@q, 'video', '/media/ronde1/film.mp4', 12, 20);
INSERT INTO question_set_items (question_set_id, question_id, position) VALUES (@set, @q, 30);
```

```sql
-- 5. Keuzevraag (single_choice: precies één goed; multiple_choice: één of meer goed)
INSERT INTO questions (prompt, answer_type) VALUES ('Wat is de grootste oceaan?', 'single_choice');
SET @q = LAST_INSERT_ID();
INSERT INTO question_options (question_id, position, label, is_correct) VALUES
  (@q, 10, 'Atlantische Oceaan', 0),
  (@q, 20, 'Grote Oceaan', 1),
  (@q, 30, 'Indische Oceaan', 0);
INSERT INTO question_set_items (question_set_id, question_id, position) VALUES (@set, @q, 40);
```

YouTube-links in `question_media.url` worden automatisch als embed getoond (ook met `start_seconds`/`end_seconds`).

Tips: nummer `position` met gaten (10, 20, 30…) zodat je later iets kunt tussenvoegen. Dezelfde vraag in een
andere set? Alleen een extra regel in `question_set_items`. Zie `server/database/seeds/001_voorbeeldquiz.sql`
voor een compleet voorbeeld.

## Verder bouwen

1. **Nieuw signaal?** Documenteer het in de lijst met signalen in `shared/types.js`.
2. **Nieuw endpoint?** Maak een bestand in `server/api/rooms/[code]/...`, gebruik `requireHost(event)` of
   `requirePlayer(event)`, schrijf naar de database (`dbExecute`/`dbQuery`) en stuur daarna
   `broadcast(room.code, { type: '...' })` (optioneel alleen naar `'host'` of `'players'`).
3. **Signaal afhandelen in een pagina:** geef een handler mee aan `useHostRoom(code, { ... })` of
   `usePlayerRoom(code, { ... })`.
4. **Huidige vraag tonen:** `useCurrentQuestion(code, () => room.value?.currentQuestionIndex, api)` geeft een
   `question` die automatisch ververst (zie `PublicQuestion` in `shared/types.js`).
   Weergeven: `<QuestionView :question="question" :reveal="..." />` of losse delen (`<QuestionMedia>`,
   `<QuestionOptions>`) uit `app/components/question/`.
5. **Nieuw antwoordtype** (bijv. `number` voor schatvragen)? Migratie die de `CHECK chk_questions_answer_type`
   uitbreidt (+ eventueel een eigen tabel voor extra gegevens), een label in `QuestionView.vue`, en de weergave.
   De mediastructuur blijft ongewijzigd.
6. **Nieuw mediatype?** Voeg het toe aan de `CHECK` op `question_media.kind` (via een migratie) en render het
   in de frontend.