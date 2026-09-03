export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
    [key: string]: unknown
}

export interface LoggerOptions {
    component: string
    level?: LogLevel
    context?: LogContext
    sink?: (entry: Record<string, unknown>) => void
}

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }
const SECRET_KEY_PATTERN =
    /(token|secret|password|api[-_]?key|authorization|auth|credential|cookie|session|refresh|jwt|access[_-]?token|client[_-]?secret)/i
const SENSITIVE_TEXT_PATTERN =
    /(bearer\s+|basic\s+)[^\s]+|((?:[?&]|\b)(?:token|key|secret|password|api[_-]?key|access[_-]?token|client[_-]?secret)=)[^&\s]+/gi

const sanitizeText = (value: string): string =>
    value.replace(
        SENSITIVE_TEXT_PATTERN,
        (_match, prefix: string, queryPrefix: string) => `${prefix ?? queryPrefix}[REDACTED]`
    )

const sanitize = (value: unknown, key?: string, seen = new WeakSet<object>()): unknown => {
    if (key && SECRET_KEY_PATTERN.test(key)) return '[REDACTED]'
    if (value instanceof Error) {
        const error = value as Error & { code?: string }
        return {
            name: error.name,
            message: sanitizeText(error.message),
            ...(error.code ? { code: sanitizeText(error.code) } : {})
        }
    }
    if (typeof value === 'string') return sanitizeText(value)
    if (typeof value === 'bigint') return value.toString()
    if (value && typeof value === 'object') {
        if (seen.has(value)) return '[Circular]'
        seen.add(value)
        if (Array.isArray(value)) return value.map((item) => sanitize(item, undefined, seen))
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
                entryKey,
                sanitize(entryValue, entryKey, seen)
            ])
        )
    }
    return value
}

const ANSI = {
    reset: '\u001b[0m',
    debug: '\u001b[36m',
    info: '\u001b[32m',
    warn: '\u001b[33m',
    error: '\u001b[31m'
} as const

const supportsColor = (): boolean => {
    if (typeof process === 'undefined') return false
    if (process.env['NO_COLOR'] !== undefined) return false
    if (process.env['FORCE_COLOR'] !== undefined) return process.env['FORCE_COLOR'] !== '0'
    return Boolean(process.stdout?.isTTY || process.stderr?.isTTY)
}

const formatValue = (value: unknown): string => {
    if (typeof value === 'string') return JSON.stringify(value)
    try {
        const output = JSON.stringify(value)
        return output === undefined ? String(value) : output
    } catch {
        return '[Unserializable]'
    }
}

export const formatLogEntry = (entry: Record<string, unknown>, color = supportsColor()): string => {
    const level = entry.level as LogLevel
    const timestamp =
        typeof entry.timestamp === 'string' ? entry.timestamp.slice(11, 23) : '----------'
    const component = String(entry.component ?? 'logger')
    const event = String(entry.event ?? 'unknown_event')
    const details = Object.entries(entry)
        .filter(([key]) => !['timestamp', 'level', 'component', 'event'].includes(key))
        .map(([key, value]) => `${key}=${formatValue(value)}`)
        .join(' ')
    const line = `${timestamp} ${level.toUpperCase().padEnd(5)} ${component} ${event}${details ? ` ${details}` : ''}`
    if (!color || !(level in ANSI)) return line
    return `${ANSI[level].concat(line)}${ANSI.reset}`
}

const defaultSink = (entry: Record<string, unknown>): void => {
    const output = formatLogEntry(entry)
    const level = entry.level as LogLevel
    if (level === 'error') console.error(output)
    else if (level === 'warn') console.warn(output)
    else if (level === 'debug') console.debug(output)
    else console.info(output)
}

export class Logger {
    private readonly component: string
    private readonly minimumLevel: LogLevel
    private readonly context: LogContext
    private readonly sink: (entry: Record<string, unknown>) => void

    constructor(options: LoggerOptions) {
        this.component = options.component
        this.minimumLevel = options.level ?? 'info'
        this.context = options.context ?? {}
        this.sink = options.sink ?? defaultSink
    }

    child(context: LogContext): Logger {
        return new Logger({
            component: this.component,
            level: this.minimumLevel,
            context: { ...this.context, ...context },
            sink: this.sink
        })
    }

    debug(event: string, context: LogContext = {}): void {
        this.write('debug', event, context)
    }

    info(event: string, context: LogContext = {}): void {
        this.write('info', event, context)
    }

    warn(event: string, context: LogContext = {}): void {
        this.write('warn', event, context)
    }

    error(event: string, context: LogContext = {}): void {
        this.write('error', event, context)
    }

    private write(level: LogLevel, event: string, context: LogContext): void {
        if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minimumLevel]) return
        const baseContext = sanitize(this.context) as Record<string, unknown>
        const eventContext = sanitize(context) as Record<string, unknown>
        try {
            this.sink({
                ...baseContext,
                ...eventContext,
                timestamp: new Date().toISOString(),
                level,
                component: this.component,
                event
            })
        } catch {
            // Logging must never interrupt application behavior.
        }
    }
}

export const createLogger = (
    component: string,
    options: Omit<LoggerOptions, 'component'> = {}
): Logger => new Logger({ component, ...options })
