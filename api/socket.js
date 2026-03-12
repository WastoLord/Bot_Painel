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
            const [username] = botId.split('_')
            if (username !== socket.user.username && socket.user.role !== 'admin') {
                socket.emit('error', { message: 'Acesso negado.' }); return
            }
            socket.join(`bot:${botId}`)
            const status = manager.getStatus(botId)
            if (status) socket.emit('bot:status', { botId, data: status })
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
