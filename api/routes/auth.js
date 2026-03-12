const express = require('express')
const bcrypt  = require('bcrypt')
const jwt     = require('jsonwebtoken')
const crypto  = require('crypto')
const db      = require('../db')

const router = express.Router()

const ACCESS_SECRET   = process.env.JWT_SECRET         ?? 'troque_em_producao'
const REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET ?? 'refresh_troque_em_producao'
const ACCESS_EXPIRES  = '15m'
const REFRESH_EXPIRES = 7 * 24 * 60 * 60

function makeAccessToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES }
    )
}

function makeRefreshToken() {
    return crypto.randomBytes(40).toString('hex')
}

router.post('/register', async (req, res) => {
    const { username, password } = req.body ?? {}
    if (!username || !password) return res.status(400).json({ error: 'username e password são obrigatórios.' })
    if (username.length < 3 || username.length > 20) return res.status(400).json({ error: 'username deve ter entre 3 e 20 caracteres.' })
    if (password.length < 6) return res.status(400).json({ error: 'password deve ter pelo menos 6 caracteres.' })
    if (db.getUserByUsername(username)) return res.status(409).json({ error: 'Username já existe.' })
    const hash   = await bcrypt.hash(password, 10)
    const result = db.createUser({ username, passwordHash: hash })
    return res.status(201).json({ id: result.lastInsertRowid, username })
})

router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {}
    if (!username || !password) return res.status(400).json({ error: 'username e password são obrigatórios.' })
    const user = db.getUserByUsername(username)
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' })
    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'Credenciais inválidas.' })
    const accessToken  = makeAccessToken(user)
    const refreshToken = makeRefreshToken()
    const expiresAt    = Math.floor(Date.now() / 1000) + REFRESH_EXPIRES
    db.saveRefreshToken({ userId: user.id, token: refreshToken, expiresAt })
    return res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username, role: user.role }
    })
})

router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body ?? {}
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken ausente.' })
    const record = db.getRefreshToken(refreshToken)
    if (!record) return res.status(401).json({ error: 'Refresh token inválido.' })
    const agora = Math.floor(Date.now() / 1000)
    if (record.expires_at < agora) {
        db.deleteRefreshToken(refreshToken)
        return res.status(401).json({ error: 'Refresh token expirado.' })
    }
    const user = db.getUserById(record.user_id)
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' })
    const newAccessToken  = makeAccessToken(user)
    const newRefreshToken = makeRefreshToken()
    db.deleteRefreshToken(refreshToken)
    db.saveRefreshToken({ userId: user.id, token: newRefreshToken, expiresAt: agora + REFRESH_EXPIRES })
    return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
})

router.post('/logout', (req, res) => {
    const { refreshToken } = req.body ?? {}
    if (refreshToken) db.deleteRefreshToken(refreshToken)
    return res.json({ ok: true })
})

module.exports = router
