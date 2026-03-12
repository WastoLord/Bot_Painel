/**
 * modules/auth.js
 *
 * Gerencia autenticação do bot no servidor.
 * Modos suportados (escolhido ao criar o bot no painel):
 *
 *   'cracked'   → servidor pirata: manda /register + /login no chat
 *   'microsoft' → conta original: auth via Microsoft OAuth (cache automático)
 *
 * Para contas Microsoft, o mineflayer gerencia o token via 'profilesFolder'.
 * Na primeira vez, emite o evento 'auth:device_code' com a URL + código para
 * o painel exibir ao cliente. Após autenticar, o cache é salvo e nas próximas
 * conexões o bot entra sozinho sem interação.
 */

const path = require('path')
const { feedback } = require('../core/utils')

module.exports = {
    name: 'auth',
    label: 'Autenticação',
    description: 'Login automático no servidor (pirata ou conta original)',
    enabled: false,

    config: {
        mode: 'cracked',       // 'cracked' | 'microsoft'
        password: '',          // usado apenas no modo cracked
        registerCommand: true, // tenta /register antes do /login
        loginDelay: 2000,      // ms após spawn para enviar os comandos
    },

    onLoad(bot, ctx) {
        // Ouve mensagens do servidor para detectar pedidos de login/registro
        ctx.state._authListener = (jsonMsg) => {
            const msg = jsonMsg.toString().toLowerCase()

            if (this.config.mode !== 'cracked') return

            const precisaRegistrar = msg.includes('registrar') || msg.includes('register') || msg.includes('não foi registrado')
            const precisaLogin     = msg.includes('/login') || msg.includes('autentique') || msg.includes('please login')

            if (precisaRegistrar && this.config.registerCommand) {
                console.log('[Auth] Servidor pediu registro.')
                setTimeout(() => {
                    bot.chat(`/register ${this.config.password} ${this.config.password}`)
                }, 1500)
                return
            }

            if (precisaLogin) {
                console.log('[Auth] Servidor pediu login.')
                setTimeout(() => {
                    bot.chat(`/login ${this.config.password}`)
                }, 1000)
            }
        }

        bot.on('message', ctx.state._authListener)

        // Login proativo logo após o spawn (cobre servidores que não mandam mensagem)
        if (this.config.mode === 'cracked' && this.config.password) {
            setTimeout(() => {
                bot.chat(`/login ${this.config.password}`)
            }, this.config.loginDelay)
        }

        feedback(bot, ctx, `🔑 Auth (${this.config.mode}) ativo`)
    },

    onUnload(bot, ctx) {
        if (ctx.state._authListener) {
            bot.off('message', ctx.state._authListener)
            ctx.state._authListener = null
        }
    },

    tick() {}
}

/**
 * buildConnConfig(opts)
 *
 * Monta o objeto de configuração para mineflayer.createBot()
 * com base no modo de autenticação escolhido pelo cliente.
 *
 * Chamado pelo BotWorker antes de criar o bot.
 *
 * @param {Object} opts
 * @param {string} opts.mode        - 'cracked' | 'microsoft'
 * @param {string} opts.host
 * @param {number} opts.port
 * @param {string} opts.botName     - Nick (cracked) ou e-mail (microsoft)
 * @param {string} [opts.password]  - Só para cracked
 * @param {string} opts.owner       - Nick do dono, usado para nomear a pasta de cache
 * @param {string} opts.version
 * @returns {Object} config para mineflayer.createBot()
 */
function buildConnConfig(opts) {
    const base = {
        host:    opts.host,
        port:    opts.port ?? 25565,
        version: opts.version ?? '1.21.4',
        checkTimeoutInterval: 120 * 1000
    }

    if (opts.mode === 'microsoft') {
        return {
            ...base,
            username: opts.botName,   // e-mail ou username da conta Microsoft
            auth: 'microsoft',
            // Cache de token por cliente — cada um tem sua própria pasta
            profilesFolder: path.join(__dirname, '..', 'data', 'profiles', opts.owner)
        }
    }

    // Padrão: cracked / offline
    return {
        ...base,
        username: opts.botName,
        auth: 'offline',
        password: opts.password  // não usado pelo mineflayer diretamente, só pelo módulo
    }
}

module.exports.buildConnConfig = buildConnConfig
