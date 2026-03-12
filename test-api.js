/**
 * test-api.js
 * Testa register → login → criar bot → listar bots → deletar bot
 * Requer o servidor rodando: node server.js
 *
 * Uso: node test-api.js
 */

const BASE = 'http://localhost:3000/api'

let accessToken  = ''
let refreshToken = ''
let botDbId      = ''

async function req(method, path, body, token) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    })
    const data = await res.json()
    return { status: res.status, data }
}

function ok(label, condition, detail = '') {
    const icon = condition ? '✅' : '❌'
    console.log(`${icon} ${label}${detail ? ' — ' + detail : ''}`)
    if (!condition) process.exitCode = 1
}

async function run() {
    console.log('=== Teste da API ===\n')

    // 1. Register
    const reg = await req('POST', '/auth/register', { username: 'teste_user', password: '123456' })
    ok('Register', reg.status === 201 || reg.status === 409, `status ${reg.status}`)

    // 2. Login
    const login = await req('POST', '/auth/login', { username: 'teste_user', password: '123456' })
    ok('Login', login.status === 200, `status ${login.status}`)
    accessToken  = login.data.accessToken
    refreshToken = login.data.refreshToken

    // 3. Login com senha errada
    const badLogin = await req('POST', '/auth/login', { username: 'teste_user', password: 'errada' })
    ok('Login senha errada → 401', badLogin.status === 401)

    // 4. Rota protegida sem token
    const noToken = await req('GET', '/bots')
    ok('GET /bots sem token → 401', noToken.status === 401)

    // 5. Listar bots (lista vazia)
    const list1 = await req('GET', '/bots', null, accessToken)
    ok('GET /bots autenticado', list1.status === 200, `${list1.data.length} bots`)

    // 6. Criar bot
    const create = await req('POST', '/bots', {
        botName:    'Plasma_Teste',
        serverHost: 'jogar.craftsapiens.com.br',
        serverPort: 25565,
        authMode:   'none'
    }, accessToken)
    ok('POST /bots criar', create.status === 201, `id=${create.data.id}`)
    botDbId = create.data.id

    // 7. Listar bots (1 bot)
    const list2 = await req('GET', '/bots', null, accessToken)
    ok('GET /bots depois de criar', list2.status === 200 && list2.data.length >= 1)

    // 8. GET /bots/:id
    const detail = await req('GET', `/bots/${botDbId}`, null, accessToken)
    ok('GET /bots/:id', detail.status === 200, `botName=${detail.data.botName}`)

    // 9. Enable módulo
    const enable = await req('POST', `/bots/${botDbId}/modules/combat/enable`, null, accessToken)
    ok('Enable módulo combat', enable.status === 200)

    // 10. Disable módulo
    const disable = await req('POST', `/bots/${botDbId}/modules/combat/disable`, null, accessToken)
    ok('Disable módulo combat', disable.status === 200)

    // 11. Patch config módulo
    const cfg = await req('PATCH', `/bots/${botDbId}/modules/combat/config`, { config: { speed: 500 } }, accessToken)
    ok('PATCH módulo config', cfg.status === 200)

    // 12. Refresh token
    const refresh = await req('POST', '/auth/refresh', { refreshToken })
    ok('Refresh token', refresh.status === 200 && !!refresh.data.accessToken)
    accessToken  = refresh.data.accessToken
    refreshToken = refresh.data.refreshToken

    // 13. Deletar bot
    const del = await req('DELETE', `/bots/${botDbId}`, null, accessToken)
    ok('DELETE /bots/:id', del.status === 200)

    // 14. Logout
    const logout = await req('POST', '/auth/logout', { refreshToken })
    ok('Logout', logout.status === 200)

    // 15. Refresh após logout → 401
    const expiredRefresh = await req('POST', '/auth/refresh', { refreshToken })
    ok('Refresh após logout → 401', expiredRefresh.status === 401)

    console.log('\n=== Fim ===')
}

run().catch(err => {
    console.error('Erro no teste:', err.message)
    process.exit(1)
})
