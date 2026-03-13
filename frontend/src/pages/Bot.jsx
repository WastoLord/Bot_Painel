import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../lib/auth'
import { useBot } from '../hooks/useSocket'

function ChatPanel({ botId }) {
    const [lines, setLines] = useState([])
    const [input, setInput] = useState('')
    const bottomRef = useRef(null)
    const addLine = useCallback((text, type = 'server') => {
        setLines(l => [...l.slice(-1999), { text, type, ts: Date.now() }])
    }, [])
    useEffect(() => { addLine('Chat conectado.', 'system') }, [addLine])
    useBot(botId, {
        onChat:  (e) => addLine(e.text, e.source === 'panel' ? 'panel' : 'server'),
        onError: (m) => addLine(`⚠ ${m}`, 'error'),
        onDeath: ()  => addLine('💀 Bot morreu!', 'death'),
        onReady: ()  => addLine('✅ Bot online.', 'system')
    })
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])
    async function sendMsg(e) {
        e.preventDefault()
        if (!input.trim()) return
        await api('POST', `/bots/${botId.split('_').pop()}/chat`, { message: input }).catch(err => addLine(`Erro: ${err.message}`, 'error'))
        addLine(`> ${input}`, 'panel')
        setInput('')
    }
    const typeColor = { server:'text-stone-700', error:'text-red-500', death:'text-orange-500', panel:'text-brand-600', system:'text-stone-400 italic' }
    return (
        <div className="card flex flex-col" style={{ height:'420px' }}>
            <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                <span className="text-sm font-medium text-stone-700">Chat</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-0.5 font-mono text-xs">
                {lines.map((l,i) => <p key={i} className={`leading-relaxed ${typeColor[l.type]??'text-stone-700'}`}>{l.text}</p>)}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMsg} className="px-4 py-3 border-t border-stone-100 flex gap-2">
                <input className="input font-mono text-xs" placeholder="Digite um comando..." value={input} onChange={e => setInput(e.target.value)} />
                <button type="submit" className="btn-primary px-4 shrink-0">Enviar</button>
            </form>
        </div>
    )
}

function StatBar({ label, value, max, color }) {
    return (
        <div>
            <div className="flex justify-between text-xs text-stone-500 mb-1"><span>{label}</span><span>{value}/{max}</span></div>
            <div className="w-full bg-stone-100 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width:`${Math.round((value/max)*100)}%`, transition:'width 0.4s' }} />
            </div>
        </div>
    )
}

function ModuleToggle({ name, label, enabled, onToggle }) {
    return (
        <div className="flex items-center justify-between py-2.5 px-4 border-b border-stone-50 last:border-0">
            <span className="text-sm text-stone-700 font-medium">{label}</span>
            <button onClick={() => onToggle(name, !enabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${enabled?'bg-brand-500':'bg-stone-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${enabled?'left-5':'left-0.5'}`} />
            </button>
        </div>
    )
}

export default function BotPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [bot, setBot]       = useState(null)
    const [status, setStatus] = useState(null)
    const [loading, setLoad]  = useState(true)

    useEffect(() => {
        api('GET', `/bots/${id}`).then(data => { setBot(data); setLoad(false) }).catch(() => navigate('/dashboard'))
    }, [id, navigate])

    const botId = bot?.botId ?? null
    useBot(botId, { onStatus: setStatus })

    async function toggleModule(name, enable) {
        await api('POST', `/bots/${id}/modules/${name}/${enable?'enable':'disable'}`).catch(console.error)
        setStatus(s => s ? { ...s, modules: s.modules.map(m => m.name===name ? {...m,enabled:enable} : m) } : s)
    }

    if (loading) return <Layout><div className="text-sm text-stone-400 text-center py-16">Carregando...</div></Layout>

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-5">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="btn-ghost px-2 py-1.5 text-xs">← Voltar</button>
                    <div className={status ? 'dot-online' : 'dot-offline'} />
                    <h1 className="font-display font-bold text-xl text-stone-900">{bot?.botName}</h1>
                    <span className="text-stone-400 text-sm">{bot?.serverHost}:{bot?.serverPort}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="card p-4 col-span-2 space-y-3">
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Status</p>
                        {status ? (<>
                            <StatBar label="Vida" value={status.health??0} max={20} color="bg-red-400" />
                            <StatBar label="Fome" value={status.food??0}   max={20} color="bg-amber-400" />
                            <div className="grid grid-cols-2 gap-3 pt-1 text-xs text-stone-500">
                                <div>Ping <span className="text-stone-800 font-mono font-medium">{status.ping}ms</span></div>
                                <div>Dim <span className="text-stone-800 font-mono font-medium">{status.dimension}</span></div>
                            </div>
                        </>) : <p className="text-sm text-stone-400">Bot offline.</p>}
                    </div>
                    <div className="card overflow-hidden">
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide px-4 pt-4 pb-2">Módulos</p>
                        {status?.modules?.map(m => (
                            <ModuleToggle key={m.name} name={m.name} label={m.label??m.name} enabled={m.enabled} onToggle={toggleModule} />
                        )) ?? <p className="text-sm text-stone-400 px-4 pb-4">Offline.</p>}
                    </div>
                </div>
                <ChatPanel botId={botId} />
            </div>
        </Layout>
    )
}
