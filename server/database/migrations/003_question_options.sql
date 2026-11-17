-- 003: keuzevragen (single_choice / multiple_choice).
--
--   questions ──< question_options   (0..n antwoordopties, op volgorde, met is_correct)
--
-- answer_type bepaalt hoe er geantwoord wordt:
--   'open'             → vrije tekst; goede antwoorden in questions.correct_answer, bijv. ["Canberra"]
--   'single_choice'    → één optie kiezen; precies één optie met is_correct = 1
--   'multiple_choice'  → meerdere opties kiezen; één of meer opties met is_correct = 1
-- Bij keuzevragen blijft questions.correct_answer leeg: de waarheid staat in question_options.

CREATE TABLE question_options (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id  INT UNSIGNED NOT NULL,
  position     INT NOT NULL DEFAULT 0,
  label        VARCHAR(255) NOT NULL,
  is_correct   TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_question_options_order (question_id, position),
  CONSTRAINT fk_question_options_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Alleen bekende antwoordtypes toestaan. Een nieuw type = nieuwe migratie die deze CHECK aanpast.
ALTER TABLE questions
  ADD CONSTRAINT chk_questions_answer_type CHECK (answer_type IN ('open', 'single_choice', 'multiple_choice'));
