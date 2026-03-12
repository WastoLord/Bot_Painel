import { NavLink, useNavigate } from 'react-router-dom'
import { getUser, clearSession, api } from '../lib/auth'

function Icon({ d }) {
    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>{d}</svg>
}

export default function Layout({ children }) {
    const user = getUser()
    const navigate = useNavigate()

    async function logout() {
        const rt = localStorage.getItem('refreshToken')
        await api('POST', '/auth/logout', { refreshToken: rt }).catch(() => {})
        clearSession()
        navigate('/login')
    }

    const nav = [
        { to: '/dashboard', label: 'Dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
        ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> }] : [])
    ]

    return (
        <div className="flex min-h-screen bg-stone-50">
            <aside className="w-56 bg-white border-r border-stone-200 flex flex-col fixed inset-y-0 left-0 z-20">
                <div className="px-5 py-5 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                            </svg>
                        </div>
                        <span className="font-display font-bold text-stone-900">Plasma</span>
                    </div>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {nav.map(item => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:bg-stone-100'}`}>
                            <Icon d={item.icon} />{item.label}
                        </NavLink>
                    ))}
                </nav>
                <div className="px-3 py-4 border-t border-stone-100">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-brand-700">{user?.username?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-stone-800 truncate">{user?.username}</p>
                            <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
                        </div>
                        <button onClick={logout} className="text-stone-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>
            <main className="flex-1 ml-56 p-6 min-h-screen">{children}</main>
        </div>
    )
}
