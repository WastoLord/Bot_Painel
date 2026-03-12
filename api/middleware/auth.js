const jwt = require('jsonwebtoken')
const ACCESS_SECRET = process.env.JWT_SECRET ?? 'troque_em_producao'

function requireAuth(req, res, next) {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token ausente.' })
    const token = header.slice(7)
    try {
        req.user = jwt.verify(token, ACCESS_SECRET)
        next()
    } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado.' })
    }
}

function requireAdmin(req, res, next) {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito a admins.' })
    next()
}

module.exports = { requireAuth, requireAdmin }
