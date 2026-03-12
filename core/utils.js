function feedback(bot, ctx, msg) {
    const dono = ctx?.config?.dono
    console.log(`[${dono ?? 'bot'}] ${msg}`)
    if (dono && bot) {
        try { bot.chat(`/tell ${dono} ${msg}`) } catch {}
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = { feedback, delay }
