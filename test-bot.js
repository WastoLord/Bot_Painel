/**
 * test-bot.js
 * Teste rápido do BotManager — roda um bot e imprime status/chat no terminal.
 * 
 * Uso:
 *   BOT_PASSWORD=suasenha node test-bot.js
 */

const manager = require('./bot/BotManager')

const OPTS = {
    botId:    'teste_wasto',
    botName:  'Plasma_Teste',
    owner:    'WastoLord_13',
    password: '',
    authMode: 'none',
    host:     'been-destinations.gl.joinmc.link',
    port:     25565
}

console.log('Iniciando teste do BotManager...')

manager.start(OPTS)

manager.on('bot:ready',  ({ botId }) => {
    console.log(`[OK] Bot ${botId} pronto!`)
})

manager.on('bot:status', ({ botId, data }) => {
    console.log(`[Status ${botId}] HP:${data.health} Fome:${data.food} Ping:${data.ping}ms`)
    console.log(`  Módulos: ${data.modules.map(m => `${m.name}:${m.enabled ? 'on' : 'off'}`).join(' | ')}`)
})

manager.on('bot:chat', ({ botId, entry }) => {
    const origem = entry.source === 'panel' ? '[painel]' : '[server]'
    console.log(`[Chat ${botId}] ${origem} ${entry.text}`)
})

manager.on('bot:death',  ({ botId }) => console.log(`[Morte] ${botId} morreu!`))
manager.on('bot:error',  ({ botId, message }) => console.log(`[Erro ${botId}] ${message}`))
manager.on('bot:stopped',({ botId }) => console.log(`[Parado] ${botId}`))

// Teste: habilita módulo de combate após 15s
setTimeout(() => {
    console.log('\n[Teste] Ativando módulo de combate...')
    manager.enableModule('teste_wasto', 'combat')
}, 15000)

// Teste: envia mensagem pelo chat após 20s
setTimeout(() => {
    console.log('[Teste] Enviando mensagem de teste...')
    manager.sendChat('teste_wasto', '/say BotManager funcionando!')
}, 20000)

// Encerra após 60s
setTimeout(() => {
    console.log('\n[Teste] Encerrando...')
    manager.stop('teste_wasto')
    setTimeout(() => process.exit(0), 3000)
}, 60000)
