/**
 * api/db.js
 * Camada de banco de dados (SQLite via better-sqlite3).
 * Todas as queries são síncronas para simplicidade.
 */

const Database = require('better-sqlite3')
const path     = require('path')
const fs       = require('fs')

const DB_DIR  = path.join(__dirname, '..', 'data')
const DB_PATH = path.join(DB_DIR, 'panel.db')

let db = null

function init() {
    fs.mkdirSync(DB_DIR, { recursive: true })
    db = new Database(DB_PATH)

    // WAL mode: mais rápido para leituras concorrentes
    db.pragma('journal_mode = WAL')

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            username     TEXT UNIQUE NOT NULL,
            password     TEXT NOT NULL,   -- bcrypt hash
            role         TEXT DEFAULT 'client',  -- 'client' | 'admin'
            created_at   INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS bots (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL REFERENCES users(id),
            bot_name     TEXT NOT NULL,
            server_host  TEXT NOT NULL,
            server_port  INTEGER DEFAULT 25565,
            auth_mode    TEXT DEFAULT 'none',   -- 'none' | 'cracked' | 'microsoft'
            bot_password TEXT DEFAULT '',
            active       INTEGER DEFAULT 1,     -- 1 = contrato ativo
            expires_at   INTEGER,               -- unix timestamp, null = sem expiração
            created_at   INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES users(id),
            token      TEXT UNIQUE NOT NULL,
            expires_at INTEGER NOT NULL
        );
    `)

    console.log('[DB] Banco inicializado.')
    return Promise.resolve()
}

// ─── Usuários ────────────────────────────────────────────────────────────────

function createUser({ username, passwordHash, role = 'client' }) {
    return db.prepare(`
        INSERT INTO users (username, password, role) VALUES (?, ?, ?)
    `).run(username, passwordHash, role)
}

function getUserByUsername(username) {
    return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username)
}

function getUserById(id) {
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id)
}

// ─── Bots ────────────────────────────────────────────────────────────────────

function createBot({ userId, botName, serverHost, serverPort, authMode, botPassword, expiresAt }) {
    return db.prepare(`
        INSERT INTO bots (user_id, bot_name, server_host, server_port, auth_mode, bot_password, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, botName, serverHost, serverPort ?? 25565, authMode ?? 'none', botPassword ?? '', expiresAt ?? null)
}

function getBotsByUserId(userId) {
    return db.prepare(`
        SELECT b.*, u.username FROM bots b
        JOIN users u ON u.id = b.user_id
        WHERE b.user_id = ? AND b.active = 1
    `).all(userId)
}

function getBotById(id) {
    return db.prepare(`
        SELECT b.*, u.username FROM bots b
        JOIN users u ON u.id = b.user_id
        WHERE b.id = ?
    `).get(id)
}

function updateBot(id, fields) {
    const sets   = Object.keys(fields).map(k => `${k} = ?`).join(', ')
    const values = Object.values(fields)
    return db.prepare(`UPDATE bots SET ${sets} WHERE id = ?`).run(...values, id)
}

function deactivateBot(id) {
    return db.prepare(`UPDATE bots SET active = 0 WHERE id = ?`).run(id)
}

// Retorna todos os bots com contrato ativo e não expirado
function getBotsAtivos() {
    const agora = Math.floor(Date.now() / 1000)
    const rows = db.prepare(`
        SELECT b.*, u.username FROM bots b
        JOIN users u ON u.id = b.user_id
        WHERE b.active = 1
          AND (b.expires_at IS NULL OR b.expires_at > ?)
    `).all(agora)
    return Promise.resolve(rows)
}

// ─── Refresh Tokens ──────────────────────────────────────────────────────────

function saveRefreshToken({ userId, token, expiresAt }) {
    return db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)
    `).run(userId, token, expiresAt)
}

function getRefreshToken(token) {
    return db.prepare(`SELECT * FROM refresh_tokens WHERE token = ?`).get(token)
}

function deleteRefreshToken(token) {
    return db.prepare(`DELETE FROM refresh_tokens WHERE token = ?`).run(token)
}

function deleteRefreshTokensByUser(userId) {
    return db.prepare(`DELETE FROM refresh_tokens WHERE user_id = ?`).run(userId)
}

module.exports = {
    init,
    createUser, getUserByUsername, getUserById,
    createBot, getBotsByUserId, getBotById, updateBot, deactivateBot, getBotsAtivos,
    saveRefreshToken, getRefreshToken, deleteRefreshToken, deleteRefreshTokensByUser
}
