-- Script para resetar as migrações e tabelas
-- Execute este script com: node reset-migrations.js

-- Passo 1: Apagar as tabelas com schema antigo (ordem importa devido às foreign keys)
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS saved_flashcards CASCADE;
DROP TABLE IF EXISTS generated_quizzes CASCADE;

-- Passo 2: Remover os registros de migrações executadas
DELETE FROM migrations WHERE name IN (
    '202512020003-create-chat-history-table.js',
    '202512020004-create-notes-table.js',
    '202512020005-create-generated-quizzes-table.js',
    '202512020005-create-saved-flashcards-table.js'
);

-- Agora você pode executar: npm run migrate
