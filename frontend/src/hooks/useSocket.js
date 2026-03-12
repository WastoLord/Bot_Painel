import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken, clearSession } from '../lib/auth'

let socket = null

export function getSocket() {
    if (!socket) {
        socket = io('/', {
            auth: { token: getAccessToken() },
            transports: ['websocket'],
            autoConnect: true
        })
        socket.on('connect_error', (err) => {
            if (err.message === 'Token inválido.') {
                clearSession()
                window.location.href = '/login'
            }
        })
    }
    return socket
}

export function useBot(botId, handlers) {
    const handlersRef = useRef(handlers)
    handlersRef.current = handlers

    useEffect(() => {
        if (!botId) return
        const s = getSocket()
        s.emit('subscribe', { botId })
        const on = (ev, fn) => s.on(ev, (data) => { if (data.botId === botId) fn(data) })
        on('bot:status', (d) => handlersRef.current.onStatus?.(d.data))
        on('bot:chat',   (d) => handlersRef.current.onChat?.(d.entry))
        on('bot:error',  (d) => handlersRef.current.onError?.(d.message))
        on('bot:death',  ()  => handlersRef.current.onDeath?.())
        on('bot:ready',  ()  => handlersRef.current.onReady?.())
        return () => {
            s.emit('unsubscribe', { botId })
            ;['bot:status','bot:chat','bot:error','bot:death','bot:ready'].forEach(e => s.off(e))
        }
    }, [botId])
}
