import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken, clearSession } from '../lib/auth'

let socket = null

export function getSocket() {
    if (socket) return socket
    socket = io('/', {
        auth: { token: getAccessToken() },
        transports: ['websocket'],
        autoConnect: true
    })
    socket.on('connect', () => console.log('[Socket] Conectado:', socket.id))
    socket.on('connect_error', (err) => {
        console.error('[Socket] Erro:', err.message)
        if (err.message === 'Token inválido.') {
            clearSession(); window.location.href = '/login'
        }
    })
    return socket
}

export function useBot(botId, handlers) {
    const handlersRef = useRef(handlers)
    handlersRef.current = handlers

    useEffect(() => {
        if (!botId) return
        const s = getSocket()

        const doSubscribe = () => s.emit('subscribe', { botId })
        if (s.connected) doSubscribe()
        else s.once('connect', doSubscribe)

        const onStatus  = (d) => { if (d.botId === botId) handlersRef.current.onStatus?.(d.data) }
        const onChat    = (d) => { if (d.botId === botId) handlersRef.current.onChat?.(d.entry) }
        const onError   = (d) => { if (d.botId === botId) handlersRef.current.onError?.(d.message) }
        const onDeath   = (d) => { if (d.botId === botId) handlersRef.current.onDeath?.() }
        const onReady   = (d) => { if (d.botId === botId) handlersRef.current.onReady?.() }

        s.on('bot:status',  onStatus)
        s.on('bot:chat',    onChat)
        s.on('bot:error',   onError)
        s.on('bot:death',   onDeath)
        s.on('bot:ready',   onReady)

        return () => {
            s.emit('unsubscribe', { botId })
            s.off('bot:status',  onStatus)
            s.off('bot:chat',    onChat)
            s.off('bot:error',   onError)
            s.off('bot:death',   onDeath)
            s.off('bot:ready',   onReady)
        }
    }, [botId])
}
