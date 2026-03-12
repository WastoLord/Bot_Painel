import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../lib/auth'
import { useBot } from '../hooks/useSocket'

// ─── Chat terminal ────────────────────────────────────────────────────────────
function ChatPanel({ botId }) {
    const [lines, setLines] = useState([])
    const [input, setInput] = useState('')
    const bottomRef = useRef(null)

    const addLine = useCallback((text, type = 'server') => {
        setLines(l => [...l.slice(-300), { text, type, ts: Date.now() }])
    }, [])

    useEffect(() => {
        addLine('Chat conectado. Aguardando mensagens...', 'system')
    }, [addLine])

    useBot(botId, {
        onChat:  (entry) => addLine(entry.text,    entry.source === 'panel' ? 'panel' : 'server'),
        onError: (msg)   => addLine(`⚠ ${msg}`,    'error'),
        onDeath: ()      => addLine('💀 Bot morreu!','death'),
        onReady: ()      => addLine('✅ Bot online.','system')
    })

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines])

    async function sendMsg(e) {
        e.preventDefault()
        if (!input.trim()) return
        await api('POST', `/bots/${botId.split('_').pop()}/chat`, { message: input })
            .catch(err => addLine(`Erro: ${err.message}`, 'error'))
        addLine(`> ${input}`, 'panel')
        setInput('')
    }

    const typeColor = { server: 'text-stone-700', error: 'text-red-500', death: 'text-orange-500', panel: 'text-brand-600', system: 'text-stone-400 italic' }

    return (
        <div className="card flex flex-col h-full">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm font-medium text-stone-700">Chat</span>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-xs min-h-0">
                {lines.map((l, i) => (
                    <p key={i} className={`leading-relaxed ${typeColor[l.type] ?? 'text-stone-700'}`}>
                        <span className="text-stone-300 mr-2 select-none">
                            {new Date(l.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        {l.text}
                    </p>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMsg} className="px-4 py-3 border-t border-stone-100 flex gap-2">
                <input
                    className="input font-mono text-xs flex-1"
                    placeholder="Digite um comando ou mensagem..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                <button type="submit" className="btn-primary px-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    )
}

// ─── Módulo toggle ────────────────────────────────────────────────────────────
function ModuleRow({ mod, botDbId, onToggle }) {
    const [loading, setLoading] = useState(false)

    async function toggle() {
        setLoading(true)
        const action = mod.enabled ? 'disable' : 'enable'
        await api('POST', `/bots/${botDbId}/modules/${mod.name}/${action}`).catch(() => {})
        onToggle(mod.name, !mod.enabled)
        setLoading(false)
    }

    return (
        <div className="flex items-center justify-between py-2.5">
            <div>
                <p className="text-sm font-medium text-stone-800">{mod.label ?? mod.name}</p>
                <p className="text-xs text-stone-400">{mod.name}</p>
            </div>
            <button onClick={toggle} disabled={loading}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${mod.enabled ? 'bg-brand-500' : 'bg-stone-200'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${mod.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
        </div>
    )
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, max = 20, color }) {
    const pct = Math.round((value / max) * 100)
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-500">{label}</span>
                <span className="font-medium text-stone-700">{value}/{max}</span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}

// ─── Página ────────────────────────────────────────────────────────────────────
export default function BotPage() {
    const { id }      = useParams()   // DB id
    const navigate    = useNavigate()
    const [bot, setBot]       = useState(null)
    const [status, setStatus] = useState(null)
    const [modules, setMods]  = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api('GET', `/bots/${id}`).then(data => {
            setBot(data)
            setStatus(data.status)
            setMods(data.status?.modules ?? [])
            setLoading(false)
        }).catch(() => navigate('/dashboard'))
    }, [id, navigate])

    useBot(bot?.botId, {
        onStatus: (data) => {
            setStatus(data)
            setMods(data.modules ?? [])
        }
    })

    function handleToggle(name, enabled) {
        setMods(m => m.map(mod => mod.name === name ? { ...mod, enabled } : mod))
    }

    if (loading) return <Layout><div className="text-sm text-stone-400 py-16 text-center">Carregando...</div></Layout>

    const isOnline = status?.online ?? false

    return (
        <Layout>
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/dashboard')} className="btn-ghost px-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isOnline ? 'dot-online' : 'dot-offline'}`} />
                        <h1 className="font-display font-bold text-xl text-stone-900">{bot?.botName}</h1>
                        <span className={isOnline ? 'badge-green' : 'badge-stone'}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                    <div className="ml-auto flex gap-2">
                        {/* Botão terminal do servidor */}
                        <a href={`https://craftsapiens.com.br`} target="_blank" rel="noreferrer"
                            className="btn-ghost text-xs gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Terminal
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
                    {/* Coluna esquerda: status + módulos */}
                    <div className="space-y-4 overflow-y-auto">
                        {/* Status */}
                        <div className="card p-4 space-y-3">
                            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</h2>
                            <StatBar label="Vida"  value={status?.health ?? 0} color="bg-red-400" />
                            <StatBar label="Fome"  value={status?.food   ?? 0} color="bg-amber-400" />
                            <div className="pt-1 space-y-1.5 text-xs text-stone-500">
                                <div className="flex justify-between">
                                    <span>Ping</span>
                                    <span className="font-mono text-stone-700">{status?.ping ?? 0}ms</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Dimensão</span>
                                    <span className="font-mono text-stone-700">{status?.dimension ?? '—'}</span>
                                </div>
                                {status?.position && (
                                    <div className="flex justify-between">
                                        <span>Posição</span>
                                        <span className="font-mono text-stone-700">
                                            {Math.round(status.position.x)}, {Math.round(status.position.y)}, {Math.round(status.position.z)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Servidor</span>
                                    <span className="font-mono text-stone-700">{bot?.serverHost}</span>
                                </div>
                            </div>
                        </div>

                        {/* Módulos */}
                        <div className="card p-4">
                            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Módulos</h2>
                            <div className="divide-y divide-stone-100">
                                {modules.map(mod => (
                                    <ModuleRow key={mod.name} mod={mod} botDbId={id} onToggle={handleToggle} />
                                ))}
                                {modules.length === 0 && (
                                    <p className="text-xs text-stone-400 py-3">Nenhum módulo disponível.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat — ocupa 2/3 */}
                    <div className="lg:col-span-2">
                        {bot?.botId && <ChatPanel botId={bot.botId} />}
                    </div>
                </div>
            </div>
        </Layout>
    )
}
