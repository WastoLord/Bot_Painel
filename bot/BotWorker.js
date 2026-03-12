/**
 * BotWorker.js
 * Roda em um processo filho separado (child_process.fork).
 * Um processo por bot — falha em um não derruba os outros.
 *
 * Mensagens recebidas do pai:
 *   { type: 'module:enable',  name }
 *   { type: 'module:disable', name }
 *   { type: 'module:config',  name, config }
 *   { type: 'chat:send',      message }
 *   { type: 'action',         module, method, args }
 *   { type: 'stop' }
 *
 * Mensagens enviadas ao pai:
 *   { type: 'ready' }
 *   { type: 'status', data }
 *   { type: 'chat',   entry }
 *   { type: 'error',  message }
 *   { type: 'death' }
 *   { type: 'stopped' }
 */

process.title = `bot-worker-${process.env.BOT_NAME ?? 'unknown'}`

const mineflayer     = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
const pvp            = require('mineflayer-pvp').plugin
const Context        = require('../core/context')
const { buildConnConfig } = require('../modules/auth')

const OWNER = process.env.BOT_OWNER

const CONFIG = buildConnConfig({
    mode:     process.env.BOT_AUTH_MODE ?? 'cracked',
    host:     process.env.BOT_HOST,
    port:     parseInt(process.env.BOT_PORT ?? '25565'),
    botName:  process.env.BOT_NAME,
    password: process.env.BOT_PASSWORD ?? '',
    owner:    OWNER,
    version:  process.env.BOT_VERSION ?? '1.21.4'
})

let bot            = null
let ctx            = null
let isSpawned      = false
let tickInterval   = null
let statusInterval = null
let reconnectTimer = null

// Só chama bot.chat se realmente conectado e spawnado
function safeChat(message) {
    if (!isSpawned || !bot?._client) return
    try { bot.chat(message) } catch (e) {
        process.send({ type: 'error', message: `safeChat falhou: ${e.message}` })
    }
}

// ─── Inicialização ──────────────────────────────────────────────────────────
function init() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }

    // Remove todos os listeners do bot anterior antes de criar um novo
    // Isso evita que eventos do bot morto disparem no bot novo
    if (bot) {
        bot.removeAllListeners()
        try { bot.quit() } catch {}
        bot = null
    }

    isSpawned = false

    bot = mineflayer.createBot(CONFIG)
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(pvp)

    ctx = Context.create({
        dono:     OWNER,
        botName:  CONFIG.username,
        password: CONFIG.password ?? ''
    })

    bot.once('spawn', onSpawn)
    bot.on('death',   onDeath)
    bot.on('end',     onEnd)
    bot.on('error',   onError)

    bot.on('panel:chat', (entry) => process.send({ type: 'chat', entry }))
}

function onSpawn() {
    isSpawned = true

    if (tickInterval)   clearInterval(tickInterval)
    if (statusInterval) clearInterval(statusInterval)

    tickInterval   = setInterval(runTick, 50)
    statusInterval = setInterval(sendStatus, 5000)

    for (const mod of ctx.modules) {
        if (mod.enabled) loadModule(mod)
    }

    sendStatus()
    process.send({ type: 'ready' })
}

function onDeath() {
    process.send({ type: 'death' })
    unloadAllModules()
    setTimeout(() => {
        if (!isSpawned) return
        try { bot.respawn() } catch {}
    }, 5000)
}

function onEnd() {
    isSpawned = false
    clearInterval(tickInterval)
    clearInterval(statusInterval)
    unloadAllModules()
    process.send({ type: 'error', message: 'Conexão perdida. Reconectando em 15s...' })
    reconnectTimer = setTimeout(init, 15000)
}

function onError(err) {
    process.send({ type: 'error', message: err.message })
}

// ─── Tick ───────────────────────────────────────────────────────────────────
function runTick() {
    if (!isSpawned || !bot?.entity) return
    for (const mod of ctx.modules) {
        if (mod.enabled && typeof mod.tick === 'function') {
            try { mod.tick(bot, ctx) } catch {}
        }
    }
}

// ─── Módulos ────────────────────────────────────────────────────────────────
function loadModule(mod) {
    try {
        mod.onLoad(bot, ctx)
        mod.enabled = true
    } catch (e) {
        process.send({ type: 'error', message: `Erro ao carregar ${mod.name}: ${e.message}` })
    }
}

function unloadModule(mod) {
    try {
        mod.onUnload(bot, ctx)
        mod.enabled = false
    } catch (e) {
        process.send({ type: 'error', message: `Erro ao descarregar ${mod.name}: ${e.message}` })
    }
}

function unloadAllModules() {
    for (const mod of ctx.modules) {
        if (mod.enabled) unloadModule(mod)
    }
}

function getModule(name) {
    return ctx?.modules?.find(m => m.name === name)
}

// ─── Status ─────────────────────────────────────────────────────────────────
function sendStatus() {
    if (!isSpawned || !bot?.entity) return
    process.send({
        type: 'status',
        data: {
            online:    true,
            health:    Math.round(bot.health ?? 0),
            food:      Math.round(bot.food ?? 0),
            position:  bot.entity?.position ?? null,
            dimension: bot.game?.dimension ?? 'unknown',
            ping:      bot.player?.ping ?? 0,
            modules:   ctx.modules.map(m => ({
                name:    m.name,
                label:   m.label,
                enabled: m.enabled,
                config:  m.config
            }))
        }
    })
}

// ─── Mensagens do BotManager ────────────────────────────────────────────────
process.on('message', (msg) => {
    if (!msg?.type) return

    switch (msg.type) {

        case 'module:enable': {
            const mod = getModule(msg.name)
            if (!mod || mod.enabled) return
            loadModule(mod)
            sendStatus()
            break
        }

        case 'module:disable': {
            const mod = getModule(msg.name)
            if (!mod || !mod.enabled) return
            unloadModule(mod)
            sendStatus()
            break
        }

        case 'module:config': {
            const mod = getModule(msg.name)
            if (!mod) return
            mod.config = { ...mod.config, ...msg.config }
            if (mod.enabled) {
                unloadModule(mod)
                loadModule(mod)
            }
            sendStatus()
            break
        }

        case 'chat:send': {
            if (!isSpawned) {
                process.send({ type: 'error', message: 'Bot não está conectado.' })
                return
            }
            const chatMod = getModule('chat')
            if (chatMod?.enabled && typeof chatMod.send === 'function') {
                chatMod.send(bot, ctx, msg.message)
            } else {
                safeChat(msg.message)
            }
            break
        }

        case 'action': {
            if (!isSpawned) {
                process.send({ type: 'error', message: 'Bot não está conectado.' })
                return
            }
            const mod = getModule(msg.module)
            if (!mod || typeof mod[msg.method] !== 'function') return
            try {
                mod[msg.method](bot, ctx, ...(msg.args ?? []))
            } catch (e) {
                process.send({ type: 'error', message: e.message })
            }
            break
        }

        case 'stop': {
            isSpawned = false
            clearInterval(tickInterval)
            clearInterval(statusInterval)
            unloadAllModules()
            try { bot?.quit() } catch {}
            process.send({ type: 'stopped' })
            setTimeout(() => process.exit(0), 1000)
            break
        }
    }
})

// ─── Inicia ──────────────────────────────────────────────────────────────────
init()
