import { defineConfig } from 'electron-vite'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    main: {
        plugins: [
            viteStaticCopy({
                targets: [
                    {
                        src: path.resolve(__dirname, 'src/main/helper/model-flashcard.json'),
                        dest: 'helper'
                    }
                ]
            })
        ]
    },
    preload: {},
    renderer: {}
})
