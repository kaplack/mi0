-- Actualizar restricción CHECK para admitir las 5 nuevas modalidades de victoria de letras
ALTER TABLE "bingo_rounds" DROP CONSTRAINT IF EXISTS "bingo_round_pattern";

ALTER TABLE "bingo_rounds" ADD CONSTRAINT "bingo_round_pattern" CHECK ("pattern" IN (
  'ONE',
  'TWO',
  'FULL',
  'LETTER_X',
  'LETTER_L',
  'LETTER_T',
  'LETTER_H',
  'LETTER_O'
));
