/**
 * Módulo: Chat
 * NOVO — ponte entre o chat do Minecraft e o painel via Socket.io
 *
 * Emite eventos para o servidor Express que os repassa ao cliente via WebSocket:
 *   'chat:message'  → mensagem recebida no jogo
 *   'chat:sent'     → mensagem enviada pelo painel
 */

const { feedback } = require('../core/utils');

module.exports = {
    name: 'chat',
    displayName: 'Chat',
    description: 'Integra o chat do jogo ao painel em tempo real',
    enabled: true,

    config: {
        logCombat: false,        // incluir mensagens de [Combate] no feed
        maxHistory: 100,         // tamanho máximo do histórico em memória
    },

    /** @type {string[]} */
    _history: [],

    /** @type {Function|null} referência ao listener para poder remover no onUnload */
    _messageListener: null,
    _chatListener: null,

    onLoad(bot, ctx) {
        this._history = [];

        // Listener para mensagens do servidor (sistema, chat global, tells)
        this._messageListener = (jsonMsg) => {
            const msg = jsonMsg.toString();
            if (!msg.trim()) return;
            if (!this.config.logCombat && msg.includes('[Combate]')) return;

            this._pushHistory(msg);

            // Emite para o painel se houver socket registrado no contexto
            ctx.emit?.('chat:message', { source: 'server', text: msg, ts: Date.now() });
        };

        // Listener para chat de jogadores (evento separado do mineflayer)
        this._chatListener = (username, message) => {
            if (username === bot.username) return;
            const formatted = `<${username}> ${message}`;
            this._pushHistory(formatted);
            ctx.emit?.('chat:message', { source: 'player', username, text: message, ts: Date.now() });
        };

        bot.on('message', this._messageListener);
        bot.on('chat',    this._chatListener);

        feedback(bot, ctx, '💬 Módulo de chat carregado.');
    },

    onUnload(bot, ctx) {
        if (this._messageListener) bot.off('message', this._messageListener);
        if (this._chatListener)    bot.off('chat',    this._chatListener);
        this._messageListener = null;
        this._chatListener    = null;
    },

    tick() { /* sem tick */ },

    // ─── API pública ─────────────────────────────────────────────────────────

    /**
     * Envia uma mensagem/comando ao servidor pelo bot.
     * Chamado pela rota POST /api/bots/:id/chat
     */
    send(bot, ctx, text) {
        if (!text?.trim()) return;
        bot.chat(text.trim());
        const entry = { source: 'panel', text: text.trim(), ts: Date.now() };
        this._pushHistory(`[Painel] ${text.trim()}`);
        ctx.emit?.('chat:sent', entry);
    },

    /** Retorna o histórico atual */
    getHistory() {
        return [...this._history];
    },

    // ─── interno ─────────────────────────────────────────────────────────────

    _pushHistory(text) {
        this._history.push(text);
        if (this._history.length > this.config.maxHistory) {
            this._history.shift();
        }
    },
};
