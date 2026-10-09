<template>
    <div id="app">
        <GameCanvas ref="gameCanvas" @back-to-menu="handleBackToMenu" @restart-game="handleGameRestart" />
        <CameraView ref="cameraView"
            @on-input="onInput"
            :showCamera="isPlaying"
        />
        <MenuScreen 
            v-if="!isPlaying"
            @start-game="handleGameStart"
        />
    </div>
</template>

<script setup>

import CameraView from './components/CameraView.vue'
import GameCanvas from './components/GameCanvas.vue'
import MenuScreen from './components/MenuScreen.vue'
import { ref, onMounted } from 'vue'
import { GAME_CONFIG, ASSETS } from './utils/constants'

const gameCanvas = ref(null)
const cameraView = ref(null)
const isPlaying = ref(false)
const assetsLoaded = ref(false)

// 预加载图片
const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })
}

// 预加载音频
const loadAudio = (src) => {
    return new Promise((resolve, reject) => {
        try {
            const audio = new Audio()
            audio.oncanplaythrough = () => resolve(audio)
            audio.onerror = (e) => {
                console.error('Error loading audio:', src, e)
                // 如果音频加载失败，返回一个空对象而不是reject
                resolve({
                    play: () => {},
                    pause: () => {},
                    loop: false,
                    volume: 1,
                    currentTime: 0
                })
            }
            audio.src = src
        } catch (error) {
            console.error('Error creating audio:', src, error)
            // 同样返回空对象
            resolve({
                play: () => {},
                pause: () => {},
                loop: false,
                volume: 1,
                currentTime: 0
            })
        }
    })
}

// 加载所有资源
const loadAssets = async () => {
    const assets = {
        images: {},
        sounds: {}
    }

    try {
        // 加载图片
        for (const [key, src] of Object.entries(ASSETS.IMAGES)) {
            assets.images[key] = await loadImage(src)
        }

        // 加载音频
        for (const [key, src] of Object.entries(ASSETS.SOUNDS)) {
            try {
                assets.sounds[key] = await loadAudio(src)
            } catch (error) {
                console.error(`Error loading sound ${key}:`, error)
                // 如果某个音频加载失败，提供一个空的替代对象
                assets.sounds[key] = {
                    play: () => {},
                    pause: () => {},
                    loop: false,
                    volume: 1,
                    currentTime: 0
                }
            }
        }

        return assets
    } catch (error) {
        console.error('Error loading assets:', error)
        throw error
    }
}

const handleGameRestart = () => {
    isPlaying.value = false
    handleGameStart()
}
// 处理游戏开始
const handleGameStart = async (gameConfig) => {
    try {
        if (!isPlaying.value){
            console.log('Starting game with config:', gameConfig)
            isPlaying.value = true
            if (!assetsLoaded.value){
                const assets = await loadAssets()
                gameCanvas.value.setGameAssets(assets, gameConfig)
                assetsLoaded.value = true
            }
            gameCanvas.value.resetGame()
            await cameraView.value.startCalibration()
            gameCanvas.value.initGame()
        }
    } catch (error) {
        console.error('Error starting game:', error)
    }
}

// 处理肩部位置更新
const onInput = (input) => {
    if (gameCanvas.value && isPlaying.value) {
        gameCanvas.value.setInput(input)
    }
}

// 添加处理返回菜单的函数
const handleBackToMenu = () => {
    isPlaying.value = false
    assetsLoaded.value = false
}

onMounted(async () => {
    try {
        // 加载资源
        const assets = await loadAssets()
        
        // 设置游戏资源
        if (gameCanvas.value) {
            gameCanvas.value.setGameAssets(assets, {difficulty: 'medium', mode: 'double'})
        }
    } catch (error) {
        console.error('Error loading assets:', error)
    }
})
</script>

<style>
#app {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #000;
}
</style>