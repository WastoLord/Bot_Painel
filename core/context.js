const { createModuleSet } = require('../modules/index')

/**
 * Cria o contexto isolado de cada instância de bot.
 * Cada bot tem seu próprio ctx — módulos, config e estado nunca vazam entre bots.
 */
function create(args) {
    return {
        config: {
            dono:     args.dono,
            botName:  args.botName,
            loja:     args.loja ?? 'loja',
            password: args.password,
            admins:   [],
            combat: {
                speed:       600,
                range:       3.5,
                searchRange: 20
            }
        },

        state: {
            ultimoAtaque:    0,
            guardMode:       false,
            isCombatActive:  false,
            manualAttackLoop: null,
            elevator: {
                active:    false,
                direction: null,
                endTime:   0
            },
            autoClick: null,
            chatHistory: []
        },

        // Módulos ativos nesta instância (cópia isolada)
        modules: createModuleSet()
    }
}

module.exports = { create }
