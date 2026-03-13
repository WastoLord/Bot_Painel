import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api, getUser } from '../lib/auth'

function AddClientModal({ onClose, onAdded }) {
    const [form, setForm]    = useState({ username:'', password:'', role:'client' })
    const [loading, setLoad] = useState(false)
    const [error, setError]  = useState('')

    async function submit(e) {
        e.preventDefault(); setLoad(true); setError('')
        try { await api('POST', '/auth/register', form); onAdded() }
        catch (err) { setError(err.message) }
        finally { setLoad(false) }
    }

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display font-semibold text-stone-900">Novo Cliente</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
                </div>
                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Username</label>
                        <input className="input" placeholder="nick_cliente" required value={form.username} onChange={e => setForm(f => ({...f, username:e.target.value}))} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Senha inicial</label>
                        <input className="input" type="password" placeholder="••••••" required value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Perfil</label>
                        <select className="input" value={form.role} onChange={e => setForm(f => ({...f, role:e.target.value}))}>
                            <option value="client">Cliente</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                    <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                        {loading ? 'Criando...' : 'Criar Cliente'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function Admin() {
    const navigate = useNavigate()
    const user = getUser()
    const [allBots, setAllBots] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setModal] = useState(false)

    useEffect(() => {
        if (user?.role !== 'admin') { navigate('/dashboard'); return }
        api('GET', '/bots').then(data => { setAllBots(data); setLoading(false) })
    }, [navigate, user])

    async function stopBot(id) {
        if (!confirm('Parar este bot?')) return
        await api('DELETE', `/bots/${id}`)
        setAllBots(b => b.filter(x => x.id !== id))
    }

    const online = allBots.filter(b => b.online).length

    return (
        <Layout>
            {showModal && <AddClientModal onClose={() => setModal(false)} onAdded={() => setModal(false)} />}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="font-display font-bold text-2xl text-stone-900">Admin</h1>
                        <p className="text-sm text-stone-400 mt-0.5">{online} online · {allBots.length} total</p>
                    </div>
                    <button className="btn-primary" onClick={() => setModal(true)}>+ Novo Cliente</button>
                </div>
                {loading ? (
                    <div className="text-sm text-stone-400 text-center py-16">Carregando...</div>
                ) : (
                    <div className="card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stone-100">
                                    {['Status','Bot','Dono','Servidor','Auth',''].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {allBots.map(bot => (
                                    <tr key={bot.id} className="hover:bg-stone-50">
                                        <td className="px-4 py-3"><div className={bot.online ? 'dot-online' : 'dot-offline'} /></td>
                                        <td className="px-4 py-3 font-medium text-stone-900">{bot.botName}</td>
                                        <td className="px-4 py-3 text-stone-500 font-mono text-xs">{bot.owner}</td>
                                        <td className="px-4 py-3 text-stone-500 font-mono text-xs">{bot.serverHost}</td>
                                        <td className="px-4 py-3"><span className="badge-stone">{bot.authMode}</span></td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1">
                                                <button onClick={() => navigate(`/bot/${bot.id}`)} className="btn-ghost px-2 py-1 text-xs">Ver</button>
                                                <button onClick={() => stopBot(bot.id)} className="btn-ghost px-2 py-1 text-xs text-red-500 hover:bg-red-50">Parar</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {allBots.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400 text-sm">Nenhum bot cadastrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    )
}
