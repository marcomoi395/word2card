import { startAnkiMockServer } from './helpers/anki-mock-server'
export default async function globalSetup() {
  await startAnkiMockServer()
}
