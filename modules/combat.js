/**
 * Módulo: Combate
 * Adaptado de systems/combat.js
 */

const { feedback } = require('../core/utils');

async function equipSword(bot) {
    const held = bot.inventory.slots[bot.getEquipmentDestSlot('hand')];
    if (held && held.name.includes('sword')) return true;
    const sword = bot.inventory.items().find(i => i.name.includes('sword'));
    if (!sword) return false;
    try { await bot.equip(sword, 'hand'); return true; } catch { return false; }
}

module.exports = {
    name: 'combat',
    displayName: 'Combate',
    description: 'Guarda automática e ataque a mobs/players',
    enabled: false,

    config: {
        speed: 600,
        range: 3.5,
        searchRange: 20,
        attackPlayers: true,
        attackMobs: true,
    },

    onLoad(bot, ctx) {
        feedback(bot, ctx, '⚔️ Módulo de combate carregado.');
    },

    onUnload(bot, ctx) {
        ctx.state.guardMode = false;
        ctx.state.isCombatActive = false;
        if (bot.pvp) bot.pvp.stop();
        if (bot.pathfinder) bot.pathfinder.setGoal(null);
        if (ctx.state.manualAttackLoop) {
            clearInterval(ctx.state.manualAttackLoop);
            ctx.state.manualAttackLoop = null;
        }
        bot.clearControlStates();
        bot.stopDigging();
    },

    tick(bot, ctx) {
        if (!ctx.state.guardMode || !bot.entity) return;
        if (Date.now() - ctx.state.ultimoAtaque < this.config.speed) return;

        const alvo = bot.nearestEntity(e => {
            if (e.type === 'player' && e.username === ctx.config.dono) return false;
            const isPlayer = e.type === 'player' && this.config.attackPlayers;
            const isMob    = e.type === 'mob'    && this.config.attackMobs;
            if (!isPlayer && !isMob) return false;
            const ignorar = ['item','experience_orb','arrow','snowball','egg','armor_stand','boat','minecart','fishing_bobber'];
            if (ignorar.includes(e.name || '')) return false;
            return e.position.distanceTo(bot.entity.position) <= 5.0;
        });

        if (alvo) {
            bot.lookAt(alvo.position.offset(0, alvo.height * 0.6, 0), true);
            bot.attack(alvo);
            bot.swingArm();
            ctx.state.ultimoAtaque = Date.now();
            equipSword(bot).catch(() => {});
        }
    },

    setGuard(ctx, enable) {
        ctx.state.guardMode = enable;
        if (!enable) ctx.state.isCombatActive = false;
    },

    async attack(bot, ctx) {
        const range = this.config.searchRange;
        let target = this.config.attackPlayers
            ? bot.nearestEntity(e => e.type === 'player' && e.username !== ctx.config.dono && e.position.distanceTo(bot.entity.position) <= range)
            : null;
        if (!target && this.config.attackMobs) {
            target = bot.nearestEntity(e => e.type === 'mob' && e.name !== 'armor_stand' && e.position.distanceTo(bot.entity.position) <= range);
        }
        if (!target) { feedback(bot, ctx, 'Nenhum alvo encontrado.'); return; }

        ctx.state.isCombatActive = true;
        feedback(bot, ctx, `⚔️ Alvo: ${target.username || target.name || 'Desconhecido'}`);
        await equipSword(bot);
        if (!ctx.state.isCombatActive) return;

        if (bot.pvp) {
            bot.pvp.attack(target);
        } else {
            ctx.state.manualAttackLoop = setInterval(async () => {
                if (!ctx.state.isCombatActive || !target?.isValid) {
                    clearInterval(ctx.state.manualAttackLoop); return;
                }
                await equipSword(bot);
                bot.lookAt(target.position.offset(0, target.height, 0));
                bot.attack(target);
            }, this.config.speed);
        }
    },
};
