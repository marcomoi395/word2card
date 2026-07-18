import type { AppResponse } from '../../shared/ipc'

export const success = <T>(data?: T, message?: string): AppResponse<T> => {
    return {
        status: 'success',
        data,
        message
    }
}

export const failure = (message: string): AppResponse => ({
    status: 'error',
    message
})
