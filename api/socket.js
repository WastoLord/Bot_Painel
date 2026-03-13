const jwt = require('jsonwebtoken')
const ACCESS_SECRET = process.env.JWT_SECRET ?? 'troque_em_producao'

function attachSocket(io, manager) {
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token
        if (!token) return next(new Error('Token ausente.'))
        try {
            socket.user = jwt.verify(token, ACCESS_SECRET)
            next()
        } catch {
            next(new Error('Token inválido.'))
        }
    })

    io.on('connection', (socket) => {
        console.log(`[Socket] ${socket.user.username} conectou.`)

        socket.on('subscribe', ({ botId }) => {
            if (!botId) return

            // botId = "WastoLord_13_1" → owner = tudo menos o último segmento
            const parts    = botId.split('_')
            const botNumId = parts[parts.length - 1]
            const owner    = parts.slice(0, -1).join('_')

            if (owner !== socket.user.username && socket.user.role !== 'admin') {
                console.log(`[Socket] Acesso negado: ${socket.user.username} tentou acessar ${botId}`)
                socket.emit('error', { message: 'Acesso negado.' })
                return
            }

            socket.join(`bot:${botId}`)
            console.log(`[Socket] Subscribe: ${botId} | Sessions: ${[...manager.sessions.keys()].join(', ')}`)
            const st = manager.getStatus(botId)
            if (st) socket.emit('bot:status', { botId, data: st })
        })

        socket.on('unsubscribe', ({ botId }) => socket.leave(`bot:${botId}`))
        socket.on('disconnect', () => console.log(`[Socket] ${socket.user.username} desconectou.`))
    })

    manager.on('bot:status',  ({ botId, data })    => io.to(`bot:${botId}`).emit('bot:status',  { botId, data }))
    manager.on('bot:chat',    ({ botId, entry })   => io.to(`bot:${botId}`).emit('bot:chat',    { botId, entry }))
    manager.on('bot:error',   ({ botId, message }) => io.to(`bot:${botId}`).emit('bot:error',   { botId, message }))
    manager.on('bot:death',   ({ botId })          => io.to(`bot:${botId}`).emit('bot:death',   { botId }))
    manager.on('bot:ready',   ({ botId })          => io.to(`bot:${botId}`).emit('bot:ready',   { botId }))
    manager.on('bot:stopped', ({ botId })          => io.to(`bot:${botId}`).emit('bot:stopped', { botId }))
}

module.exports = { attachSocket }
