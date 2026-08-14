ALTER TABLE students ADD COLUMN student_code TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code) WHERE student_code <> '';

UPDATE students
SET student_code = 'UASA-' || UPPER(SUBSTR(REPLACE(id,'-',''),1,6))
WHERE student_code IS NULL OR TRIM(student_code) = '';
