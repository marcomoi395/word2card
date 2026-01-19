import { defineConfig } from 'electron-vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    main: {
        plugins: [
            viteStaticCopy({
                targets: [
                    {
                        src: 'src/main/helper/model-flashcard.json',
                        dest: 'helper'
                    }
                ]
            })
        ]
    },
    preload: {},
    renderer: {}
})
