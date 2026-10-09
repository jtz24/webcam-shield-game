<template>
<div class="menu-screen">
    <!-- 添加背景图片 -->
    <div class="menu-background" @click="dropdownOpen = ''"></div>
    <!-- 标题 -->
    <h1 class="game-title">{{ t('title') }}</h1>

    <!-- 难度选择 -->
    <div style="display:flex; flex-direction:row;">
        <div class="dropdown">
            <div class="dropdown-header" @click="dropdownOpen = dropdownOpen == 'difficulty' ? '' : 'difficulty'">
                {{ selectedDifficulty ? t(selectedDifficulty) : t('selectDifficulty') }}
            </div>
            <div class="dropdown-options" v-if="dropdownOpen == 'difficulty'">
                <div 
                    v-for="difficulty in difficulties" 
                    :key="difficulty"
                    class="dropdown-option"
                    @click.stop="selectDifficulty(difficulty)"
                >
                    {{ t(difficulty) }}
                </div>
            </div>
        </div>
        <div class="dropdown">
            <div class="dropdown-header" @click="dropdownOpen = dropdownOpen == 'mode' ? '' : 'mode'">
                {{ selectedMode ? t(selectedMode) : t('selectMode') }}
            </div>
            <div class="dropdown-options" v-if="dropdownOpen == 'mode'">
                <div 
                    v-for="mode in modes" 
                    :key="mode"
                    class="dropdown-option"
                    @click.stop="selectMode(mode)"
                >
                    {{ t(mode) }}
                </div>
            </div>
        </div>
    </div>
    <!-- 开始按钮 -->
    <div style="display:flex; flex-direction:row;">
        <button 
            class="start-button"
            :disabled="!canStartGame"
            @click="startGame"
        >
        {{ t('start') }}
        </button>
        <!-- 退出按钮 -->
        <button 
            class="Mainpage-button"
            @click="backToMain"
        >
        {{ t('back') }}
        </button>
    </div>
</div>
</template>
<script setup>
import { t } from '../Language/language.js'
import { ref, computed } from 'vue'
const emit = defineEmits(['start-game'])
const selectedDifficulty = ref('')
const selectedMode = ref('')
const dropdownOpen = ref('')
const difficulties = ['easy']//, 'medium', 'hard']
const modes = ['lefthand', 'righthand']
// 检查是否可以开始游戏
const canStartGame = computed(() => {return (!!selectedDifficulty.value) && (!!selectedMode.value)})
// 选择难度
const selectDifficulty = (difficulty) => {
    selectedDifficulty.value = difficulty
    dropdownOpen.value = ''
}
const selectMode = (mode) => {
    selectedMode.value = mode
    dropdownOpen.value = ''
}
// 开始游戏
const startGame = () => {
    if (canStartGame.value) {
        emit('start-game', {
            difficulty: selectedDifficulty.value,
            mode: selectedMode.value
        })
    }
}
// 退出游戏
const backToMain = () => {
    const referrer = document.referrer;

    // 如果有来源页面，就回去
    if (referrer) {
        window.location.href = referrer;
    } else {
        // 否则根据当前部署自动跳主页
        const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        const currentPath = location.pathname.split('/')[1];
        const mainPage = isLocal
            ? '/GameIndex/index.html'
            : `https://${location.hostname}/${currentPath}/`;

        window.location.href = mainPage;
    }
};

</script>
<style scoped>
.menu-screen {
    font-family: 'Arial', sans-serif;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: none;
    z-index: 10;
}
.menu-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-image: url('../assets/images/background_1.jpg');
    background-size: cover;
    background-position: center;
    z-index: -1;
    opacity: 1;
}
.game-title {
    color: #FFFF00;
    font-size: 70px;
    margin-bottom: 20px;
    text-shadow: 4px 4px 8px rgba(0, 0, 0, 0.5);
}
.dropdown {
    width: 350px;
    margin: 20px;
    position: relative;
}
.dropdown-header {
    padding: 30px;
    font-size: 36px;
    font-weight: bold;
    background: #0066cc;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
}
.dropdown-options {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 8px;
    margin-top: 0px;
    overflow: hidden;
}
.dropdown-option {
    padding: 30px;
    font-size: 36px;
    font-weight: bold;
    color: white;
    cursor: pointer;
    transition: background 0.3s ease;
}
.dropdown-option:hover {
    background: #0066cc;
}
.start-button, .Mainpage-button {
    width: 350px;
    padding: 30px;
    margin: 20px;
    border: none;
    border-radius: 8px;
    font-size: 36px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
}
.start-button {
    background: #45f045;
    color: rgb(255, 255, 255);
}
.start-button:disabled {
    background: #666666;
    cursor: not-allowed;
}
.Mainpage-button {
    background: #cc0000;
    color: white;
    margin-top: 20px;
}
.Mainpage-button:hover {
    background: #ff0000;
    transform: scale(1.05);
}
</style>
