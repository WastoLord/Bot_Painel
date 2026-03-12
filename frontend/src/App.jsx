import { Routes, Route, Navigate } from 'react-router-dom'
import { isLogged, getUser } from './lib/auth'
import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import BotPage   from './pages/Bot'
import Admin     from './pages/Admin'

function Private({ children }) {
    if (!isLogged()) return <Navigate to="/login" replace />
    return children
}
function AdminOnly({ children }) {
    const user = getUser()
    if (!isLogged()) return <Navigate to="/login" replace />
    if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
    return children
}
export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
            <Route path="/bot/:id" element={<Private><BotPage /></Private>} />
            <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
            <Route path="*" element={<Navigate to={isLogged() ? '/dashboard' : '/login'} replace />} />
        </Routes>
    )
}
