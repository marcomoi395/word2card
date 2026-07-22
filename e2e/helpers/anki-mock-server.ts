import http from 'http'

let server: http.Server | null = null
let currentScenario: 'success' | 'failure' = 'success'

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
    const { promise, resolve } = Promise.withResolvers<void>()
    if (server) {
        server.close(() => {
            console.log('[Mock] AnkiConnect mock server stopped')
            server = null
            resolve()
        })
    } else {
        resolve()
    }
    return promise
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
