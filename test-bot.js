/**
 * test-bot.js
 * Teste do BotManager — aguarda eventos reais antes de agir.
 * Uso: node test-bot.js
 */

const manager = require('./bot/BotManager')

const OPTS = {
    botId:    'teste_wasto',
    botName:  'Plasma_Teste',
    owner:    'WastoLord_13',
    password: '',
    authMode: 'none',
    host:     'jogar.craftsapiens.com.br',
    port:     25565
}

console.log('Iniciando teste do BotManager...')
manager.start(OPTS)

// Só age depois que o bot confirmou que está pronto
manager.on('bot:ready', ({ botId }) => {
    console.log(`[OK] Bot ${botId} pronto!`)

    // Ativa combate após confirmar que está online
    setTimeout(() => {
        console.log('[Teste] Ativando módulo de combate...')
        manager.enableModule(botId, 'combat')
    }, 3000)

    // Envia mensagem 3s depois do combate
    setTimeout(() => {
        console.log('[Teste] Enviando mensagem...')
        manager.sendChat(botId, '/say BotManager funcionando!')
    }, 6000)

    // Encerra 30s após estar pronto
    setTimeout(() => {
        console.log('[Teste] Encerrando...')
        manager.stop(botId)
        setTimeout(() => process.exit(0), 3000)
    }, 30000)
})

manager.on('bot:status', ({ botId, data }) => {
    console.log(`[Status] HP:${data.health} Fome:${data.food} Ping:${data.ping}ms`)
    const lista = data.modules.map(m => `${m.name}:${m.enabled ? 'on' : 'off'}`).join(' | ')
    console.log(`         Módulos: ${lista}`)
})

manager.on('bot:chat', ({ entry }) => {
    const origem = entry.source === 'panel' ? '[painel]' : '[server]'
    console.log(`[Chat] ${origem} ${entry.text}`)
})

manager.on('bot:death',   ({ botId }) => console.log(`[Morte] ${botId} morreu!`))
manager.on('bot:stopped', ({ botId }) => console.log(`[Parado] ${botId}`))
manager.on('bot:error',   ({ botId, message }) => console.log(`[Erro ${botId}] ${message}`))
