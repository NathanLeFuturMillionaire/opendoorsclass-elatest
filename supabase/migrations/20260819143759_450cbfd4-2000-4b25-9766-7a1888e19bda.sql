ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS explanation text,
  ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 1;

-- Image based vocabulary items (Spanish, A1/A2)
INSERT INTO public.questions
  (language, level, category, question_type, question_text, options, correct_answer, image_url, image_alt, order_hint, is_active, explanation, points)
VALUES
  ('es','A1','vocabulary','image-choice','¿Qué es esto?',
   '["Una silla","Una mesa","Una puerta","Una ventana"]'::jsonb,'Una silla',
   '/__l5e/assets-v1/b1100af4-4619-4d17-8010-c13d0068ffea/es-chair.jpg','Una silla de madera',300,true,
   'La imagen muestra una silla de madera.',1),
  ('es','A1','vocabulary','image-choice','¿Qué fruta aparece en la imagen?',
   '["Una manzana","Una naranja","Un plátano","Una fresa"]'::jsonb,'Una manzana',
   '/__l5e/assets-v1/46826e3f-0bc3-4f9b-86a6-4ddcf264471a/es-apple.jpg','Una manzana roja',301,true,
   'La imagen muestra una manzana roja.',1),
  ('es','A1','vocabulary','image-choice','¿Qué animal es?',
   '["Un perro","Un gato","Un caballo","Un pájaro"]'::jsonb,'Un perro',
   '/__l5e/assets-v1/6cf76037-324c-40fe-b3c3-9ba2454ffe01/es-dog.jpg','Un perro sentado',302,true,
   'La imagen muestra un perro sentado.',1),
  ('es','A1','vocabulary','image-choice','¿Qué medio de transporte aparece en la imagen?',
   '["Un coche","Un autobús","Una bicicleta","Un avión"]'::jsonb,'Un coche',
   '/__l5e/assets-v1/bef017fb-acf8-475d-a6f3-874a551998a3/es-car.jpg','Un coche azul visto de lado',303,true,
   'La imagen muestra un coche.',1),
  ('es','A2','vocabulary','image-choice','¿Cuál es la profesión de la persona de la imagen?',
   '["Un médico","Un profesor","Un cocinero","Un policía"]'::jsonb,'Un médico',
   '/__l5e/assets-v1/6c5b779a-4e23-48f3-b7c6-89ce636c8075/es-doctor.jpg','Una persona con bata blanca y estetoscopio',304,true,
   'La bata blanca y el estetoscopio indican la profesión de médico.',1),
  ('es','A2','vocabulary','image-choice','¿Qué está haciendo la persona?',
   '["Está leyendo un libro","Está cocinando","Está durmiendo","Está corriendo"]'::jsonb,'Está leyendo un libro',
   '/__l5e/assets-v1/9a4d7eee-cd88-4331-95ba-4ecd899efbd8/es-reading-person.jpg','Una persona sentada leyendo un libro',305,true,
   'La persona sostiene un libro abierto, por lo tanto está leyendo.',1);

-- Listening items based on the official OpenDoorsClass Spanish audio
INSERT INTO public.questions
  (language, level, category, question_type, question_text, options, correct_answer, audio_url, max_plays, order_hint, is_active, explanation, points)
VALUES
  ('es','A1','listening','mcq','¿Cómo se llama la escuela que aparece en el audio?',
   '["OpenDoorsClass","OpenLanguageSchool","DoorsAcademy","ClassOpenGabon"]'::jsonb,'OpenDoorsClass',
   '/__l5e/assets-v1/0f531379-cabc-473f-b520-60ab0d21446e/es-listening-opendoorsclass.mp3',5,400,true,
   'El nombre OpenDoorsClass se repite varias veces en el anuncio.',1),
  ('es','A1','listening','mcq','¿Qué idioma se puede evaluar según el audio?',
   '["El inglés","El alemán","El portugués","El italiano"]'::jsonb,'El inglés',
   '/__l5e/assets-v1/0f531379-cabc-473f-b520-60ab0d21446e/es-listening-opendoorsclass.mp3',5,401,true,
   'El audio habla de descubrir tu verdadero nivel de inglés.',1),
  ('es','A1','listening','mcq','¿Qué país se menciona en el audio?',
   '["Gabón","España","México","Senegal"]'::jsonb,'Gabón',
   '/__l5e/assets-v1/0f531379-cabc-473f-b520-60ab0d21446e/es-listening-opendoorsclass.mp3',5,402,true,
   'El audio dice: en Gabón y en el mundo entero.',1),
  ('es','A2','listening','mcq','¿A quién está dirigida la evaluación presentada en el audio?',
   '["A estudiantes de todos los niveles","Solo a estudiantes avanzados","Solo a profesores de idiomas","Solo a niños de primaria"]'::jsonb,'A estudiantes de todos los niveles',
   '/__l5e/assets-v1/0f531379-cabc-473f-b520-60ab0d21446e/es-listening-opendoorsclass.mp3',5,403,true,
   'La evaluación está diseñada para estudiantes de todos los niveles.',1),
  ('es','A2','listening','mcq','Según el audio, ¿qué ofrece el equipo de la escuela?',
   '["Materiales claros, ejercicios prácticos y un seguimiento personalizado","Clases únicamente en línea y sin profesor","Un diploma oficial del Estado","Viajes gratuitos al extranjero"]'::jsonb,'Materiales claros, ejercicios prácticos y un seguimiento personalizado',
   '/__l5e/assets-v1/0f531379-cabc-473f-b520-60ab0d21446e/es-listening-opendoorsclass.mp3',5,404,true,
   'El audio enumera materiales pedagógicos claros, ejercicios prácticos y un seguimiento personalizado.',1),
  ('es','A2','listening','mcq','Según el audio, en OpenDoorsClass no solo aprendes inglés, también...',
   '["construyes tu futuro","ganas dinero rápidamente","aprendes a cocinar","viajas cada mes"]'::jsonb,'construyes tu futuro',
   '/__l5e/assets-v1/0f531379-cabc-473f-b520-60ab0d21446e/es-listening-opendoorsclass.mp3',5,405,true,
   'El audio dice: no solo aprendes inglés, construyes tu futuro.',1);

-- Written and spoken production
INSERT INTO public.questions
  (language, level, category, question_type, question_text, options, correct_answer, order_hint, is_active, explanation, points)
VALUES
  ('es','A2','writing','writing','Escribe un pequeño texto (60 a 100 palabras) sobre tu rutina diaria: qué haces por la mañana, por la tarde y por la noche.',
   '[]'::jsonb,'', 500, true, 'Producción escrita evaluada sobre la realización de la tarea, la gramática, el vocabulario y la ortografía.',1),
  ('es','A2','speaking','speaking','Preséntate en español y habla brevemente de tu vida: tu nombre, tu país, tu trabajo o tus estudios y por qué aprendes español.',
   '[]'::jsonb,'', 600, true, 'Producción oral evaluada sobre la fluidez, la gramática, el vocabulario y la coherencia.',1);