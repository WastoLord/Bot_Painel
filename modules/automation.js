/**
 * Módulo: Automação
 * Adaptado de systems/automation.js
 */

const { feedback, delay } = require('../core/utils');

module.exports = {
    name: 'automation',
    displayName: 'Automação',
    description: 'Auto-click, drop de itens e PIX',
    enabled: false,

    config: {
        clickInterval: 1.0,    // segundos entre cliques
        minInterval: 0.2,
        protectedItems: [      // itens que nunca são dropados
            'diamond', 'sword', 'helmet',
            'chestplate', 'leggings', 'boots',
        ],
    },

    onLoad(bot, ctx) {
        feedback(bot, ctx, '🖱️ Módulo de automação carregado.');
    },

    onUnload(_bot, ctx) {
        this.stopAutoClick(ctx);
    },

    tick(_bot, _ctx) { /* sem tick contínuo — usa loop interno */ },

    // ─── auto-click ─────────────────────────────────────────────────────────

    startAutoClick(bot, ctx, intervaloStr) {
        let interval = parseFloat(intervaloStr);
        if (!interval || interval < this.config.minInterval) interval = this.config.minInterval;

        ctx.state.autoClick.active   = true;
        ctx.state.autoClick.interval = interval;
        feedback(bot, ctx, `🖱️ Auto-Click: ${interval}s`);

        const loop = async () => {
            if (!ctx.state.autoClick.active) return;
            try {
                const bloco = bot.blockAtCursor(4);
                if (bloco) bot.activateBlock(bloco).catch(() => {});
                else       bot.activateItem();
                bot.swingArm();
            } catch { /* ignora */ }

            if (ctx.state.autoClick.active) {
                ctx.state.autoClick.timer = setTimeout(loop, interval * 1000);
            }
        };
        loop();
    },

    stopAutoClick(ctx) {
        ctx.state.autoClick.active = false;
        if (ctx.state.autoClick.timer) {
            clearTimeout(ctx.state.autoClick.timer);
            ctx.state.autoClick.timer = null;
        }
    },

    // ─── drop de itens ──────────────────────────────────────────────────────

    async dropItems(bot, ctx, destinationUser) {
        let playerEntity = bot.players[destinationUser]?.entity
            ?? bot.nearestEntity(e => e.type === 'player' && e.username === destinationUser);

        if (!playerEntity) {
            feedback(bot, ctx, `Não vejo ${destinationUser} para dropar.`);
            return;
        }

        feedback(bot, ctx, '📦 Dropando...');
        try {
            await bot.lookAt(playerEntity.position.offset(0, 1.6, 0), true);
            await delay(800);
        } catch { /* ignora */ }

        const protected_ = this.config.protectedItems;
        for (const item of bot.inventory.items()) {
            if (protected_.some(p => item.name.includes(p))) continue;
            try {
                await bot.tossStack(item);
                await bot.waitForTicks(2);
            } catch { /* item já saiu do inventário */ }
        }

        feedback(bot, ctx, '📦 Drop concluído.');
    },

    // ─── pix ────────────────────────────────────────────────────────────────

    sendPix(bot, ctx, valor = 7500) {
        bot.chat(`/pix ${ctx.config.dono} ${valor}`);
    },
};
