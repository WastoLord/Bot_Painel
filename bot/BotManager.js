/**
 * BotManager.js
 * Gerencia todas as instâncias de bot do painel.
 * Cada bot roda em um processo filho isolado (BotWorker).
 *
 * Substitui o sistema de tmux + worker_loader.js.
 */

const { fork }   = require('child_process')
const path       = require('path')
const EventEmitter = require('events')

const WORKER_PATH = path.join(__dirname, 'BotWorker.js')

class BotManager extends EventEmitter {

    constructor() {
        super()
        /** @type {Map<string, BotSession>} botId → sessão */
        this.sessions = new Map()
    }

    /**
     * Inicia um bot para um cliente.
     * @param {Object} opts
     * @param {string} opts.botId     - ID único (ex: nome do cliente)
     * @param {string} opts.botName   - Nick do bot no servidor
     * @param {string} opts.owner     - Nick do dono (cliente)
     * @param {string} opts.password  - Senha do bot
     * @param {string} opts.host      - Host do servidor MC
     * @param {number} opts.port      - Porta do servidor MC
     */
    start(opts) {
        const { botId } = opts

        if (this.sessions.has(botId)) {
            console.log(`[BotManager] Bot ${botId} já está rodando.`)
            return
        }

        console.log(`[BotManager] Iniciando bot ${opts.botName} para ${opts.owner}...`)

        const child = fork(WORKER_PATH, [], {
            env: {
                ...process.env,
                BOT_HOST:     opts.host,
                BOT_PORT:     String(opts.port ?? 25565),
                BOT_NAME:     opts.botName,
                BOT_PASSWORD: opts.password,
                BOT_OWNER:    opts.owner
            },
            silent: false
        })

        const session = {
            botId,
            botName:  opts.botName,
            owner:    opts.owner,
            child,
            status:   null,
            chatHistory: [],
            startedAt: Date.now()
        }

        // --- Mensagens do worker ---
        child.on('message', (msg) => this._handleWorkerMessage(botId, session, msg))

        child.on('exit', (code) => {
            console.log(`[BotManager] Bot ${botId} encerrado (código ${code}).`)
            this.sessions.delete(botId)
            this.emit('bot:stopped', { botId })
        })

        child.on('error', (err) => {
            console.error(`[BotManager] Erro no processo de ${botId}:`, err.message)
            this.emit('bot:error', { botId, message: err.message })
        })

        this.sessions.set(botId, session)
        return session
    }

    /** Para um bot e encerra o processo filho */
    stop(botId) {
        const session = this.sessions.get(botId)
        if (!session) return

        console.log(`[BotManager] Parando bot ${botId}...`)
        session.child.send({ type: 'stop' })

        // Force kill após 10s se não responder
        setTimeout(() => {
            if (this.sessions.has(botId)) {
                session.child.kill()
                this.sessions.delete(botId)
            }
        }, 10000)
    }

    /** Para todos os bots */
    stopAll() {
        for (const botId of this.sessions.keys()) {
            this.stop(botId)
        }
    }

    // ─── Controle de módulos ────────────────────────────────────────

    enableModule(botId, moduleName) {
        this._send(botId, { type: 'module:enable', name: moduleName })
    }

    disableModule(botId, moduleName) {
        this._send(botId, { type: 'module:disable', name: moduleName })
    }

    updateModuleConfig(botId, moduleName, config) {
        this._send(botId, { type: 'module:config', name: moduleName, config })
    }

    // ─── Chat ───────────────────────────────────────────────────────

    sendChat(botId, message) {
        this._send(botId, { type: 'chat:send', message })
    }

    getChatHistory(botId) {
        return this.sessions.get(botId)?.chatHistory ?? []
    }

    // ─── Ações de módulos (movement.follow, automation.dropItems...) ─

    callAction(botId, module, method, args = []) {
        this._send(botId, { type: 'action', module, method, args })
    }

    // ─── Status ─────────────────────────────────────────────────────

    getStatus(botId) {
        const session = this.sessions.get(botId)
        if (!session) return null
        return {
            botId,
            botName:   session.botName,
            owner:     session.owner,
            startedAt: session.startedAt,
            uptime:    Date.now() - session.startedAt,
            ...session.status
        }
    }

    getAllStatuses() {
        const result = {}
        for (const botId of this.sessions.keys()) {
            result[botId] = this.getStatus(botId)
        }
        return result
    }

    listByOwner(owner) {
        return [...this.sessions.values()]
            .filter(s => s.owner === owner)
            .map(s => this.getStatus(s.botId))
    }

    // ─── Interno ────────────────────────────────────────────────────

    _send(botId, msg) {
        const session = this.sessions.get(botId)
        if (!session) {
            console.warn(`[BotManager] Bot ${botId} não encontrado.`)
            return
        }
        session.child.send(msg)
    }

    _handleWorkerMessage(botId, session, msg) {
        if (!msg?.type) return

        switch (msg.type) {

            case 'ready':
                console.log(`[BotManager] Bot ${botId} online.`)
                this.emit('bot:ready', { botId })
                break

            case 'status':
                session.status = msg.data
                this.emit('bot:status', { botId, data: msg.data })
                break

            case 'chat':
                session.chatHistory.push(msg.entry)
                if (session.chatHistory.length > 200) session.chatHistory.shift()
                this.emit('bot:chat', { botId, entry: msg.entry })
                break

            case 'death':
                this.emit('bot:death', { botId })
                break

            case 'error':
                console.error(`[BotManager] [${botId}] ${msg.message}`)
                this.emit('bot:error', { botId, message: msg.message })
                break

            case 'stopped':
                this.sessions.delete(botId)
                this.emit('bot:stopped', { botId })
                break
        }
    }
}

// Singleton — um BotManager para toda a aplicação
module.exports = new BotManager()
