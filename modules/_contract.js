/**
 * Contrato de módulo — todo módulo deve seguir esta estrutura.
 *
 * @typedef {Object} BotModule
 * @property {string}   name            - Identificador único (ex: 'combat')
 * @property {string}   displayName     - Nome exibido no painel
 * @property {string}   description     - Descrição curta para o painel
 * @property {boolean}  enabled         - Estado padrão ao carregar
 * @property {Object}   config          - Configurações editáveis pelo cliente
 * @property {Function} onLoad          - Chamado quando o módulo é ativado
 * @property {Function} onUnload        - Chamado quando o módulo é desativado
 * @property {Function} [tick]          - Chamado a cada physicsTick (opcional)
 */

/**
 * @param {import('mineflayer').Bot} bot
 * @param {import('../core/context').Context} ctx
 */

module.exports = {};
