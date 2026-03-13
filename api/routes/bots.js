const express = require('express')
const db      = require('../db')
const manager = require('../../bot/BotManager')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

function botId(row)  { return `${row.username}_${row.id}` }

function ensureOwner(req, res, bot) {
    if (!bot) return res.status(404).json({ error: 'Bot não encontrado.' })
    if (bot.user_id !== req.user.id && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Acesso negado.' }); return false
    }
    return true
}

router.get('/', (req, res) => {
    const bots = db.getBotsByUserId(req.user.id)
    res.json(bots.map(bot => {
        const id     = botId(bot)
        const status = manager.getStatus(id)
        return { id: bot.id, botId: id, botName: bot.bot_name, serverHost: bot.server_host, serverPort: bot.server_port, authMode: bot.auth_mode, expiresAt: bot.expires_at, owner: req.user.username, online: status?.online ?? false, health: status?.health ?? 0, food: status?.food ?? 0, modules: status?.modules ?? [] }
    }))
})

router.post('/', (req, res) => {
    const { botName, serverHost, serverPort, authMode, botPassword, expiresAt } = req.body ?? {}
    if (!botName || !serverHost) return res.status(400).json({ error: 'botName e serverHost são obrigatórios.' })
    const result = db.createBot({ userId: req.user.id, botName, serverHost, serverPort: serverPort ?? 25565, authMode: authMode ?? 'none', botPassword: botPassword ?? '', expiresAt: expiresAt ?? null })
    const bot = db.getBotById(result.lastInsertRowid)
    const id  = botId(bot)
    manager.start({ botId: id, botName: bot.bot_name, owner: req.user.username, password: bot.bot_password ?? '', authMode: bot.auth_mode, host: bot.server_host, port: bot.server_port })
    res.status(201).json({ id: bot.id, botId: id, botName: bot.bot_name, serverHost: bot.server_host, serverPort: bot.server_port, authMode: bot.auth_mode, owner: req.user.username, online: false })
})

router.get('/:id', (req, res) => {
    const bot = db.getBotById(req.params.id)
    if (!ensureOwner(req, res, bot)) return
    const id = botId(bot)
    res.json({ id: bot.id, botId: id, botName: bot.bot_name, serverHost: bot.server_host, serverPort: bot.server_port, authMode: bot.auth_mode, expiresAt: bot.expires_at, status: manager.getStatus(id) ?? { online: false } })
})

router.delete('/:id', (req, res) => {
    const bot = db.getBotById(req.params.id)
    if (!ensureOwner(req, res, bot)) return
    manager.stop(botId(bot))
    db.deactivateBot(bot.id)
    res.json({ ok: true })
})

router.post('/:id/chat', (req, res) => {
    const bot = db.getBotById(req.params.id)
    if (!ensureOwner(req, res, bot)) return
    const { message } = req.body ?? {}
    if (!message) return res.status(400).json({ error: 'message é obrigatório.' })
    manager.sendChat(botId(bot), message)
    res.json({ ok: true })
})

router.post('/:id/modules/:name/enable', (req, res) => {
    const bot = db.getBotById(req.params.id)
    if (!ensureOwner(req, res, bot)) return
    manager.enableModule(botId(bot), req.params.name)
    res.json({ ok: true })
})

router.post('/:id/modules/:name/disable', (req, res) => {
    const bot = db.getBotById(req.params.id)
    if (!ensureOwner(req, res, bot)) return
    manager.disableModule(botId(bot), req.params.name)
    res.json({ ok: true })
})

router.patch('/:id/modules/:name/config', (req, res) => {
    const bot = db.getBotById(req.params.id)
    if (!ensureOwner(req, res, bot)) return
    const { config } = req.body ?? {}
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'config deve ser um objeto.' })
    manager.updateModuleConfig(botId(bot), req.params.name, config)
    res.json({ ok: true })
})

module.exports = router
