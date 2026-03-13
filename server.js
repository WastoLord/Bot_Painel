/**
 * server.js
 * Ponto de entrada da API.
 * Inicia o Express + Socket.io e restaura bots ativos do banco.
 *
 * Uso: node server.js
 */

const express    = require('express')
const http       = require('http')
const { Server } = require('socket.io')
const cors       = require('cors')
const path       = require('path')

const db         = require('./api/db')
const manager    = require('./bot/BotManager')
const { attachSocket } = require('./api/socket')

const authRoutes = require('./api/routes/auth')
const botRoutes  = require('./api/routes/bots')

const PORT = process.env.PORT ?? 3000

async function main() {
    // 1. Banco de dados
    await db.init()

    // 2. Express
    const app    = express()
    const server = http.createServer(app)
    const io     = new Server(server, { cors: { origin: '*' } })

    app.use(cors())
    app.use(express.json())

    // 3. Rotas
    app.use('/api/auth', authRoutes)
    app.use('/api/bots', botRoutes)

    // Health check
    app.get('/api/health', (_, res) => res.json({ ok: true }))

    // 4. WebSocket
    attachSocket(io, manager)

    // 5. Inicia servidor
    server.listen(PORT, () => {
        console.log(`[Server] API rodando em http://localhost:${PORT}`)
    })

    // 6. Restaura bots de clientes com contrato ativo
    await restaurarBots()
}

async function restaurarBots() {
    const ativos = await db.getBotsAtivos()
    console.log(`[Server] Restaurando ${ativos.length} bot(s) ativo(s)...`)

    for (const cliente of ativos) {
        manager.start({
            botId:    `${cliente.username}_${cliente.id}`,
            botName:  cliente.bot_name,
            owner:    cliente.username,
            password: cliente.bot_password ?? '',
            authMode: cliente.auth_mode ?? 'none',
            host:     cliente.server_host,
            port:     cliente.server_port ?? 25565
        })
    }
}

main().catch(err => {
    console.error('[Server] Erro fatal:', err)
    process.exit(1)
})
