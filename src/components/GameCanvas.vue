<template>
    <div class="game-canvas">
        <canvas ref="canvas"></canvas>
        <!-- 游戏内容 -->
        <template v-if="gameState == 'playing'">
            <GameObject 
                :gameObjects="gameObjects"
                :assets="gameAssets"
            />
            <div class="score-display">
                <div class="score"> {{ t('score') }}: {{ score }}</div>
                <div class="time" :class="{ 'time-warning': gameTime <= 30 }">
                    {{ t('countTime') }}: {{ gameTime }}s
                </div>
            </div>
        </template>
        <!-- 游戏结束画面 -->
        <div class="game-over" v-if="gameState == 'gameover'">
            <div class="game-over-content">
                <h1>Game Over</h1>
                <div class="stats">
                    <p>{{ t('timePlayed') }}: {{ DC.GAME_DURATION - gameTime }}</p>
                    <p>{{ t('finalScore') }}: {{ score }}</p>
                </div>
                <div class="buttons">
                    <button @click="$emit('restart-game')">{{ t('retry')}}</button>
                    <button @click="backToMenu">{{ t('back')}}</button>
                </div>
            </div>
        </div>
        <!-- 添加分数动画 -->
        <div class="score-animations">
            <transition-group name="score-popup">
                <div 
                    v-for="animation in scoreAnimations" 
                    :key="animation.id"
                    class="score-popup"
                    :style="{ 
                        left: `${animation.x}px`, 
                        top: `${animation.y}px`,
                        color: animation.value > 0 ? '#4CAF50' : '#FF0000'
                    }"
                >
                    {{ animation.value > 0 ? '+' : '' }}{{ animation.value }}
                </div>
            </transition-group>
        </div>
    </div>
</template>
<script setup>
import { t } from '../Language/language.js'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import GameObject from './GameObject.vue'
import { GAME_CONFIG as GC, DIFFICULTY_SETTINGS } from '../utils/constants'
const emit = defineEmits(['restart-game', 'back-to-menu'])
const canvas = ref(null)

const gameAssets = ref(null)
const gameObjects = ref({})

const score = ref(0)
const playerInfo = ref({})
const input = ref({})

const gameState = ref("menu") //menu,countdown,calibrating,playing,gameover
let gameLoop = null
const gameStartTime = ref(0)
const gameTime = ref(0)
let gameTimer = null

let lastUpdateTime = null
let lastSpawnTime = null

const difficulty = ref('medium')
const mode = ref('double')
let DC = DIFFICULTY_SETTINGS.MEDIUM //DIFFICULTY_CONFIG

const scoreAnimations = ref([])
let animationId = 0
let backgroundMusic = null

const setGameAssets = (assets, gameConfig) => {
    gameAssets.value = assets
    difficulty.value = gameConfig.difficulty
    mode.value = gameConfig.mode
    DC = DIFFICULTY_SETTINGS[difficulty.value.toUpperCase()]
}
const playSound = (key, lang=false) => {
    if (lang){
        gameAssets.value.sounds[key+t('key')].play()
    }else{
        gameAssets.value.sounds[key].play()
    }
}
const resetGame = () => {
    gameState.value = "menu"
    score.value = 0
    gameObjects.value = {
        shield:{x:920, y:920, width:400, height:400, rotation:0, image:`SHIELD`, frames:1},
        player:{x:920, y:920, width:80, height:80, rotation:100, image:`PLAYER`, frames:1},
        entities:[],
        cursor:{x:0, y:0, width:50, height:50, rotation:0, image:`CURSOR`, frames:1},
        bars:[]
    }
    playerInfo.value = {
        hp:DC.MAX_HP
    }
    gameTime.value = DC.GAME_DURATION
    if (gameLoop) {
        cancelAnimationFrame(gameLoop)
    }
    if (gameTimer) {
        clearInterval(gameTimer)
    }
    if (backgroundMusic) {
        backgroundMusic.pause()
        backgroundMusic.currentTime = 0
    }
}
const initGame = () => {
    if (canvas.value && gameAssets.value) {
        const ctx = canvas.value.getContext('2d')
        ctx.drawImage(
            gameAssets.value.images.BACKGROUND,
            0,
            0,
            canvas.value.width,
            canvas.value.height
        )
    }
    gameState.value = "playing"
    gameStartTime.value = Date.now()
    
    gameTime.value = DC.GAME_DURATION
    gameTimer = setInterval(() => {
        if (gameTime.value > 0) {
            gameTime.value--
            if (gameTime.value <= 0) {
                gameOver()
            }
        }
    }, 1000)

    lastSpawnTime = Date.now()
    if (gameAssets.value?.sounds?.BACKGROUND_MUSIC) {
        backgroundMusic = gameAssets.value.sounds.BACKGROUND_MUSIC
        backgroundMusic.loop = true
        backgroundMusic.volume = 0.5
        backgroundMusic.play()
    }
    startGameLoop()
}
const startGameLoop = () => {
    lastUpdateTime = Date.now()
    const loop = () => {
        try {
            if (gameState.value != "playing") return
            updateGame()
            gameLoop = requestAnimationFrame(loop)
            lastUpdateTime = Date.now()
        } catch (error) {
            console.error('Error in game loop:', error)
            // 如果发生错误，尝试重新启动游戏循环
            gameLoop = requestAnimationFrame(loop)
            lastUpdateTime = Date.now()
        }
    }
    gameLoop = requestAnimationFrame(loop)
}
const updateGame = () => {
    const currentTime = Date.now()
    const timeDelta = currentTime - lastUpdateTime

    //Update Player
    if (mode.value == 'lefthand'){
        gameObjects.value.cursor.x = input.value.handLX
        gameObjects.value.cursor.y = input.value.handLY
    }else{
        gameObjects.value.cursor.x = input.value.handRX
        gameObjects.value.cursor.y = input.value.handRY
    }
    gameObjects.value.shield.rotation = angler(gameObjects.value.player, gameObjects.value.cursor)
    
    //Update Entities
    if (Date.now()-lastSpawnTime > DC.SPAWN_TIME){
        lastSpawnTime = Date.now()
        let angle = Math.random()*Math.PI
        //temporary
        gameObjects.value.entities.push({
            x: gameObjects.value.player.x - 1000*Math.cos(angle),
            y: gameObjects.value.player.y - 1000*Math.sin(angle),
            width: 40,
            height:40,
            rotation: angle,
            image: `RED`,
            frames: 1,
            xV: 0.1 * Math.cos(angle),
            yV: 0.1 * Math.sin(angle)
        })
    }
    gameObjects.value.entities=gameObjects.value.entities.filter(entity => {
        entity.x += entity.xV * timeDelta
        entity.y += entity.yV * timeDelta
        if (distSquared(entity, gameObjects.value.player) < (gameObjects.value.shield.width/2 + 20)**2
            && distSquared(entity, gameObjects.value.player) > (gameObjects.value.shield.width/2 - 20)**2
            && Math.abs(entity.rotation+Math.PI - gameObjects.value.shield.rotation) < 27*Math.PI/180){
                score.value+=10
                playSound(`GOOD`)
                console.log(distSquared(entity, gameObjects.value.player))
                return false
        }
        if (distSquared(entity, gameObjects.value.player) < (gameObjects.value.player.width/2)**2){
            playerInfo.value.hp-=1
            if (playerInfo.value.hp <= 0){
                gameOver()
            }
            playSound(`BAD`)
            return false
        }
        return true
    })

    //Display
    const barWidth = 96 * playerInfo.value.hp / DC.MAX_HP
    gameObjects.value.bars=[
        {
            x: gameObjects.value.player.x,
            y: gameObjects.value.player.y-70,
            width: 100,
            height: 20,
            rotation: 0,
            image: `BLACK`,
            frames: 1
        },{
            x: gameObjects.value.player.x + barWidth/2 - 48,
            y: gameObjects.value.player.y - 70,
            width: barWidth,
            height: 16,
            rotation: 0,
            image: `GREEN`,
            frames: 1
        }
    ]

    lastUpdateTime = currentTime
}
const randint = (a, b, excl = false) => {
    return Math.floor(a + (b - a + (excl?0:1)) * Math.random())
}
const generateRandomPermutation = (n) => {
    let permutation = Array.from({ length: n }, (_, i) => i + 1)
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = permutation[j]
        permutation[j] = permutation[i]
        permutation[i] = temp
    }
    return permutation
}
const checkCollision = (rect1, rect2) => {
    //add later
}
const angler = (origin,point) => {
    if (point.x>origin.x){
        return point.y>origin.y ? Math.atan((point.y-origin.y)/(point.x-origin.x)) : Math.atan((point.y-origin.y)/(point.x-origin.x))+Math.PI*2
    }else if (point.x==origin.x){
        return point.y>origin.y ? Math.PI/2 : -Math.Pi/2
    }else{
        return Math.atan((point.y-origin.y)/(point.x-origin.x))+Math.PI
    }
}
const distSquared = (r1,r2) => {
    return (r1.x - r2.x)**2 + (r1.y - r2.y)**2
}
// 游戏结束
const gameOver = () => {
    gameState.value = "gameover"
    // 停止游戏循环和计时器
    if (gameLoop) {
        cancelAnimationFrame(gameLoop)
    }
    if (gameTimer) {
        clearInterval(gameTimer)
    }
}
// 返回菜单
const backToMenu = () => {
    // 重置所有游戏状态
    resetGame()
    // 重置难度
    difficulty.value = 'medium'
    // 发送返回菜单事件
    emit('back-to-menu')
}
// 组件卸载时清理
onUnmounted(() => {
    if (gameTimer) {
        clearInterval(gameTimer)
    }
    // 停止并清理背景音乐
    if (backgroundMusic) {
        backgroundMusic.pause()
        backgroundMusic = null
    }
})
// 更新角色位置（由姿势检测触发）
const setInput = (newInput) => {
    input.value=newInput
}
// 添加 onMounted 钩子来设画布尺寸
onMounted(() => {
    if (canvas.value) {
        if (window.innerWidth/window.innerHeight > GC.SCREEN_WIDTH/GC.SCREEN_HEIGHT){
            canvas.value.height = window.innerHeight
            canvas.value.width = GC.SCREEN_WIDTH * window.innerHeight / GC.SCREEN_HEIGHT
        }else{
            canvas.value.width = window.innerWidth
            canvas.value.height = GC.SCREEN_HEIGHT * window.innerWidth / GC.SCREEN_WIDTH
        }
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            if (window.innerWidth/window.innerHeight > GC.SCREEN_WIDTH/GC.SCREEN_HEIGHT){
                canvas.value.height = window.innerHeight
                canvas.value.width = GC.SCREEN_WIDTH * window.innerHeight / GC.SCREEN_HEIGHT
            }else{
                canvas.value.width = window.innerWidth
                canvas.value.height = GC.SCREEN_HEIGHT * window.innerWidth / GC.SCREEN_WIDTH
            }
            // 重新绘制背景
            if (gameAssets.value) {
                const ctx = canvas.value.getContext('2d')
                ctx.drawImage(
                    gameAssets.value.images.BACKGROUND,
                    0,
                    0,
                    canvas.value.width,
                    canvas.value.height
                )
            }
        })
    }
})
defineExpose({
    canvas,
    setGameAssets,
    setInput,
    backToMenu,
    resetGame,
    initGame
})
</script>
<style scoped>
.game-canvas {
    margin: auto;
    z-index: 0;
    overflow: hidden;
}
canvas {
    margin: auto;
    overflow: hidden;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
.score-display {
    position: fixed;
    top: 20px;
    left: 20px;
    font-size: 48px;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    background: rgba(0, 0, 0, 0.5);
    padding: 20px;
    border-radius: 10px;
    backdrop-filter: blur(5px);
}
.life {
    margin-bottom: 20px;
    color: #FF6B6B;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
}
.score {
    color: #4CAF50;
    margin-bottom: 20px;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}
.collision-indicator {
    position: absolute;
    color: red;
    font-size: 32px;
    font-weight: bold;
    animation: fadeUp 1s ease-out;
    opacity: 0;
}
@keyframes fadeUp {
    0% {
        transform: translateY(0);
        opacity: 1;
    }
    100% {
        transform: translateY(-30px);
        opacity: 0;
    }
}
.game-over {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}
.game-over-content {
    background: rgba(143, 212, 245, 0.9);
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    border: 2px solid rgba(255, 255, 255, 0.1);
}
.game-over h1 {
    color: #FF0000;
    font-size: 64px;
    font-weight: bold;
    margin-bottom: 30px;
    text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}
.stats {
    margin-bottom: 30px;
}
.stats p {
    color: white;
    font-size: 48px;
    font-weight: bold;
    margin: 10px 0;
}
.buttons {
    display: flex;
    gap: 20px;
    justify-content: center;
}
.buttons button {
    padding: 15px 30px;
    font-size: 36px;
    font-weight: bold;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
}
.buttons button:first-child {
    background: #4CAF50;
    color: white;
}
.buttons button:last-child {
    background: #2196F3;
    color: white;
}
.buttons button:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
}
.time {
    color: #FFD700;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}
.time-warning {
    color: #FF0000 !important;
    animation: blink 1s infinite;
}
@keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}
.progress-bar {
    height: 100%;
    background: #4CAF50;
    transition: width 0.1s linear;
}
.score-popup {
    position: fixed;
    left: 50% !important;    /* 强制居中 */
    top: 50% !important;     /* 强制居中 */
    transform: translate(-50%, -50%);
    font-size: 48px;    /* 增大字体 */
    font-weight: bold;
    pointer-events: none;
    animation: float-up 1s ease-out;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    z-index: 1000;
}
.score-popup.positive {
    color: #4CAF50;
}
.score-popup.negative {
    color: #FF0000;
}
@keyframes float-up {
    0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -100%) scale(1.5);
        opacity: 0;
    }
}
.score-popup-enter-active,
.score-popup-leave-active {
    transition: all 1s ease-out;
}
.score-popup-enter-from,
.score-popup-leave-to {
    opacity: 0;
    transform: translateY(20px);
}
</style>
