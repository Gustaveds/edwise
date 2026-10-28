// Testes de integração: rodam contra o servidor real (backend/index.js já
// em execução) + banco de dados real, exatamente como descrito na seção 24
// da documentação. Não sobem o servidor sozinhos — veja scripts/run-tests.sh.
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

const CREDENTIALS = {
    admin: { email: 'admin@edwise.ai', password: process.env.SEED_ADMIN_PASSWORD || 'admin123' },
    professor: { email: 'professor@edwise.ai', password: '123456' },
    student: { email: 'student@edwise.ai', password: '123456' },
};

async function login(role) {
    const res = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CREDENTIALS[role]),
    });
    if (res.status !== 200) {
        throw new Error(`login de ${role} falhou com status ${res.status} — rode scripts/run-tests.sh para garantir que o servidor e os usuários de teste existem`);
    }
    return res.json();
}

before(async () => {
    const health = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    if (!health || !health.ok) {
        throw new Error(
            `Backend não respondeu em ${BASE_URL}/api/health. ` +
            'Suba o ambiente antes de rodar os testes de integração (ex: ./scripts/run-tests.sh).'
        );
    }
});

describe('POST /api/login', () => {
    test('autentica cada perfil de teste e retorna um JWT com o role correto', async () => {
        for (const role of ['admin', 'professor', 'student']) {
            const body = await login(role);
            assert.ok(body.token, `deveria retornar token para ${role}`);
            assert.equal(body.user.role, role === 'admin' ? 'admin' : role);
        }
    });

    test('rejeita credenciais inválidas com 401', async () => {
        const res = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@edwise.ai', password: 'senha-errada' }),
        });
        assert.equal(res.status, 401);
    });
});

describe('Autenticação exigida (RNE-002 / RNF-002)', () => {
    test('rotas protegidas recusam requisições sem token (401)', async () => {
        const res = await fetch(`${BASE_URL}/api/courses`);
        assert.equal(res.status, 401);
    });

    test('rotas protegidas recusam um token inválido (403)', async () => {
        const res = await fetch(`${BASE_URL}/api/courses`, {
            headers: { Authorization: 'Bearer token-forjado-invalido' },
        });
        assert.equal(res.status, 403);
    });
});

describe('RBAC — criação de curso (RNE-002)', () => {
    test('aluno não pode criar curso (403)', async () => {
        const { token } = await login('student');
        const res = await fetch(`${BASE_URL}/api/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: 'Curso criado por aluno (não deveria existir)' }),
        });
        assert.equal(res.status, 403);
    });

    test('professor pode criar curso (e o curso é removido ao final do teste)', async () => {
        const { token } = await login('professor');
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

        const createRes = await fetch(`${BASE_URL}/api/courses`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ title: `Curso de teste de integração ${Date.now()}`, description: 'criado pelos testes automatizados' }),
        });
        assert.equal(createRes.status, 200);
        const course = await createRes.json();
        assert.ok(course.id, 'curso criado deveria retornar um id');

        const deleteRes = await fetch(`${BASE_URL}/api/courses/${course.id}`, { method: 'DELETE', headers });
        assert.ok(deleteRes.ok, 'limpeza do curso de teste deveria funcionar');
    });
});
