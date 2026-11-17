-- 002: vragensets, herbruikbare vragen en media.
--
--   question_sets ──< question_set_items >── questions ──< question_media
--        ▲                (volgorde)                         (0..n afbeeldingen / video's / ...)
--        └── rooms.question_set_id
--
-- • Een vraag staat los van een set en kan in meerdere sets voorkomen.
-- • Het "soort" vraag (tekst / afbeelding / video) volgt uit de media: geen media = tekstvraag.
-- • Hoe er geantwoord wordt staat los daarvan in questions.answer_type.

-- De ongebruikte quiz-structuur uit 001 opruimen.
ALTER TABLE rooms DROP FOREIGN KEY fk_rooms_quiz;
ALTER TABLE answers DROP FOREIGN KEY fk_answers_question;
DROP TABLE questions;
DROP TABLE quizzes;

-- Vragensets: wat je kiest bij het aanmaken van een kamer.
CREATE TABLE question_sets (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(150) NOT NULL,
  description  TEXT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,            -- 0 = verbergen in de keuzelijst
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Vragen: losse, herbruikbare vraaginstanties.
CREATE TABLE questions (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  prompt              TEXT NOT NULL,                       -- de vraagtekst
  answer_type         VARCHAR(32) NOT NULL DEFAULT 'open', -- hoe er geantwoord wordt: 'open' (later bijv. 'multiple_choice', 'number')
  correct_answer      JSON NULL,                           -- vorm hangt af van answer_type; 'open': ["Canberra", "canbera"]
  points              INT NOT NULL DEFAULT 1,
  time_limit_seconds  INT UNSIGNED NULL,                   -- NULL = geen tijdslimiet
  host_notes          TEXT NULL,                           -- alleen zichtbaar voor de game master
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Koppeling set ↔ vraag, met volgorde.
-- Tip: nummer met gaten (10, 20, 30…), dan kun je later makkelijk iets tussenvoegen (bijv. 15).
CREATE TABLE question_set_items (
  question_set_id  INT UNSIGNED NOT NULL,
  question_id      INT UNSIGNED NOT NULL,
  position         INT NOT NULL,
  PRIMARY KEY (question_set_id, question_id),
  KEY idx_question_set_items_order (question_set_id, position),
  CONSTRAINT fk_qsi_set FOREIGN KEY (question_set_id) REFERENCES question_sets (id) ON DELETE CASCADE,
  CONSTRAINT fk_qsi_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Media bij een vraag: 0..n stuks, elk met een eigen volgorde.
CREATE TABLE question_media (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id    INT UNSIGNED NOT NULL,
  position       INT NOT NULL DEFAULT 0,
  kind           VARCHAR(16) NOT NULL,                     -- 'image' | 'video' | 'audio'
  url            VARCHAR(1024) NOT NULL,                   -- '/media/...' (map public/media) of een volledige URL
  caption        VARCHAR(255) NULL,                        -- bijschrift / alt-tekst
  start_seconds  INT UNSIGNED NULL,                        -- video/audio: vanaf hier afspelen
  end_seconds    INT UNSIGNED NULL,                        -- video/audio: tot hier afspelen
  PRIMARY KEY (id),
  KEY idx_question_media_order (question_id, position),
  CONSTRAINT fk_question_media_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE,
  CONSTRAINT chk_question_media_kind CHECK (kind IN ('image', 'video', 'audio'))
) ENGINE=InnoDB;

-- Kamers verwijzen voortaan naar een vragenset.
ALTER TABLE rooms
  CHANGE quiz_id question_set_id INT UNSIGNED NULL,
  RENAME INDEX fk_rooms_quiz TO idx_rooms_question_set,
  ADD CONSTRAINT fk_rooms_question_set FOREIGN KEY (question_set_id) REFERENCES question_sets (id) ON DELETE SET NULL;

-- Antwoorden verwijzen naar de echte vraag (question_index blijft de plek in de set).
ALTER TABLE answers
  ADD CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE SET NULL;
