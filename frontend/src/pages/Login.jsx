import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setSession } from '../lib/auth'

export default function Login() {
    const [mode, setMode]       = useState('login')
    const [username, setUser]   = useState('')
    const [password, setPass]   = useState('')
    const [error, setError]     = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function submit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            if (mode === 'register') await api('POST', '/auth/register', { username, password })
            const data = await api('POST', '/auth/login', { username, password })
            setSession(data)
            navigate('/dashboard')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
                <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-sky-100 opacity-50 blur-3xl" />
            </div>
            <div className="relative w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-lg mb-4">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-display font-bold text-stone-900">Plasma Panel</h1>
                    <p className="text-sm text-stone-500 mt-1">Gerenciamento de bots Mineflayer</p>
                </div>
                <div className="card p-6">
                    <div className="flex rounded-lg bg-stone-100 p-1 mb-6">
                        {['login','register'].map(m => (
                            <button key={m} onClick={() => { setMode(m); setError('') }}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                                {m === 'login' ? 'Entrar' : 'Cadastrar'}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Username</label>
                            <input className="input" placeholder="seu_nick" value={username} onChange={e => setUser(e.target.value)} required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">Senha</label>
                            <input className="input" type="password" placeholder="••••••" value={password} onChange={e => setPass(e.target.value)} required />
                        </div>
                        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
                            {loading ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                </svg>
                            ) : mode === 'login' ? 'Entrar' : 'Criar conta'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
