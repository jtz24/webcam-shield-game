// 资源路径
export const ASSETS = {
    IMAGES: {
        BLACK: new URL('../assets/images/black.png', import.meta.url).href,
        GREEN: new URL('../assets/images/green.png', import.meta.url).href,
        RED: new URL('../assets/images/red.png', import.meta.url).href,
        YELLOW: new URL('../assets/images/yellow.png', import.meta.url).href,
        PLAYER: new URL('../assets/images/player.png', import.meta.url).href,
        CURSOR: new URL('../assets/images/cursor.png', import.meta.url).href,
        BACKGROUND: new URL('../assets/images/bg.png', import.meta.url).href,
        BLANK: new URL('../assets/images/blank.png', import.meta.url).href,
        SHIELD: new URL('../assets/images/shield.png', import.meta.url).href,
    },
    SOUNDS: {
        BACKGROUND_MUSIC: new URL('../assets/sounds/backgroundmusic.mp3', import.meta.url).href,
        BAD: new URL('../assets/sounds/collision.wav', import.meta.url).href,
        GOOD: new URL('../assets/sounds/coin.mp3', import.meta.url).href,
        SILENCE: new URL('../assets/sounds/silence.mp3', import.meta.url).href
    }
}

// 游戏配置 (从 initialization.py 转换)
export const GAME_CONFIG = {
    SCREEN_WIDTH: 1920,
    SCREEN_HEIGHT: 1080,
    GAME_DURATION: 120,
    INITIAL_LIFE: 3,
    MAX_SCORE: 360,
    CALIBRATION_MIN_X: 800,
    CALIBRATION_MAX_X: 1120,
    CALIBRATION_MIN_WIDTH: 200,
    CALIBRATION_MAX_WIDTH: 450,
}

// 难度设置
export const DIFFICULTY_SETTINGS = {
    EASY: {
        GAME_DURATION: 120,
        MAX_HP: 10,
        SPAWN_TIME: 2000,
    },
    MEDIUM: {
        GAME_DURATION: 999,
        NO_OF_ITEMS: 12,
        NO_OF_JUNK: 5,
        HOLD_TIME: 1500
    },
    HARD: {
        GAME_DURATION: 999,
        NO_OF_ITEMS: 18,
        NO_OF_JUNK: 8,
        HOLD_TIME: 2000
    }
}