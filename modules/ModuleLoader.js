/**
 * ModuleLoader
 *
 * Responsável por:
 *  - Registrar os módulos disponíveis
 *  - Carregar / descarregar módulos em runtime por bot
 *  - Expor a lista de módulos e suas configs para a API
 */

const path = require('path');

const AVAILABLE_MODULES = [
    'combat',
    'movement',
    'health',
    'automation',
    'chat',
];

class ModuleLoader {
    /**
     * @param {import('mineflayer').Bot} bot
     * @param {import('../core/context').Context} ctx
     * @param {string[]} enabledModules  - nomes dos módulos que devem iniciar ativos
     */
    constructor(bot, ctx, enabledModules = []) {
        this.bot     = bot;
        this.ctx     = ctx;
        /** @type {Map<string, Object>} nome → instância do módulo */
        this.modules = new Map();

        this._loadAll(enabledModules);
    }

    // ─── setup ───────────────────────────────────────────────────────────────

    _loadAll(enabledModules) {
        for (const name of AVAILABLE_MODULES) {
            try {
                const mod = require(path.join(__dirname, `${name}.js`));
                // reseta estado do módulo para evitar vazamento entre instâncias
                mod.enabled = enabledModules.includes(name);
                this.modules.set(name, mod);

                if (mod.enabled) {
                    mod.onLoad(this.bot, this.ctx);
                }
            } catch (err) {
                console.error(`[ModuleLoader] Erro ao carregar módulo "${name}":`, err.message);
            }
        }
    }

    // ─── API pública ─────────────────────────────────────────────────────────

    /**
     * Ativa um módulo em runtime.
     * Chamado por: POST /api/bots/:id/modules/:name/enable
     */
    enable(name) {
        const mod = this.modules.get(name);
        if (!mod) throw new Error(`Módulo desconhecido: ${name}`);
        if (mod.enabled) return;

        mod.onLoad(this.bot, this.ctx);
        mod.enabled = true;
    }

    /**
     * Desativa um módulo em runtime.
     * Chamado por: POST /api/bots/:id/modules/:name/disable
     */
    disable(name) {
        const mod = this.modules.get(name);
        if (!mod) throw new Error(`Módulo desconhecido: ${name}`);
        if (!mod.enabled) return;

        mod.onUnload(this.bot, this.ctx);
        mod.enabled = false;
    }

    /**
     * Atualiza a config de um módulo sem recarregá-lo.
     * Chamado por: PATCH /api/bots/:id/modules/:name/config
     */
    setConfig(name, patch) {
        const mod = this.modules.get(name);
        if (!mod) throw new Error(`Módulo desconhecido: ${name}`);
        Object.assign(mod.config, patch);
    }

    /**
     * Executa o tick de todos os módulos ativos.
     * Deve ser chamado no evento physicsTick do bot.
     */
    tick() {
        for (const mod of this.modules.values()) {
            if (mod.enabled && typeof mod.tick === 'function') {
                try {
                    mod.tick(this.bot, this.ctx);
                } catch (err) {
                    console.error(`[ModuleLoader] Erro no tick de "${mod.name}":`, err.message);
                }
            }
        }
    }

    /**
     * Descarrega todos os módulos (chamado ao desligar o bot).
     */
    unloadAll() {
        for (const mod of this.modules.values()) {
            if (mod.enabled) {
                try { mod.onUnload(this.bot, this.ctx); } catch { /* ignora */ }
            }
        }
        this.modules.clear();
    }

    /**
     * Retorna snapshot da lista de módulos para a API.
     * @returns {{ name, displayName, description, enabled, config }[]}
     */
    list() {
        return Array.from(this.modules.values()).map(m => ({
            name:        m.name,
            displayName: m.displayName,
            description: m.description,
            enabled:     m.enabled,
            config:      { ...m.config },
        }));
    }

    /**
     * Retorna uma instância específica de módulo (ex: para chamar chat.send()).
     */
    get(name) {
        return this.modules.get(name) ?? null;
    }
}

module.exports = ModuleLoader;
