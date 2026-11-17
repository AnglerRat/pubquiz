-- Voorbeeldquiz met alle soorten vragen (tekst, afbeeldingen, video, enkele en meervoudige keuze). Kan vaker gedraaid worden (npm run db:seed):
-- de bestaande "Voorbeeldquiz" en haar vragen worden eerst verwijderd.

DELETE q FROM questions q
  JOIN question_set_items i ON i.question_id = q.id
  JOIN question_sets s ON s.id = i.question_set_id
 WHERE s.title = 'Voorbeeldquiz';
DELETE FROM question_sets WHERE title = 'Voorbeeldquiz';

INSERT INTO question_sets (title, description)
VALUES ('Voorbeeldquiz', 'Voorbeeldvragen: tekst, afbeeldingen, video en keuzevragen.');
SET @set = LAST_INSERT_ID();

-- 1. Tekstvraag (geen media)
INSERT INTO questions (prompt, answer_type, correct_answer, points)
VALUES ('Wat is de hoofdstad van Australië?', 'open', '["Canberra"]', 1);
SET @q1 = LAST_INSERT_ID();

-- 2. Vraag met meerdere afbeeldingen
INSERT INTO questions (prompt, answer_type, correct_answer, points, host_notes)
VALUES ('Welke kleur krijg je als je deze twee kleuren verf mengt?', 'open', '["groen"]', 1,
        'Blauw + geel = groen');
SET @q2 = LAST_INSERT_ID();
INSERT INTO question_media (question_id, position, kind, url, caption) VALUES
  (@q2, 10, 'image', '/media/voorbeeld/blauw.svg', 'Kleur 1'),
  (@q2, 20, 'image', '/media/voorbeeld/geel.svg', 'Kleur 2');

-- 3. Vraag met een video (fragment van seconde 0 t/m 5)
INSERT INTO questions (prompt, answer_type, correct_answer, points, time_limit_seconds)
VALUES ('Wat zie je in deze video?', 'open', '["een bloem", "bloem"]', 2, 30);
SET @q3 = LAST_INSERT_ID();
INSERT INTO question_media (question_id, position, kind, url, caption, start_seconds, end_seconds) VALUES
  (@q3, 10, 'video', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', NULL, 0, 5);

-- 4. Keuzevraag met één goed antwoord
INSERT INTO questions (prompt, answer_type, points)
VALUES ('Welke planeet staat het dichtst bij de zon?', 'single_choice', 1);
SET @q4 = LAST_INSERT_ID();
INSERT INTO question_options (question_id, position, label, is_correct) VALUES
  (@q4, 10, 'Venus', 0),
  (@q4, 20, 'Mercurius', 1),
  (@q4, 30, 'Aarde', 0),
  (@q4, 40, 'Mars', 0);

-- 5. Keuzevraag met meerdere goede antwoorden
INSERT INTO questions (prompt, answer_type, points, host_notes)
VALUES ('Welke van deze dieren zijn zoogdieren?', 'multiple_choice', 2,
        'Dolfijn en vleermuis zijn zoogdieren; een haai is een vis, een pinguïn een vogel.');
SET @q5 = LAST_INSERT_ID();
INSERT INTO question_options (question_id, position, label, is_correct) VALUES
  (@q5, 10, 'Dolfijn', 1),
  (@q5, 20, 'Haai', 0),
  (@q5, 30, 'Vleermuis', 1),
  (@q5, 40, 'Pinguïn', 0);

-- Volgorde in de set
INSERT INTO question_set_items (question_set_id, question_id, position) VALUES
  (@set, @q1, 10),
  (@set, @q2, 20),
  (@set, @q3, 30),
  (@set, @q4, 40),
  (@set, @q5, 50);
