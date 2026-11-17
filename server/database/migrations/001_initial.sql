-- 001: oorspronkelijke opzet (kamers, spelers, antwoorden + een eerste quiz-structuur die in 002 wordt vervangen).

-- Quizzen en vragen: de inhoud. Nog niet in gebruik door de UI, maar klaar voor de game-flow.
CREATE TABLE IF NOT EXISTS quizzes (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title        VARCHAR(150) NOT NULL,
  description  TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questions (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id             INT UNSIGNED NOT NULL,
  position            INT UNSIGNED NOT NULL,              -- volgorde binnen de quiz (0-based)
  type                VARCHAR(32)  NOT NULL DEFAULT 'open', -- bijv. 'open', 'multiple_choice', 'estimate'
  text                TEXT NOT NULL,
  options             JSON NULL,                          -- bijv. ["A", "B", "C", "D"]
  correct_answer      JSON NULL,
  points              INT NOT NULL DEFAULT 1,
  time_limit_seconds  INT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_questions_quiz_position (quiz_id, position),
  CONSTRAINT fk_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Kamers: één spelsessie, beheerd door een game master.
CREATE TABLE IF NOT EXISTS rooms (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code                    CHAR(5) NOT NULL,                -- join-code, bijv. 'K7QXM'
  name                    VARCHAR(100) NOT NULL,
  host_token              CHAR(64) NOT NULL,               -- geheim van de game master
  quiz_id                 INT UNSIGNED NULL,
  status                  ENUM('lobby', 'playing', 'finished') NOT NULL DEFAULT 'lobby',
  current_question_index  INT UNSIGNED NULL,               -- NULL zolang het spel niet gestart is
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at              DATETIME NULL,
  finished_at             DATETIME NULL,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_code (code),
  UNIQUE KEY uq_rooms_host_token (host_token),
  CONSTRAINT fk_rooms_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Spelers in een kamer.
CREATE TABLE IF NOT EXISTS players (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(20) NOT NULL,
  avatar        VARCHAR(16) NOT NULL DEFAULT '🙂',
  token         CHAR(64) NOT NULL,                         -- geheim van de speler (voor herverbinden)
  is_connected  TINYINT(1) NOT NULL DEFAULT 0,
  score         INT NOT NULL DEFAULT 0,
  joined_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_players_token (token),
  UNIQUE KEY uq_players_room_name (room_id, name),         -- naam uniek per kamer (hoofdletterongevoelig)
  CONSTRAINT fk_players_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Gegeven antwoorden: één antwoord per speler per vraag.
CREATE TABLE IF NOT EXISTS answers (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id         INT UNSIGNED NOT NULL,
  player_id       INT UNSIGNED NOT NULL,
  question_index  INT UNSIGNED NOT NULL,
  question_id     INT UNSIGNED NULL,
  answer          JSON NOT NULL,
  is_correct      TINYINT(1) NULL,                          -- NULL = nog niet beoordeeld
  points_awarded  INT NOT NULL DEFAULT 0,
  answered_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_answers_player_question (room_id, player_id, question_index),
  KEY idx_answers_room_question (room_id, question_index),
  CONSTRAINT fk_answers_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_player FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE SET NULL
) ENGINE=InnoDB;
