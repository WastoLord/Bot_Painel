import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../lib/auth'
import { useBot } from '../hooks/useSocket'

function BotCard({ bot, onDelete }) {
    const navigate = useNavigate()
    const [status, setStatus] = useState(null)
    const botId = `${bot.owner}_${bot.id}`
    useBot(botId, { onStatus: setStatus, onReady: () => setStatus(s => s ?? {}), onDeath: () => setStatus(null) })
    const online = !!status
    return (
        <div className="card p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <div className={online ? 'dot-online' : 'dot-offline'} />
                    <span className="font-display font-semibold text-stone-900">{bot.botName}</span>
                </div>
                <span className="badge-stone">{bot.authMode}</span>
            </div>
            <div className="text-xs text-stone-400 font-mono">{bot.serverHost}:{bot.serverPort}</div>
            {online && status && (
                <div className="grid grid-cols-2 gap-1 text-xs text-stone-500">
                    <span>❤ {Math.round(status.health ?? 0)}/20</span>
                    <span>🍖 {Math.round(status.food ?? 0)}/20</span>
                    <span>📶 {status.ping ?? 0}ms</span>
                    <span>🌍 {status.dimension ?? '?'}</span>
                </div>
            )}
            <div className="flex gap-2 mt-auto pt-1">
                <button onClick={() => navigate(`/bot/${bot.id}`)} className="btn-ghost flex-1 justify-center text-xs py-1.5">Gerenciar</button>
                <button onClick={() => onDelete(bot.id)} className="btn-ghost px-2 py-1.5 text-red-500 hover:bg-red-50 text-xs">✕</button>
            </div>
        </div>
    )
}

function NewBotModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ botName:'', serverHost:'', serverPort:'25565', authMode:'none', botPassword:'' })
    const [loading, setLoad] = useState(false)
    const [error, setError]  = useState('')
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

    async function submit(e) {
        e.preventDefault(); setLoad(true); setError('')
        try { const bot = await api('POST', '/bots', { ...form, serverPort: Number(form.serverPort) }); onCreated(bot) }
        catch (err) { setError(err.message) }
        finally { setLoad(false) }
    }

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display font-semibold text-stone-900">Novo Bot</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
                </div>
                <form onSubmit={submit} className="space-y-3">
                    {[
                        { key:'botName',     label:'Nome do Bot',  ph:'Plasma_Bot',       type:'text'   },
                        { key:'serverHost',  label:'Servidor',      ph:'play.exemplo.com', type:'text'   },
                        { key:'serverPort',  label:'Porta',         ph:'25565',            type:'number' },
                        { key:'botPassword', label:'Senha do Bot',  ph:'(opcional)',       type:'text'   },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-medium text-stone-600 mb-1">{f.label}</label>
                            <input className="input" type={f.type} placeholder={f.ph} value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Modo de Auth</label>
                        <select className="input" value={form.authMode} onChange={e => set('authMode', e.target.value)}>
                            <option value="none">Nenhum</option>
                            <option value="cracked">Cracked</option>
                            <option value="microsoft">Microsoft</option>
                        </select>
                    </div>
                    {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                    <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2" disabled={loading}>
                        {loading ? 'Criando...' : 'Criar Bot'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function Dashboard() {
    const [bots, setBots]       = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setModal] = useState(false)

    const load = useCallback(async () => {
        try { setBots(await api('GET', '/bots')) } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    async function deleteBot(id) {
        if (!confirm('Parar e remover este bot?')) return
        await api('DELETE', `/bots/${id}`)
        setBots(b => b.filter(x => x.id !== id))
    }

    const online = bots.filter(b => b.online).length

    return (
        <Layout>
            {showModal && <NewBotModal onClose={() => setModal(false)} onCreated={bot => { setBots(b => [...b, bot]); setModal(false) }} />}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="font-display font-bold text-2xl text-stone-900">Dashboard</h1>
                        <p className="text-sm text-stone-400 mt-0.5">{online} de {bots.length} bot{bots.length !== 1 ? 's' : ''} online</p>
                    </div>
                    <button className="btn-primary" onClick={() => setModal(true)}>+ Novo Bot</button>
                </div>
                {loading ? (
                    <div className="text-sm text-stone-400 text-center py-16">Carregando...</div>
                ) : bots.length === 0 ? (
                    <div className="text-center py-16 text-stone-400">
                        <p className="text-lg font-medium mb-2">Nenhum bot ainda</p>
                        <p className="text-sm">Clique em "+ Novo Bot" para começar.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bots.map(bot => <BotCard key={bot.id} bot={bot} onDelete={deleteBot} />)}
                    </div>
                )}
            </div>
        </Layout>
    )
}
