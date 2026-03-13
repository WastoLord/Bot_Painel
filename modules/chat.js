const { feedback } = require('../core/utils')

module.exports = {
    name: 'chat',
    label: 'chat',
    description: 'Integra o chat do jogo ao painel em tempo real',
    enabled: true,
    config: { logCombat: false },
    _messageListener: null,
    _chatListener: null,

    onLoad(bot, ctx) {
        this._messageListener = (jsonMsg) => {
            const text = jsonMsg.toString()
            if (!text.trim()) return
            if (!this.config.logCombat && text.includes('[Combate]')) return
            process.send({ type: 'chat', entry: { source: 'server', text, ts: Date.now() } })
        }

        this._chatListener = (username, message) => {
            if (username === bot.username) return
            const text = `<${username}> ${message}`
            process.send({ type: 'chat', entry: { source: 'player', text, ts: Date.now() } })
        }

        bot.on('message', this._messageListener)
        bot.on('chat',    this._chatListener)
        feedback(bot, ctx, '💬 Módulo de chat carregado.')
    },

    onUnload(bot) {
        if (this._messageListener) bot.off('message', this._messageListener)
        if (this._chatListener)    bot.off('chat',    this._chatListener)
        this._messageListener = null
        this._chatListener    = null
    },

    tick() {},

    send(bot, ctx, text) {
        if (!text?.trim()) return
        bot.chat(text.trim())
        process.send({ type: 'chat', entry: { source: 'panel', text: text.trim(), ts: Date.now() } })
    }
}
