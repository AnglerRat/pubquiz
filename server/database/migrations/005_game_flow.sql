-- 005: spelverloop per vraag (timer, antwoorden sluiten, onthullen) + antwoordtijden in milliseconden.
--
--   rooms ──< room_questions   (één rij per getoonde vraag, aangemaakt zodra de vraag voor het eerst in beeld komt)
--
-- • opened_at  → wanneer de vraag (en de timer) begon
-- • closes_at  → deadline voor antwoorden; NULL = geen tijdslimiet
-- • locked_at  → antwoorden gesloten (gebeurt bij het onthullen van het antwoord)
-- • revealed   → het goede antwoord is zichtbaar voor iedereen
-- Ga je terug naar een eerdere vraag, dan blijft de staat van die vraag bewaard (de timer loopt niet opnieuw,
-- tenzij de game master hem herstart).

CREATE TABLE room_questions (
  room_id         INT UNSIGNED NOT NULL,
  question_index  INT UNSIGNED NOT NULL,
  question_id     INT UNSIGNED NULL,
  opened_at       DATETIME(3) NOT NULL,
  closes_at       DATETIME(3) NULL,
  locked_at       DATETIME(3) NULL,
  revealed        TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, question_index),
  CONSTRAINT fk_room_questions_room FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE CASCADE,
  CONSTRAINT fk_room_questions_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE answers
  MODIFY answered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
