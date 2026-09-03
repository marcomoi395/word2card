import { describe, expect, it } from 'vitest'
import { createLogger } from '../logger'

describe('Logger', () => {
    it('emits structured entries with component and context', () => {
        const entries: Record<string, unknown>[] = []
        const logger = createLogger('test', { sink: (entry) => entries.push(entry) })
        logger.info('operation_completed', { requestId: 'req-1', count: 2 })
        expect(entries[0]).toMatchObject({
            level: 'info',
            component: 'test',
            event: 'operation_completed',
            requestId: 'req-1',
            count: 2
        })
        expect(entries[0].timestamp).toEqual(expect.any(String))
    })

    it('redacts sensitive fields, strings, and error messages', () => {
        const entries: Record<string, unknown>[] = []
        const logger = createLogger('test', { sink: (entry) => entries.push(entry) })
        logger.error('operation_failed', {
            authorization: 'Bearer secret-value',
            message: 'request failed with access_token=secret-value',
            error: new Error('request failed: https://example.test/?token=secret-value')
        })
        expect(entries[0]).toMatchObject({
            authorization: '[REDACTED]',
            message: 'request failed with access_token=[REDACTED]',
            error: { message: 'request failed: https://example.test/?token=[REDACTED]' }
        })
    })

    it('keeps envelope fields authoritative', () => {
        const entries: Record<string, unknown>[] = []
        const logger = createLogger('test', { sink: (entry) => entries.push(entry) })
        logger.info('expected_event', { event: 'forged_event', level: 'error', component: 'forged' })
        expect(entries[0]).toMatchObject({ event: 'expected_event', level: 'info', component: 'test' })
    })

    it('filters entries below the configured level', () => {
        const entries: Record<string, unknown>[] = []
        const logger = createLogger('test', { level: 'warn', sink: (entry) => entries.push(entry) })
        logger.info('ignored')
        logger.warn('included')
        expect(entries).toHaveLength(1)
        expect(entries[0].event).toBe('included')
    })

    it('does not throw for circular objects, arrays, and BigInt context', () => {
        const entries: Record<string, unknown>[] = []
        const values: unknown[] = [BigInt(2)]
        values.push(values)
        const context: Record<string, unknown> = { values }
        context.self = context
        const logger = createLogger('test', { sink: (entry) => entries.push(entry) })
        expect(() => logger.info('serialization_safe', context)).not.toThrow()
        expect(entries[0]).toMatchObject({ values: ['2', '[Circular]'], self: '[Circular]' })
    })

    it('does not throw when the sink fails', () => {
        const logger = createLogger('test', {
            sink: () => {
                throw new Error('sink failed')
            }
        })
        expect(() => logger.error('sink_failure_safe')).not.toThrow()
    })
})
