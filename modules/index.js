/**
 * Contrato padrão de módulo.
 * Todo módulo deve exportar este formato.
 *
 * @typedef {Object} BotModule
 * @property {string}   name           - Identificador único (ex: 'combat')
 * @property {string}   label          - Nome legível para o painel (ex: 'Combate')
 * @property {string}   description    - Descrição curta para o painel
 * @property {boolean}  enabled        - Estado padrão ao carregar
 * @property {Object}   config         - Configurações editáveis pelo cliente
 * @property {Function} onLoad         - Chamado ao ativar o módulo (bot, ctx)
 * @property {Function} onUnload       - Chamado ao desativar o módulo (bot, ctx)
 * @property {Function} [tick]         - Chamado a cada physicsTick (bot, ctx) — opcional
 */

const auth       = require('./auth')
const combat     = require('./combat')
const movement   = require('./movement')
const health     = require('./health')
const automation = require('./automation')
const chat       = require('./chat')

/** Registro de todos os módulos disponíveis */
// auth sempre primeiro — precisa logar antes de qualquer coisa
const REGISTRY = [auth, combat, movement, health, automation, chat]

/**
 * Retorna uma cópia fresh dos módulos (estado isolado por instância de bot)
 */
function createModuleSet() {
    return REGISTRY.map(mod => ({
        ...mod,
        enabled: mod.enabled,
        config: { ...mod.config }
    }))
}

module.exports = { REGISTRY, createModuleSet }
