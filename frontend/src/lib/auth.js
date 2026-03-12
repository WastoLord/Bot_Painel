let accessToken = localStorage.getItem('accessToken') ?? ''
let userData    = JSON.parse(localStorage.getItem('user') ?? 'null')

export function getUser()  { return userData }
export function isLogged() { return !!accessToken }

export function setSession(data) {
    accessToken = data.accessToken
    userData    = data.user
    localStorage.setItem('accessToken',  data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
}

export function clearSession() {
    accessToken = ''
    userData    = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
}

async function refreshAccessToken() {
    const rt = localStorage.getItem('refreshToken')
    if (!rt) { clearSession(); return false }
    const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt })
    })
    if (!res.ok) { clearSession(); return false }
    const data = await res.json()
    accessToken = data.accessToken
    localStorage.setItem('accessToken',  data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    return true
}

export async function api(method, path, body) {
    const doReq = (token) => fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined
    })
    let res = await doReq(accessToken)
    if (res.status === 401) {
        const ok = await refreshAccessToken()
        if (!ok) { window.location.href = '/login'; return null }
        res = await doReq(accessToken)
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'Erro desconhecido')
    }
    return res.json()
}

export function getAccessToken() { return accessToken }
