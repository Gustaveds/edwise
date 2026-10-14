import db from '../db.js';

/**
 * Amplia o tipo de conteúdo "file" (arquivos diversos — código-fonte,
 * planilhas, compactados, etc. — que não são indexados pela IA, diferente
 * de pdf/word/text). Sem isso, qualquer upload de um formato não reconhecido
 * caía silenciosamente na categoria "pdf".
 */
export default async function runMigration() {
    await db.query(`
        ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_type_check;
        ALTER TABLE contents ADD CONSTRAINT contents_type_check
            CHECK (type = ANY (ARRAY['pdf', 'video', 'text', 'link', 'word', 'quiz', 'file']));
    `);
    console.log('✅ "file" adicionado como tipo válido de conteúdo em "contents".');
}
