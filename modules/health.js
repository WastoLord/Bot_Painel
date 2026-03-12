/**
 * Módulo: Saúde
 * Adaptado de systems/health.js
 */

const { feedback } = require('../core/utils');

module.exports = {
    name: 'health',
    displayName: 'Saúde',
    description: 'Come automaticamente quando HP/fome cai',
    enabled: true,

    config: {
        foodThreshold: 16,         // come quando fome <= este valor
        foodItem: 'cooked_beef',   // item de comida preferido
    },

    onLoad(bot, ctx) {
        feedback(bot, ctx, '❤️ Módulo de saúde carregado.');
    },

    onUnload(_bot, _ctx) {
        // sem estado para limpar
    },

    tick(bot, _ctx) {
        if (!bot.entity) return;
        if (bot.food > this.config.foodThreshold) return;
        if (bot.usingHeldItem) return;

        const comida = bot.inventory.items().find(i => i.name.includes(this.config.foodItem));
        if (comida) {
            bot.equip(comida, 'hand')
                .then(() => bot.consume())
                .catch(() => {});
        }
    },
};
