<template>
    <canvas ref="gameObjectCanvas" class="gameObjects"></canvas>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { GAME_CONFIG } from '../utils/constants'
const props = defineProps({
    gameObjects: {
        type: Object,
        required: true,
        default: () => []
    },
    assets: {
        type: Object,
        required: false
    }
})
const gameObjectCanvas = ref(null)
const SCALE = ref(0)
let currentFrame = 0
let lastUpdateTime = 0
const ANIMATION_SPEED = 100 // 动画更新间隔(ms)
// 更新角色动画
const updateAnimation = (timestamp) => {
    if (timestamp - lastUpdateTime > ANIMATION_SPEED) {
        currentFrame = (currentFrame + 1) % 2520
        lastUpdateTime = timestamp
    }
}
// 绘制角色
const drawGameObjects = (ctx) => {
    if (!props.assets || !props.assets.images) {return;}
    Object.keys(props.gameObjects).forEach(gameObjectKey => {
        if (Array.isArray(props.gameObjects[gameObjectKey])){
            props.gameObjects[gameObjectKey].forEach(obj => {
                let imageKey = ""
                if (obj.frames == 1){
                    imageKey = obj.image
                }else{
                    imageKey = `${obj.image}_FRAME_${currentFrame % obj.frames}`
                }
                const image = props.assets.images[imageKey]
                if (image) {
                    ctx.translate(obj.x*SCALE.value, obj.y*SCALE.value)
                    ctx.rotate(obj.rotation)
                    ctx.drawImage(
                        image,
                        -obj.width*SCALE.value/2,
                        -obj.height*SCALE.value/2,
                        obj.width*SCALE.value,
                        obj.height*SCALE.value
                    )
                    ctx.rotate(-obj.rotation)
                    ctx.translate(-obj.x*SCALE.value, -obj.y*SCALE.value)
                }
            })
        }else{
            let obj = props.gameObjects[gameObjectKey]
            let imageKey = ""
            if (obj.frames == 1){
                imageKey = obj.image
            }else{
                imageKey = `${obj.image}_FRAME_${currentFrame % obj.frames}`
            }
            const image = props.assets.images[imageKey]
            if (image) {
                ctx.translate(obj.x*SCALE.value, obj.y*SCALE.value)
                ctx.rotate(obj.rotation)
                ctx.drawImage(
                    image,
                    -obj.width*SCALE.value/2,
                    -obj.height*SCALE.value/2,
                    obj.width*SCALE.value,
                    obj.height*SCALE.value
                )
                ctx.rotate(-obj.rotation)
                ctx.translate(-obj.x*SCALE.value, -obj.y*SCALE.value)
            }
        }
    });
}
// 动画循环
const animate = (timestamp) => {
    if (!gameObjectCanvas.value) return
    const ctx = gameObjectCanvas.value.getContext('2d')
    ctx.clearRect(0, 0, gameObjectCanvas.value.width, gameObjectCanvas.value.height)
    updateAnimation(timestamp)
    drawGameObjects(ctx)
    requestAnimationFrame(animate)
}
const resizeScreen = () => {
    if (gameObjectCanvas.value) {
        if (window.innerWidth/window.innerHeight > GAME_CONFIG.SCREEN_WIDTH/GAME_CONFIG.SCREEN_HEIGHT){
            gameObjectCanvas.value.height = window.innerHeight
            gameObjectCanvas.value.width = GAME_CONFIG.SCREEN_WIDTH * window.innerHeight / GAME_CONFIG.SCREEN_HEIGHT
            SCALE.value = window.innerHeight/GAME_CONFIG.SCREEN_HEIGHT
        }else{
            gameObjectCanvas.value.width = window.innerWidth
            gameObjectCanvas.value.height = GAME_CONFIG.SCREEN_HEIGHT * window.innerWidth / GAME_CONFIG.SCREEN_WIDTH
            SCALE.value = window.innerWidth/GAME_CONFIG.SCREEN_WIDTH
        }
    }
}
onMounted(() => {
    try {
        resizeScreen()
        // 监听窗口大小变化
        window.addEventListener('resize', resizeScreen)
        requestAnimationFrame(animate)
    } catch (error) {
        console.error('Error in Obstacle component:', error)
    }
})
</script>
<style scoped>
.gameObjects {
    margin: auto;
    overflow: hidden;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
.bonus {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
}
.avatar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}
</style>
