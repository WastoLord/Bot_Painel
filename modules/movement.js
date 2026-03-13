const { goals: { GoalFollow } } = require('mineflayer-pathfinder')
const { feedback } = require('../core/utils')

function enviarPacoteSneak(bot, ativado) {
    try {
        bot._client.write('entity_action', {
            entityId: bot.entity.id,
            actionId: ativado ? 0 : 1,
            jumpBoost: 0,
        })
    } catch {}
}

module.exports = {
    name: 'movement',
    label: 'movement',
    description: 'Follow, elevador e pathfinding',
    enabled: true,
    config: { followRange: 1, canDig: false, canPlaceOn: false },

    _chatListener: null,

    onLoad(bot, ctx) {
        const { Movements } = require('mineflayer-pathfinder')
        if (bot.pathfinder) {
            const mcData = require('minecraft-data')(bot.version)
            const moves = new Movements(bot, mcData)
            moves.canDig     = this.config.canDig
            moves.canPlaceOn = this.config.canPlaceOn
            bot.pathfinder.setMovements(moves)
        }

        // Comandos via chat do MC
        this._chatListener = (username, message) => {
            const admins = [ctx.config.dono, ...(ctx.config.admins ?? [])]
            if (!admins.includes(username)) return
            const cmd = message.trim().toLowerCase()

            if (cmd.startsWith('!follow ')) {
                const alvo = message.trim().slice(8).trim()
                this.follow(bot, ctx, alvo)
            } else if (cmd === '!parar') {
                this.stop(bot, ctx)
                feedback(bot, ctx, '🛑 Parado.')
            } else if (cmd === '!subir') {
                this.startElevator(bot, ctx, 'subir')
            } else if (cmd === '!descer') {
                this.startElevator(bot, ctx, 'descer')
            }
        }
        bot.on('chat', this._chatListener)
        feedback(bot, ctx, '🧭 Módulo de movimento carregado.')
    },

    onUnload(bot, ctx) {
        if (this._chatListener) bot.off('chat', this._chatListener)
        this._chatListener = null
        this.stop(bot, ctx)
    },

    tick(bot, ctx) {
        const el = ctx.state.elevator
        if (!el.active) return
        if (Date.now() > el.endTime) {
            el.active = false
            bot.clearControlStates()
            enviarPacoteSneak(bot, false)
            feedback(bot, ctx, '✅ Elevador finalizado.')
            return
        }
        if (bot.pathfinder) bot.pathfinder.setGoal(null)
        bot.setControlState('forward', false)
        bot.setControlState('back',    false)
        bot.setControlState('left',    false)
        bot.setControlState('right',   false)
        bot.setControlState('sprint',  false)
        if (el.direction === 'subir') {
            bot.setControlState('sneak', false)
            bot.setControlState('jump',  true)
        } else {
            bot.setControlState('jump',  false)
            bot.setControlState('sneak', true)
            enviarPacoteSneak(bot, true)
        }
    },

    follow(bot, ctx, username) {
        const target = bot.players[username]?.entity
        if (!target) { feedback(bot, ctx, `❌ Não vejo ${username}!`); return }
        if (bot.pathfinder) {
            bot.pathfinder.setGoal(new GoalFollow(target, this.config.followRange), true)
            feedback(bot, ctx, `🏃 Seguindo ${username}...`)
        }
    },

    startElevator(bot, ctx, dir) {
        this.stop(bot, ctx)
        ctx.state.elevator.active    = true
        ctx.state.elevator.direction = dir
        ctx.state.elevator.endTime   = Date.now() + (dir === 'subir' ? 500 : 3000)
        feedback(bot, ctx, dir === 'subir' ? '⬆️ Subindo...' : '⬇️ Descendo...')
        if (dir === 'descer') enviarPacoteSneak(bot, true)
    },

    stop(bot, ctx) {
        if (bot.pathfinder) bot.pathfinder.setGoal(null)
        if (ctx?.state?.elevator) ctx.state.elevator.active = false
        bot.clearControlStates()
        enviarPacoteSneak(bot, false)
    }
}
