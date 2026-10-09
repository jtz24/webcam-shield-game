<template>
    <div class="camera-container" v-show="showCamera">
        <div class="camera-wrapper">
            <!-- 摄像头视频元素 -->
            <video
                ref="videoElement"
                class="camera-video"
                autoplay
                playsinline
            ></video>
            <!-- 姿势检测画布 -->
            <canvas
                ref="canvasElement"
                class="pose-canvas"
            ></canvas>
        </div>
    </div>
    <!-- 倒计时显示 -->
    <div class="countdown" v-if="calibrationState == 'countdown'">
        <div class="countdown-text">
            {{ countdownText }}
        </div>
    </div>
        <div class="calibration-guide" v-if="calibrationState == 'countdown' || calibrationState == 'calibrating'">
            <img :alt="calibrationGuideImage" :src="'/src/assets/images/cal_'+calibrationGuideImage+'.png'" class="calibration-guide-image">
        </div>
    <!-- 添加校准阶段提示 -->
    <div class="calibration" v-if="calibrationState == 'calibrating'">
        <div class="calibration-text">
            {{ calibrationText }}
        </div>
        <div class="calibration-progress">
            <div 
                class="progress-bar" 
                :style="{ width: `${(calibrationProgress) * 100}%` }"
            ></div>
        </div>
    </div>
</template>
<script setup>
import { ref, onMounted, onUnmounted, h } from 'vue'
import { t } from '../Language/language.js'
import { GAME_CONFIG } from '../utils/constants'
const Pose = window.Pose || null
const Hands = window.Hands || null

const emit = defineEmits(['on-input'])
const videoElement = ref(null)
const canvasElement = ref(null)
const isPoseDetected = ref(false)
let pose = null
let hands = null
let videoStream = null
const props = defineProps({
    showCamera: {
        type: Boolean,
        default: false
    }
})
const calibrationState = ref("") //countdown,calibrating,normal
// const calibratedHeight = ref(null)
const input = ref({shoulderY: 0, playerX:0, shoulderWidth: 0, handLX: 0, handLY:0, handRX: 0, handRY:0, graspL: false, graspR: false})
const inputDict = ref({
    handsLX: {ampFactor: 999,minPos: 0,maxPos: GAME_CONFIG.SCREEN_WIDTH - 80,smoothFactor: 0.3,inputAxis: GAME_CONFIG.SCREEN_WIDTH / 2,screenAxis: GAME_CONFIG.SCREEN_WIDTH / 2},
    handsRX: {ampFactor: 999,minPos: 0,maxPos: GAME_CONFIG.SCREEN_WIDTH - 80,smoothFactor: 0.3,inputAxis: GAME_CONFIG.SCREEN_WIDTH / 2,screenAxis: GAME_CONFIG.SCREEN_WIDTH / 2},
    handsY: {ampFactor: 999,minPos: 0,maxPos: GAME_CONFIG.SCREEN_HEIGHT - 80,smoothFactor: 0.3,inputAxis: -1,screenAxis: GAME_CONFIG.SCREEN_HEIGHT - 200},
})
// 添加倒计时状态
const countdownText = ref('')
// 添加校准相关常量
const CALIBRATION_DURATION = 3000 // 3秒校准时间
const CALIBRATION_SAMPLES = 30 // 采样次数
const CALIBRATION_INTERVAL = CALIBRATION_DURATION / CALIBRATION_SAMPLES
// 添加校准相关状态
const calibrationGuideImage = ref("Left")
const calibrationText = ref('')
const calibrationProgress = ref(0)
const calibrationSamples = ref([[],[],[]])

// 初始化摄像头
const initCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                frameRate: 30
            }
        })
        if (videoElement.value) {
            videoElement.value.srcObject = stream
            videoStream = stream
            await initPoseDetection()
        }
    } catch (error) {
        console.error('Error accessing camera:', error)
    }
}
// 初始化姿势检测
const initPoseDetection = async () => {
    if (!Pose) {
        console.error('MediaPipe Pose not loaded')
        return
    }
    
    try {
        pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
            }
        })
        
        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })
        
        pose.onResults(onResults)
    } catch (error) {
        console.error('Error initializing Pose:', error)
    }

    try {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            }
        })
        
        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })
        
        hands.onResults((results) => {
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 1) {
                updateHandsInput(results.multiHandLandmarks)
            }
        })
    } catch (error) {
        console.error('Error initialising Hands:', error)
    }
    
    startDetection()
}

const updateHandsInput = (landmarks) => {
    const isGrasping = (hand) => {
        // 改进的抓握姿势检测算法：基于拇指和食指的距离
        const thumb = hand[4]  // 拇指尖
        const indexFinger = hand[8]  // 食指尖
        const middleFinger = hand[12] // 中指尖
        
        // 计算拇指和食指之间的距离（主要判断依据）
        const thumbIndexDistance = Math.sqrt(
            Math.pow((thumb.x - indexFinger.x) * GAME_CONFIG.SCREEN_WIDTH, 2) +
            Math.pow((thumb.y - indexFinger.y) * GAME_CONFIG.SCREEN_HEIGHT, 2)
        )
        
        // 计算拇指和中指之间的距离（辅助判断）
        const thumbMiddleDistance = Math.sqrt(
            Math.pow((thumb.x - middleFinger.x) * GAME_CONFIG.SCREEN_WIDTH, 2) +
            Math.pow((thumb.y - middleFinger.y) * GAME_CONFIG.SCREEN_HEIGHT, 2)
        )
        
        // 计算拇指和食指中点与中指的距离，判断是否形成三指抓握
        const thumbIndexMidX = (thumb.x + indexFinger.x) / 2
        const thumbIndexMidY = (thumb.y + indexFinger.y) / 2
        const midToMiddleDistance = Math.sqrt(
            Math.pow((thumbIndexMidX - middleFinger.x) * GAME_CONFIG.SCREEN_WIDTH, 2) +
            Math.pow((thumbIndexMidY - middleFinger.y) * GAME_CONFIG.SCREEN_HEIGHT, 2)
        )
        
        // 抓握判断条件：
        // 1. 拇指与食指距离很近（主要条件）
        // 2. 拇指与中指距离适中（辅助条件）
        // 3. 三指形成一个相对紧密的抓握姿势
        const isThumbIndexClose = thumbIndexDistance < 60 // 拇指食指靠近
        const isThumbMiddleClose = thumbMiddleDistance < 90 // 拇指中指不太远
        const isTriangleGrasp = midToMiddleDistance < 80 // 三指形成三角抓握
        
        return isThumbIndexClose && (isThumbMiddleClose || isTriangleGrasp)
    }
    const handL = Math.pow((1 - landmarks[0][0].x) * GAME_CONFIG.SCREEN_WIDTH - input.value.handLX, 2) + Math.pow(landmarks[0][0].y * GAME_CONFIG.SCREEN_HEIGHT - input.value.handLY, 2) < 
        Math.pow((1 - landmarks[1][0].x) * GAME_CONFIG.SCREEN_WIDTH - input.value.handLX, 2) + Math.pow(landmarks[1][0].y * GAME_CONFIG.SCREEN_HEIGHT - input.value.handLY, 2) ? landmarks[0] : landmarks[1]
    const handR = Math.pow((1 - landmarks[0][0].x) * GAME_CONFIG.SCREEN_WIDTH - input.value.handLX, 2) + Math.pow(landmarks[0][0].y * GAME_CONFIG.SCREEN_HEIGHT - input.value.handLY, 2) < 
        Math.pow((1 - landmarks[1][0].x) * GAME_CONFIG.SCREEN_WIDTH - input.value.handLX, 2) + Math.pow(landmarks[1][0].y * GAME_CONFIG.SCREEN_HEIGHT - input.value.handLY, 2) ? landmarks[1] : landmarks[0]
    input.value.graspL = isGrasping(handL)
    input.value.graspR = isGrasping(handR)
}
 
// 开始检测循环
const startDetection = async () => {
    if (!videoElement.value || !pose || !hands) return
    try {
        await pose.send({ image: videoElement.value })
        await hands.send({ image: videoElement.value })
    } catch (error) {
        console.error('Error in pose detection:', error)
    }
    requestAnimationFrame(startDetection)
}
// 处理检测结果
const onResults = (results) => {
    if (!canvasElement.value) return
    const canvas = canvasElement.value
    const ctx = canvas.getContext('2d')
    canvas.width = videoElement.value.videoWidth
    canvas.height = videoElement.value.videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    isPoseDetected.value = results.poseLandmarks ? true : false
    
    if (results.poseLandmarks) {
        // 计算并发送肩部位置
        updateBodyInput(results.poseLandmarks)
        emit('on-input', input.value)    // 发送实际的屏幕坐标
        if (calibrationState.value == "countdown"){drawOutline(ctx)}
        // 绘制骨架
        drawConnectors(ctx, results.poseLandmarks)
        drawLandmarks(ctx, results.poseLandmarks)
    }
}
// 更新角色位置（由姿势检测触发）
const getPosition = (cameraPos, currentPos, inputInfo) => {
    const newPos = (cameraPos - inputInfo.inputAxis) * inputInfo.ampFactor + inputInfo.screenAxis
    const targetPos = Math.max(inputInfo.minPos, Math.min(inputInfo.maxPos, newPos))
    return currentPos + (targetPos - currentPos) * inputInfo.smoothFactor
}
const updateBodyInput = (landmarks) => {
    const leftShoulder = landmarks[11]
    const rightShoulder = landmarks[12]
    const leftHand = landmarks[19]
    const rightHand = landmarks[20]
    if (!(leftShoulder && rightShoulder && leftHand && rightHand)) {return}

    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2 * GAME_CONFIG.SCREEN_HEIGHT
    const shoulderX = (leftShoulder.x + rightShoulder.x) / 2 * GAME_CONFIG.SCREEN_WIDTH
    const shoulderWidth = (leftShoulder.x - rightShoulder.x) * GAME_CONFIG.SCREEN_WIDTH
    const handLX = leftHand.x * GAME_CONFIG.SCREEN_WIDTH
    const handRX = rightHand.x * GAME_CONFIG.SCREEN_WIDTH
    const handLY = leftHand.y * GAME_CONFIG.SCREEN_HEIGHT
    const handRY = rightHand.y * GAME_CONFIG.SCREEN_HEIGHT
    if (calibrationState.value == "countdown" || calibrationState.value == "calibrating"){
        input.value.shoulderY = shoulderY
        input.value.playerX = shoulderX
        input.value.shoulderWidth = shoulderWidth
        input.value.handLX = handLX
        input.value.handRX = handRX
        input.value.handLY = handLY
        input.value.handRY = handRY
    } else {
        input.value.handLX = getPosition(handLX, input.value.handLX, inputDict.value.handsLX)
        input.value.handRX = getPosition(handRX, input.value.handRX, inputDict.value.handsRX)
        input.value.handLY = getPosition(handLY, input.value.handLY, inputDict.value.handsY)
        input.value.handRY = getPosition(handRY, input.value.handRY, inputDict.value.handsY)
    }
}
// 绘制关键点
const drawLandmarks = (ctx, landmarks) => {
    landmarks.forEach(landmark => {
        const x = landmark.x * ctx.canvas.width
        const y = landmark.y * ctx.canvas.height
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fillStyle = '#00FF00'
        ctx.fill()
    })
}
// 绘制连接线
const drawConnectors = (ctx, landmarks) => {
    // 定义需要连接的关键点对
    const connections = [
        [11, 12], // 肩膀
        [11, 13], // 左上臂
        [13, 15], // 左前臂
        [12, 14], // 右上臂
        [14, 16], // 右前臂
        [11, 23], // 左躯干
        [12, 24], // 右躯干
        [23, 24], // 臀部
        [23, 25], // 左大腿
        [25, 27], // 左小腿
        [24, 26], // 右大腿
        [26, 28]    // 右小腿
    ]
    ctx.strokeStyle = '#00FF00'
    ctx.lineWidth = 2
    connections.forEach(([i, j]) => {
        const start = landmarks[i]
        const end = landmarks[j]
        ctx.beginPath()
        ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height)
        ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height)
        ctx.stroke()
    })
}
const drawOutline = (ctx) => {
    // 定义需要连接的关键点对
    const connections = [
        [960 - GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 400, 960 + GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 400],
        [960 - GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 400, 960 - GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 1026],
        [960 - GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 1026, 960 + GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 1026],
        [960 + GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 400, 960 + GAME_CONFIG.CALIBRATION_MAX_WIDTH / 2, 1026]
    ]
    ctx.strokeStyle = '#FF0000'
    ctx.lineWidth = 4
    connections.forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath()
        ctx.moveTo(x1 / GAME_CONFIG.SCREEN_WIDTH * ctx.canvas.width, y1 / GAME_CONFIG.SCREEN_HEIGHT * ctx.canvas.height)
        ctx.lineTo(x2 / GAME_CONFIG.SCREEN_WIDTH * ctx.canvas.width, y2 / GAME_CONFIG.SCREEN_HEIGHT * ctx.canvas.height)
        ctx.stroke()
    })
}
// 组件挂载时初始化
onMounted(() => {
    initCamera()
})
// 组件卸载时清理
onUnmounted(() => {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop())
    }
})
// 添加校准阶段函数
const startCalibration = async () => {
    // 显示倒计时
    calibrationGuideImage.value = "Left"
    calibrationState.value = "countdown"
    countdownText.value = 'Ready!'
    // Ready阶段
    await new Promise(resolve => setTimeout(resolve, 2000))
    // 倒计时阶段
    while (GAME_CONFIG.CALIBRATION_MIN_X > input.value.playerX ||
        GAME_CONFIG.CALIBRATION_MAX_X < input.value.playerX ||
        GAME_CONFIG.CALIBRATION_MIN_WIDTH > input.value.shoulderWidth ||
        GAME_CONFIG.CALIBRATION_MAX_WIDTH < input.value.shoulderWidth){
        if (GAME_CONFIG.CALIBRATION_MIN_WIDTH > input.value.shoulderWidth){
            countdownText.value = t('forward')
            calibrationGuideImage.value = "Forward"
            await new Promise(resolve => setTimeout(resolve, 100))
        }else if (GAME_CONFIG.CALIBRATION_MAX_WIDTH < input.value.shoulderWidth){
            countdownText.value = t('backward')
            calibrationGuideImage.value = "Backward"
            await new Promise(resolve => setTimeout(resolve, 100))
        }else if (GAME_CONFIG.CALIBRATION_MIN_X > input.value.playerX){
            countdownText.value = t('left')
            calibrationGuideImage.value = "Left"
            await new Promise(resolve => setTimeout(resolve, 100))
        }else if (GAME_CONFIG.CALIBRATION_MAX_X < input.value.playerX){
            countdownText.value = t('right')
            calibrationGuideImage.value = "Right"
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    }
    for(let i = 3; i > 0; i--) {
        countdownText.value = i.toString()
        await new Promise(resolve => setTimeout(resolve, 1000))
        while (GAME_CONFIG.CALIBRATION_MIN_X > input.value.playerX ||
            GAME_CONFIG.CALIBRATION_MAX_X < input.value.playerX ||
            GAME_CONFIG.CALIBRATION_MIN_WIDTH > input.value.shoulderWidth ||
            GAME_CONFIG.CALIBRATION_MAX_WIDTH < input.value.shoulderWidth){
            if (GAME_CONFIG.CALIBRATION_MIN_WIDTH > input.value.shoulderWidth){
                countdownText.value = t('forward')
                calibrationGuideImage.value = "Forward"
                await new Promise(resolve => setTimeout(resolve, 100))
            }else if (GAME_CONFIG.CALIBRATION_MAX_WIDTH < input.value.shoulderWidth){
                countdownText.value = t('backward')
                calibrationGuideImage.value = "Backward"
                await new Promise(resolve => setTimeout(resolve, 100))
            }else if (GAME_CONFIG.CALIBRATION_MIN_X > input.value.playerX){
                countdownText.value = t('left')
                calibrationGuideImage.value = "Left"
                await new Promise(resolve => setTimeout(resolve, 100))
            }else if (GAME_CONFIG.CALIBRATION_MAX_X < input.value.playerX){
                countdownText.value = t('right')
                calibrationGuideImage.value = "Right"
                await new Promise(resolve => setTimeout(resolve, 100))
            }
            i = 4;
        }
    }
    calibrationState.value = "calibrating"
    calibrationText.value = t('calibrate1')
    calibrationGuideImage.value = "Raise"
    calibrationProgress.value = 0
    calibrationSamples.value = [[],[],[]]
    while (input.value.handLY > input.value.shoulderY || input.value.handRY > input.value.shoulderY){
        await new Promise(resolve => setTimeout(resolve, 200))
    }
    await new Promise(resolve => setTimeout(resolve, 1200))
    calibrationText.value = t('calibrate2')
    calibrationGuideImage.value = "Lower"
    // 等待校准完成
    const maxHandsY = Math.max(input.value.shoulderY-input.value.handLY,input.value.shoulderY-input.value.handRY)
    await new Promise(resolve => {
        const calibrationInterval = setInterval(() => {
            if (input.value.handLY > input.value.shoulderY && input.value.handRY > input.value.shoulderY) {
                //Finish calibration
                clearInterval(calibrationInterval)
                const sum1 = calibrationSamples.value[0].reduce((a, b) => a + b, 0)
                const average1 = sum1 / calibrationSamples.value[0].length
                const sum2 = calibrationSamples.value[1].reduce((a, b) => a + b, 0)
                const average2 = sum2 / calibrationSamples.value[1].length
                const sum3 = calibrationSamples.value[2].reduce((a, b) => a + b, 0)
                const average3 = sum3 / calibrationSamples.value[2].length
                inputDict.value.handsY.inputAxis = average1
                inputDict.value.handsLX.inputAxis = average2 + average3/2
                inputDict.value.handsRX.inputAxis = average2 - average3/2
                inputDict.value.handsY.ampFactor = inputDict.value.handsY.ampFactor * 0.74
                inputDict.value.handsLX.ampFactor = -inputDict.value.handsY.ampFactor
                inputDict.value.handsRX.ampFactor = -inputDict.value.handsY.ampFactor
                console.log('Calibrated factor:', inputDict.value.handsY.ampFactor)
                calibrationState.value = "normal"
                resolve()
            } else {
                calibrationSamples.value[0].push(input.value.shoulderY)
                calibrationSamples.value[1].push(input.value.playerX)
                calibrationSamples.value[2].push(input.value.shoulderWidth)
                const handsWidth =  input.value.handLX - input.value.handRX
                const handsHeight = Math.max(input.value.shoulderY - (input.value.handLY + input.value.handRY) / 2, 0.1)
                const ampFactor = handsWidth/handsHeight > 1920/830 ? 830/handsHeight : 1920/handsWidth
                inputDict.value.handsY.ampFactor = Math.min(inputDict.value.handsY.ampFactor, ampFactor)
                calibrationProgress.value = Math.max(calibrationProgress.value, 
                    Math.min(1 - handsHeight / maxHandsY,1 - handsHeight / maxHandsY))
            }
        }, CALIBRATION_INTERVAL)
    })
}
defineExpose({startCalibration})
</script>
<style scoped>
.camera-container {
    z-index: 1100; /* 高于其他所有层 */
    position: fixed;
    left: 20px;
    bottom: 20px;
    width: 20vw;
    height: 30vh;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid white;
    border-radius: 8px;
    overflow: hidden;
}
.camera-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
}
.camera-video {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
}
.pose-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform: scaleX(-1);
}

.status-overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;
    z-index: 1;
}
.camera-title {
    color: white;
    text-align: center;
    margin: 0;
    background: rgba(0, 0, 0, 0.5);
    padding: 5px;
    border-radius: 4px;
}
.status-text {
    text-align: center;
    padding: 5px;
    color: red;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
}
.status-text.detected {
    color: #00FF00;
}
.countdown {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.7);
    z-index: 50;
}
.countdown-text {
    position:fixed;
    top: 27vw;
    font-size: 72px;
    color: white;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
    animation: pulse 1s infinite;
}
.calibration-guide {
    position : relative;
    top: 7vw;
    width: 60vw;
    height: 16vw;
    margin: auto;
    z-index: 1100;
}
.calibration-guide-image {
    width : 100%;
    height: 100%;
}
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}
.calibration {
    z-index: 1100; /* 高于其他所有层 */
    position: fixed;
    top: 65%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(161, 233, 255, 0.95);
    padding: 20px;
    border-radius: 10px;
    text-align: center;
}
.calibration-text {
    color: rgb(0, 0, 0);
    font-size: 48px;
    margin-bottom: 20px;
    text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.7); /* ✅ 添加阴影增强可读性 */
    font-weight: bold; /* 可选，增加清晰度 */
}
.calibration-progress {
    width: 100%;;
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    overflow: hidden;
}
.progress-bar {
    height: 100%;
    background: #4CAF50;
    transition: width 0.1s linear;
}
</style>
