import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    plugins: [vue()],
    server: {
        port: 9205
    },
    build: {
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
            input: path.resolve(__dirname, 'index.html'),
            output: {
                manualChunks: {
                    'mediapipe-pose': ['@mediapipe/pose'],
                    'tensorflow': ['@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-webgl']
                },
                assetFileNames: 'assets/[name].[hash].[ext]',
                chunkFileNames: 'assets/[name].[hash].js',
                entryFileNames: 'assets/[name].[hash].js'
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    optimizeDeps: {
        include: ['@mediapipe/pose', '@tensorflow/tfjs-core', '@tensorflow/tfjs-backend-webgl']
    }
})
