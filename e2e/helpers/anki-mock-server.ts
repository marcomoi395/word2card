import http from 'http'
import { Socket } from 'net'

let server: http.Server | null = null
let currentScenario: 'success' | 'failure' = 'success'
const activeSockets = new Set<Socket>()

export function startAnkiMockServer(): Promise<void> {
    if (server) return Promise.resolve()

    const { promise, resolve, reject } = Promise.withResolvers<void>()

    server = http.createServer((req, res) => {
        // Add CORS headers just in case
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
            res.writeHead(200)
            res.end()
            return
        }

        // Control endpoint for changing scenario from test workers (cross-process communication)
        if (req.url === '/control' && req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => (body += chunk.toString()))
            req.on('end', () => {
                try {
                    const { scenario } = JSON.parse(body)
                    if (scenario === 'success' || scenario === 'failure') {
                        currentScenario = scenario
                        console.log(`[Mock] Scenario changed to: ${currentScenario}`)
                        res.writeHead(200, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ ok: true, scenario: currentScenario }))
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' })
                        res.end(JSON.stringify({ ok: false, error: 'Invalid scenario' }))
                    }
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }))
                }
            })
            return
        }

        // Simulate AnkiConnect failure when scenario is 'failure'
        if (currentScenario === 'failure') {
            res.writeHead(500)
            res.end('Mock Server Error')
            return
        }

        // Handle normal AnkiConnect API requests
        let body = ''
        req.on('data', (chunk) => (body += chunk.toString()))
        req.on('end', () => {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            if (req.method === 'GET') {
                res.end('AnkiConnect')
                return
            }

            try {
                const payload = JSON.parse(body)
                if (payload.action === 'version') {
                    res.end(JSON.stringify({ result: 6, error: null }))
                } else if (payload.action === 'findNotes') {
                    res.end(JSON.stringify({ result: [], error: null }))
                } else if (payload.action === 'addNotes') {
                    const count = payload.params?.notes?.length || 1
                    res.end(JSON.stringify({ result: Array(count).fill(Date.now()), error: null }))
                } else {
                    res.end(JSON.stringify({ result: null, error: null }))
                }
            } catch (e) {
                res.end(JSON.stringify({ result: null, error: null }))
            }
        })
    })

    // Track all active connections for proper cleanup
    server.on('connection', (socket: Socket) => {
        activeSockets.add(socket)
        socket.on('close', () => {
            activeSockets.delete(socket)
        })
    })

    server.listen(8765, () => {
        console.log('[Mock] AnkiConnect mock server listening on 0.0.0.0:8765')
        resolve()
    })

    server.on('error', (err) => {
        console.error('[Mock] Failed to start AnkiConnect mock server:', err)
        reject(err)
    })

    return promise
}

export function stopAnkiMockServer(): Promise<void> {
    if (!server) {
        return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
        console.log('[Mock] Stopping AnkiConnect mock server...')

        let resolved = false
        const doResolve = () => {
            if (!resolved) {
                resolved = true
                console.log('[Mock] AnkiConnect mock server stopped')
                server = null
                currentScenario = 'success' // Reset scenario
                activeSockets.clear()
                resolve()
            }
        }

        // Destroy all active sockets immediately
        for (const socket of activeSockets) {
            socket.destroy()
        }
        activeSockets.clear()

        // Close all connections (Node 18+)
        if (server.closeAllConnections) {
            server.closeAllConnections()
        }

        // Close server and wait for callback
        server.close((err) => {
            if (err) {
                console.warn('[Mock] Error closing server:', err)
            }
            doResolve()
        })

        // Force close after 1 second if graceful close fails
        setTimeout(() => {
            if (!resolved) {
                console.warn('[Mock] Force closing mock server after timeout')
                doResolve()
            }
        }, 1000)
    })
}

export async function setAnkiMockScenario(scenario: 'success' | 'failure'): Promise<void> {
    console.log('[Scenario] Sending:', scenario)
    const maxRetries = 3
    const retryDelay = 100
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('http://127.0.0.1:8765/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario })
            })

            if (response.ok) {
                return
            }

            console.warn(
                `[Mock] Scenario change attempt ${attempt} failed with status ${response.status}`
            )
        } catch (e) {
            if (attempt === maxRetries) {
                console.error('[Mock] Failed to set scenario after all retries:', e)
            } else {
                await new Promise((resolve) => setTimeout(resolve, retryDelay))
            }
        }
    }
}

export async function resetAnkiMockScenario(): Promise<void> {
    await setAnkiMockScenario('success')
}
