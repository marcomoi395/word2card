import { stopAnkiMockServer } from './helpers/anki-mock-server'
export default async function globalTeardown() {
    stopAnkiMockServer()
}
