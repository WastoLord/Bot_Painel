/**
 * BotWorker.js
 * Roda em um processo filho separado (child_process.fork).
 * Um processo por bot — falha em um não derruba os outros.
 *
 * Comunicação com o BotManager via process.send / process.on('message')
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

const mineflayer   = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
const pvp          = require('mineflayer-pvp').plugin
const Context      = require('../core/context')
const { createModuleSet } = require('../modules/index')

// --- Configuração recebida via env (injetada pelo BotManager) ---
const CONFIG = {
    host:     process.env.BOT_HOST,
    port:     parseInt(process.env.BOT_PORT ?? '25565'),
    username: process.env.BOT_NAME,
    password: process.env.BOT_PASSWORD,
    auth:     'offline',
    version:  '1.21.4',
    checkTimeoutInterval: 120 * 1000
}

const OWNER = process.env.BOT_OWNER

let bot = null
let ctx = null
let tickInterval = null
let reconnectTimer = null

// --- Inicializa o bot ---
function init() {
    if (reconnectTimer) clearTimeout(reconnectTimer)

    bot = mineflayer.createBot(CONFIG)
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(pvp)

    ctx = Context.create({
        dono:     OWNER,
        botName:  CONFIG.username,
        password: CONFIG.password
    })

    bot.once('spawn', onSpawn)
    bot.on('death',   onDeath)
    bot.on('end',     onEnd)
    bot.on('error',   onError)

    // Bridge: repassa eventos panel:chat ao processo pai
    bot.on('panel:chat', (entry) => {
        process.send({ type: 'chat', entry })
    })
}

function onSpawn() {
    // Login no servidor
    setTimeout(() => bot.chat('/login ' + CONFIG.password), 2000)

    // Inicia tick loop (20 ticks/s → verifica a cada 50ms)
    tickInterval = setInterval(runTick, 50)

    // Carrega módulos com enabled: true por padrão
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
        bot.respawn()
        bot.chat('/home')
    }, 5000)
}

function onEnd() {
    clearInterval(tickInterval)
    unloadAllModules()
    process.send({ type: 'error', message: 'Conexão perdida. Reconectando em 15s...' })
    reconnectTimer = setTimeout(init, 15000)
}

function onError(err) {
    process.send({ type: 'error', message: err.message })
}

// --- Tick loop: chama tick() de cada módulo ativo ---
function runTick() {
    if (!bot?.entity) return
    for (const mod of ctx.modules) {
        if (mod.enabled && typeof mod.tick === 'function') {
            try { mod.tick(bot, ctx) } catch {}
        }
    }
}

// --- Gerenciamento de módulos ---
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
    return ctx.modules.find(m => m.name === name)
}

// --- Status snapshot enviado ao painel ---
function sendStatus() {
    if (!bot?.entity) return
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

// Envia status a cada 5s
setInterval(() => { if (bot?.entity) sendStatus() }, 5000)

// --- Mensagens recebidas do BotManager ---
process.on('message', (msg) => {
    if (!msg?.type) return

    switch (msg.type) {

        case 'module:enable': {
            const mod = getModule(msg.name)
            if (!mod) return
            if (!mod.enabled) loadModule(mod)
            sendStatus()
            break
        }

        case 'module:disable': {
            const mod = getModule(msg.name)
            if (!mod) return
            if (mod.enabled) unloadModule(mod)
            sendStatus()
            break
        }

        case 'module:config': {
            const mod = getModule(msg.name)
            if (!mod) return
            mod.config = { ...mod.config, ...msg.config }
            // Recarrega se estiver ativo para aplicar nova config
            if (mod.enabled) {
                unloadModule(mod)
                loadModule(mod)
            }
            sendStatus()
            break
        }

        case 'chat:send': {
            const chatMod = getModule('chat')
            if (chatMod?.enabled) {
                chatMod.sendMessage(bot, ctx, msg.message)
            } else {
                bot.chat(msg.message)
            }
            break
        }

        case 'action': {
            // Chama método arbitrário de um módulo (ex: movement.follow, automation.dropItems)
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
            clearInterval(tickInterval)
            unloadAllModules()
            if (bot) {
                try { bot.quit() } catch {}
            }
            process.send({ type: 'stopped' })
            setTimeout(() => process.exit(0), 1000)
            break
        }
    }
})

// --- Inicia ---
init()
