const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
let gameState = {
    score: 0,
    lives: 10,
    gameOver: false,
    gameCleared: false,
    gameStarted: false,
    keys: {},
    lastTime: 0,
    shootTimer: 0,
    backgroundY: 0,
    // モバイル操作用
    touchMove: { x: 0, y: 0 },
    touchShoot: false,
    isMobile: false
};

// プレイヤー
const player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 80,
    width: 30,
    height: 30,
    speed: 5,
    color: '#00ff00'
};

// 弾丸配列
const bullets = [];
const enemyBullets = [];

// 敵配列
const enemies = [];

// 障害物配列
const obstacles = [];

// ボス
let boss = null;

// ボス画像
const bossImages = {
    boss1: new Image(),
    boss2: new Image(),
    boss3: new Image()
};
bossImages.boss1.src = 'images/boss1.png';
bossImages.boss2.src = 'images/boss2.png';
bossImages.boss3.src = 'images/boss3.png';

// ボス出現回数
let bossCount = 0;

// 敵の色リスト（ボスを倒すごとに変更）
const enemyColors = ['#ff0000', '#ff6600', '#ff00ff', '#00ffff'];
function getEnemyColor() {
    return enemyColors[Math.min(bossCount, enemyColors.length - 1)];
}

// ダメージ表示配列
const damageTexts = [];

// ダメージテキストクラス
class DamageText {
    constructor(x, y, damage) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.alpha = 1;
        this.lifeTime = 60; // 1秒間表示
    }
    
    update() {
        this.y -= 2; // 上に移動
        this.alpha -= 0.016; // フェードアウト
        this.lifeTime--;
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('-' + this.damage, this.x, this.y);
        ctx.restore();
    }
}

// 弾丸クラス
class Bullet {
    constructor(x, y, speed, color = '#ffff00') {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 10;
        this.speed = speed;
        this.color = color;
    }
    
    update() {
        this.y += this.speed;
    }
    
    draw() {
        // 弾丸を絵文字で描画
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        if (this.speed < 0) {
            // プレイヤーの弾丸（上向き）
            ctx.fillText('💫', this.x + this.width/2, this.y + this.height);
        } else {
            // 敵の弾丸（下向き）
            ctx.fillText('💥', this.x + this.width/2, this.y + this.height);
        }
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type;
        this.shootTimer = 0;
        this.moveTimer = 0;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        
        // タイプ別の設定
        this.setTypeProperties();
    }
    
    setTypeProperties() {
        switch(this.type) {
            case 'normal':
                this.speed = 2;
                this.health = 1;
                this.shootRate = 0.02;
                this.emoji = '👾';
                this.points = 10;
                break;
            case 'fast':
                this.speed = 4;
                this.health = 1;
                this.shootRate = 0.03;
                this.emoji = '🛸';
                this.points = 15;
                break;
            case 'tank':
                this.speed = 1;
                this.health = 3;
                this.shootRate = 0.01;
                this.emoji = '🤖';
                this.points = 25;
                break;
            case 'zigzag':
                this.speed = 2;
                this.health = 2;
                this.shootRate = 0.015;
                this.emoji = '🐙';
                this.points = 20;
                break;
            case 'bomber':
                this.speed = 1.5;
                this.health = 2;
                this.shootRate = 0.04;
                this.emoji = '💀';
                this.points = 30;
                break;
        }
    }
    
    update() {
        // タイプ別の移動パターン
        if (this.type === 'zigzag') {
            this.moveTimer++;
            if (this.moveTimer > 30) {
                this.direction *= -1;
                this.moveTimer = 0;
            }
            this.x += this.direction * 1;
            // 画面端での反転
            if (this.x <= 0 || this.x >= canvas.width - this.width) {
                this.direction *= -1;
            }
        }
        
        this.y += this.speed;
        this.shootTimer++;
        
        // 敵の弾丸発射（タイプ別の発射率）
        if (this.shootTimer > 60 && Math.random() < this.shootRate) {
            if (this.type === 'bomber') {
                // 爆撃機は3発同時発射
                for (let i = -1; i <= 1; i++) {
                    enemyBullets.push(new Bullet(this.x + this.width/2 + i * 10, this.y + this.height, 3, '#ff4444'));
                }
            } else {
                enemyBullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 3, '#ff4444'));
            }
            this.shootTimer = 0;
        }
    }
    
    draw() {
        // 敵をタイプ別絵文字で描画
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.emoji, this.x + this.width/2, this.y + this.height - 5);
        
        // タンクタイプの場合、体力バーを表示
        if (this.type === 'tank' && this.health < 3) {
            const barWidth = 20;
            const barHeight = 3;
            const barX = this.x + (this.width - barWidth) / 2;
            const barY = this.y - 8;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, (this.health / 3) * barWidth, barHeight);
        }
    }
}

// 障害物クラス
class Obstacle {
    constructor(x, y, type = 'destructible') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        this.type = type;
        this.speed = 1;
        
        if (type === 'destructible') {
            this.health = 3;
            this.maxHealth = 3;
            this.emoji = '📦';
            this.points = 5;
        } else {
            this.health = Infinity;
            this.maxHealth = Infinity;
            this.emoji = '🗿';
            this.points = 0;
        }
    }
    
    update() {
        this.y += this.speed;
    }
    
    draw() {
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.emoji, this.x + this.width/2, this.y + this.height - 5);
        
        // 破壊可能な障害物の体力バー表示
        if (this.type === 'destructible' && this.health < this.maxHealth) {
            const barWidth = 30;
            const barHeight = 4;
            const barX = this.x + (this.width - barWidth) / 2;
            const barY = this.y - 8;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barWidth, barHeight);
        }
    }
    
    takeDamage(damage = 1) {
        if (this.type === 'destructible') {
            this.health -= damage;
            return this.health <= 0;
        }
        return false; // 破壊不可能
    }
}

// ボスクラス
class Boss {
    constructor(type = 'boss1') {
        this.type = type;
        this.x = canvas.width / 2 - 80;
        this.y = -160;
        this.width = 160;
        this.height = 160;
        this.speed = 1;
        this.shootTimer = 0;
        this.moveTimer = 0;
        this.direction = 1;
        this.attackPattern = 0;
        this.patternTimer = 0;
        this.isActive = false;
        this.damageFlash = 0;
        this.isDying = false;
        this.deathTimer = 0;
        this.deathDuration = 90; // 1.5秒間の死亡アニメーション
        this.alpha = 1.0;
        
        // ボスタイプ別の設定
        this.setTypeProperties();
    }
    
    setTypeProperties() {
        switch(this.type) {
            case 'boss1':
                this.health = 30;
                this.maxHealth = 30;
                this.name = 'カタツムリ';
                this.color = '#ccaa44';
                break;
            case 'boss2':
                this.health = 40;
                this.maxHealth = 40;
                this.name = 'カッパ';
                this.color = '#44ff44';
                this.speed = 1.5;
                break;
            case 'boss3':
                this.health = 50;
                this.maxHealth = 50;
                this.name = 'ダンシングベア';
                this.color = '#8b4513';
                this.speed = 0.8;
                break;
        }
    }
    
    update() {
        // 死亡アニメーション中
        if (this.isDying) {
            this.deathTimer++;
            this.alpha = Math.max(0, 1 - (this.deathTimer / this.deathDuration));
            
            // 少し震える効果
            this.x += (Math.random() - 0.5) * 4;
            this.y += (Math.random() - 0.5) * 2;
            
            return;
        }
        
        // 登場時の移動
        if (!this.isActive) {
            this.y += this.speed;
            if (this.y >= 50) {
                this.isActive = true;
            }
            return;
        }
        
        // 左右移動
        this.moveTimer++;
        if (this.moveTimer > 120) {
            this.direction *= -1;
            this.moveTimer = 0;
        }
        this.x += this.direction * 0.5;
        
        // 画面端での反転
        if (this.x <= 0 || this.x >= canvas.width - this.width) {
            this.direction *= -1;
        }
        
        // 攻撃パターン
        this.patternTimer++;
        this.shootTimer++;
        
        if (this.patternTimer > 180) {
            this.attackPattern = (this.attackPattern + 1) % 3;
            this.patternTimer = 0;
        }
        
        // ボスタイプ別の攻撃パターン（死亡アニメーション中は攻撃しない）
        if (!this.isDying) {
            this.performAttack();
        }
        
        // ダメージフラッシュのタイマー更新
        if (this.damageFlash > 0) {
            this.damageFlash--;
        }
    }
    
    performAttack() {
        if (this.type === 'boss1') {
            // カタツムリ: ゆっくり直線弾、螺旋弾
            if (this.attackPattern === 0 && this.shootTimer > 30) {
                enemyBullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 2, '#ccaa44'));
                this.shootTimer = 0;
            } else if (this.attackPattern === 1 && this.shootTimer > 25) {
                const angle = Date.now() * 0.01;
                const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 2, '#ccaa44');
                bullet.speedX = Math.cos(angle) * 1.5;
                bullet.speedY = Math.sin(angle) * 1.5 + 2;
                bullet.update = function() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                };
                enemyBullets.push(bullet);
                this.shootTimer = 0;
            } else if (this.attackPattern === 2 && this.shootTimer > 40) {
                for (let i = 0; i < 5; i++) {
                    const angle = (i * Math.PI * 2) / 5;
                    const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 1.5, '#ccaa44');
                    bullet.speedX = Math.cos(angle) * 1;
                    bullet.speedY = Math.sin(angle) * 1 + 1;
                    bullet.update = function() {
                        this.x += this.speedX;
                        this.y += this.speedY;
                    };
                    enemyBullets.push(bullet);
                }
                this.shootTimer = 0;
            }
        } else if (this.type === 'boss2') {
            // カッパ: 水弾、波状弾
            if (this.attackPattern === 0 && this.shootTimer > 20) {
                enemyBullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 4, '#44ff44'));
                this.shootTimer = 0;
            } else if (this.attackPattern === 1 && this.shootTimer > 25) {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.sin(Date.now() * 0.01 + i) * 0.5;
                    const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 3, '#44ff44');
                    bullet.speedX = Math.sin(angle) * 2;
                    bullet.speedY = Math.cos(angle) * 3;
                    bullet.update = function() {
                        this.x += this.speedX;
                        this.y += this.speedY;
                    };
                    enemyBullets.push(bullet);
                }
                this.shootTimer = 0;
            } else if (this.attackPattern === 2 && this.shootTimer > 30) {
                const spiralAngle = Date.now() * 0.02;
                for (let i = 0; i < 6; i++) {
                    const angle = spiralAngle + (i * Math.PI * 2) / 6;
                    const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 2, '#44ff44');
                    bullet.speedX = Math.cos(angle) * 2;
                    bullet.speedY = Math.sin(angle) * 2 + 1;
                    bullet.update = function() {
                        this.x += this.speedX;
                        this.y += this.speedY;
                    };
                    enemyBullets.push(bullet);
                }
                this.shootTimer = 0;
            }
        } else if (this.type === 'boss3') {
            // ダンシングベア: パワフル弾、ランダム弾
            if (this.attackPattern === 0 && this.shootTimer > 15) {
                enemyBullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 5, '#ff8c00'));
                this.shootTimer = 0;
            } else if (this.attackPattern === 1 && this.shootTimer > 20) {
                const angle = (Math.random() - 0.5) * Math.PI / 2;
                const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 4, '#ff8c00');
                bullet.speedX = Math.sin(angle) * 3;
                bullet.speedY = Math.cos(angle) * 4;
                bullet.update = function() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                };
                enemyBullets.push(bullet);
                this.shootTimer = 0;
            } else if (this.attackPattern === 2 && this.shootTimer > 25) {
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI * 2) / 8;
                    const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 3, '#ff8c00');
                    bullet.speedX = Math.cos(angle) * 2;
                    bullet.speedY = Math.sin(angle) * 2;
                    bullet.update = function() {
                        this.x += this.speedX;
                        this.y += this.speedY;
                    };
                    enemyBullets.push(bullet);
                }
                this.shootTimer = 0;
            }
        }
    }
    
    draw() {
        // アルファ値を適用
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        const currentImage = bossImages[this.type];
        
        if (currentImage && currentImage.complete) {
            ctx.drawImage(currentImage, this.x, this.y, this.width, this.height);
        } else {
            // 画像読み込み前の代替表示
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        ctx.restore();
        
        // 体力バー（死亡アニメーション中は非表示）
        if (this.isActive && !this.isDying) {
            const barWidth = 200;
            const barHeight = 10;
            const barX = (canvas.width - barWidth) / 2;
            const barY = 20;
            
            // 背景
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // 体力
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barWidth, barHeight);
            
            // 枠
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            // ボス名
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, canvas.width / 2, 45);
        }
    }
}

// キー入力処理
document.addEventListener('keydown', (e) => {
    // ゲームに関連するキーのみ処理（矢印キー + WASD）
    const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
    if (gameKeys.includes(e.code)) {
        e.preventDefault();
        gameState.keys[e.code] = true;
    }
});

document.addEventListener('keyup', (e) => {
    // ゲームに関連するキーのみ処理（矢印キー + WASD）
    const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
    if (gameKeys.includes(e.code)) {
        e.preventDefault();
        gameState.keys[e.code] = false;
    }
});

// フォーカス管理
canvas.addEventListener('click', () => {
    canvas.focus();
});

// タブキーでフォーカスを受け取れるようにする
canvas.tabIndex = 1;

// キー入力のスタック防止
window.addEventListener('blur', () => {
    gameState.keys = {};
});

// モバイル検出
function detectMobile() {
    // より確実なモバイル検出
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isMobileScreen = window.innerWidth <= 850;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    gameState.isMobile = isMobileUA || isMobileScreen || isTouchDevice;
    
    console.log('Mobile detection:', {
        userAgent: isMobileUA,
        screenSize: isMobileScreen,
        touchDevice: isTouchDevice,
        isMobile: gameState.isMobile
    });
    
    const mobileControls = document.getElementById('mobileControls');
    if (gameState.isMobile && mobileControls) {
        mobileControls.classList.add('show');
        mobileControls.style.display = 'block';
        console.log('Mobile controls enabled');
        
        // キャンバスサイズを調整
        canvas.style.width = Math.min(window.innerWidth, 800) + 'px';
        canvas.style.height = Math.min(window.innerHeight * 0.75, 600) + 'px';
    } else {
        console.log('Mobile controls disabled');
    }
}

// タッチ操作処理
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickRadius = 50;
let joystickTouchId = null;  // ジョイスティックのタッチIDを記録

function setupTouchControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    
    // 要素が存在しない場合は処理を停止
    if (!joystick || !joystickKnob) {
        console.log('Touch control elements not found');
        return;
    }
    
    console.log('Setting up touch controls');
    
    // ジョイスティックの中心座標を取得
    function getJoystickCenter() {
        const rect = joystick.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }
    
    // 特定のタッチIDを持つタッチイベントを取得
    function getTouchById(touches, id) {
        for (let i = 0; i < touches.length; i++) {
            if (touches[i].identifier === id) {
                return touches[i];
            }
        }
        return null;
    }
    
    // ジョイスティック操作
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 既にアクティブな場合は無視
        if (joystickActive) return;
        
        // 新しく追加されたタッチを使用（changedTouchesの最初のタッチ）
        const touch = e.changedTouches[0];
        joystickTouchId = touch.identifier;
        joystickActive = true;
        joystickCenter = getJoystickCenter();
    });
    
    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!joystickActive || joystickTouchId === null) return;
        
        // 特定のタッチIDを持つタッチを取得
        const touch = getTouchById(e.touches, joystickTouchId);
        if (!touch) return;
        
        const deltaX = touch.clientX - joystickCenter.x;
        const deltaY = touch.clientY - joystickCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance <= joystickRadius) {
            joystickKnob.style.transform = `translate(${deltaX - 20}px, ${deltaY - 20}px)`;
            gameState.touchMove.x = deltaX / joystickRadius;
            gameState.touchMove.y = deltaY / joystickRadius;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            const limitedX = Math.cos(angle) * joystickRadius;
            const limitedY = Math.sin(angle) * joystickRadius;
            joystickKnob.style.transform = `translate(${limitedX - 20}px, ${limitedY - 20}px)`;
            gameState.touchMove.x = Math.cos(angle);
            gameState.touchMove.y = Math.sin(angle);
        }
    });
    
    joystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 終了したタッチがジョイスティックのタッチかチェック
        let joystickTouchEnded = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickTouchId) {
                joystickTouchEnded = true;
                break;
            }
        }
        
        if (joystickTouchEnded) {
            joystickActive = false;
            joystickTouchId = null;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            gameState.touchMove.x = 0;
            gameState.touchMove.y = 0;
        }
    });
    
    // タッチイベントの伝播を防ぐ
    document.addEventListener('touchmove', (e) => {
        if (e.target.closest('#mobileControls')) {
            e.preventDefault();
        }
    }, { passive: false });
}

// 初期化時にモバイル検出とタッチ操作を設定
document.addEventListener('DOMContentLoaded', () => {
    detectMobile();
    setupTouchControls();
});

// ページ読み込み完了後にも実行
window.addEventListener('load', () => {
    detectMobile();
    setupTouchControls();
});

// ウィンドウリサイズ時の処理
window.addEventListener('resize', () => {
    detectMobile();
});

// 即座に実行も追加
detectMobile();
setupTouchControls();

// デバッグ用：モバイル操作の強制切り替え
document.getElementById('toggleMobile').addEventListener('click', () => {
    gameState.isMobile = !gameState.isMobile;
    const mobileControls = document.getElementById('mobileControls');
    
    if (gameState.isMobile) {
        mobileControls.classList.add('show');
        mobileControls.style.display = 'block';
        console.log('Mobile controls force enabled');
    } else {
        mobileControls.classList.remove('show');
        mobileControls.style.display = 'none';
        console.log('Mobile controls force disabled');
    }
});

// スタートボタンのクリック処理
document.getElementById('startBtn').addEventListener('click', () => {
    startGame();
});

// 再プレイボタンのクリック処理
document.getElementById('restartBtn').addEventListener('click', () => {
    restartGame();
});

// プレイヤー更新
function updatePlayer() {
    // 移動処理を先に行う
    let moveX = 0;
    let moveY = 0;
    
    // 移動方向を計算（矢印キー + WASD対応）
    if (gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) {
        moveX -= 1;
    }
    if (gameState.keys['ArrowRight'] || gameState.keys['KeyD']) {
        moveX += 1;
    }
    if (gameState.keys['ArrowUp'] || gameState.keys['KeyW']) {
        moveY -= 1;
    }
    if (gameState.keys['ArrowDown'] || gameState.keys['KeyS']) {
        moveY += 1;
    }
    
    // タッチ操作の処理（モバイルの場合は1.5倍速）
    if (gameState.isMobile) {
        moveX += gameState.touchMove.x * 1.5;
        moveY += gameState.touchMove.y * 1.5;
    }
    
    // 斜め移動の場合は速度を調整（√2で割る）
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707; // 約1/√2
        moveY *= 0.707;
    }
    
    // 実際の移動（モバイルの場合はさらに速度調整）
    const speedMultiplier = gameState.isMobile ? 1.2 : 1.0;
    let newX = player.x + moveX * player.speed * speedMultiplier;
    let newY = player.y + moveY * player.speed * speedMultiplier;
    
    // 画面範囲内に制限
    if (newX < 0) newX = 0;
    if (newX > canvas.width - player.width) newX = canvas.width - player.width;
    if (newY < 0) newY = 0;
    if (newY > canvas.height - player.height) newY = canvas.height - player.height;
    
    player.x = newX;
    player.y = newY;
    
    // 弾丸発射処理を最後に行う（常に自動発射）
    if (gameState.shootTimer <= 0) {
        bullets.push(new Bullet(player.x + player.width/2, player.y, -8));
        gameState.shootTimer = 10;
    }
    
    if (gameState.shootTimer > 0) {
        gameState.shootTimer--;
    }
}

// 弾丸更新
function updateBullets() {
    // プレイヤーの弾丸
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
        }
    }
    
    // 敵の弾丸
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].update();
        if (enemyBullets[i].y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

// 敵更新
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        if (enemies[i].y > canvas.height) {
            enemies.splice(i, 1);
        }
    }
}

// 障害物更新
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
        }
    }
}

// 敵生成
function spawnEnemy() {
    // ボス出現条件
    if (boss === null) {
        if (bossCount === 0 && gameState.score >= 100) {
            boss = new Boss('boss1'); // カタツムリ
            return;
        } else if (bossCount === 1 && gameState.score >= 1400) {
            boss = new Boss('boss2'); // カッパ
            return;
        } else if (bossCount === 2 && gameState.score >= 2900) {
            boss = new Boss('boss3'); // ダンシングベア
            return;
        }
    }
    
    // 通常の敵生成（ボス戦中は生成しない）
    if (boss === null && Math.random() < 0.02) {
        const x = Math.random() * (canvas.width - 30);
        
        // スコアに応じて敵の種類を決定
        const enemyTypes = ['normal', 'fast', 'tank', 'zigzag', 'bomber'];
        let availableTypes = ['normal'];
        
        if (gameState.score >= 50) availableTypes.push('fast');
        if (gameState.score >= 150) availableTypes.push('tank');
        if (gameState.score >= 300) availableTypes.push('zigzag');
        if (gameState.score >= 500) availableTypes.push('bomber');
        
        // ランダムで敵タイプを選択（normalが出やすい）
        let enemyType;
        const rand = Math.random();
        if (rand < 0.5) {
            enemyType = 'normal';
        } else {
            enemyType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        }
        
        enemies.push(new Enemy(x, -30, enemyType));
    }
    
    // 障害物生成
    if (boss === null && Math.random() < 0.008) {
        const x = Math.random() * (canvas.width - 40);
        const obstacleType = Math.random() < 0.7 ? 'destructible' : 'indestructible';
        obstacles.push(new Obstacle(x, -30, obstacleType));
    }
}

// ボス更新
function updateBoss() {
    if (boss) {
        boss.update();
        
        // ボスが倒されたかチェック
        if (boss.health <= 0 && !boss.isDying) {
            // 死亡アニメーション開始
            boss.isDying = true;
            boss.deathTimer = 0;
            gameState.score += 1000;
            bossCount++;
        }
        
        // 死亡アニメーション完了後にボスを削除
        if (boss.isDying && boss.deathTimer >= boss.deathDuration) {
            boss = null;
            
            // 3種類のボスを倒したらゲームクリア
            if (bossCount >= 3) {
                gameState.gameCleared = true;
            }
        }
    }
}

// 当たり判定
function checkCollisions() {
    // プレイヤーの弾丸と敵
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i].x < enemies[j].x + enemies[j].width &&
                bullets[i].x + bullets[i].width > enemies[j].x &&
                bullets[i].y < enemies[j].y + enemies[j].height &&
                bullets[i].y + bullets[i].height > enemies[j].y) {
                
                bullets.splice(i, 1);
                enemies[j].health--;
                
                if (enemies[j].health <= 0) {
                    gameState.score += enemies[j].points;
                    enemies.splice(j, 1);
                } else {
                    gameState.score += 1; // ダメージポイント
                }
                break;
            }
        }
    }
    
    // プレイヤーの弾丸と障害物
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = obstacles.length - 1; j >= 0; j--) {
            if (bullets[i].x < obstacles[j].x + obstacles[j].width &&
                bullets[i].x + bullets[i].width > obstacles[j].x &&
                bullets[i].y < obstacles[j].y + obstacles[j].height &&
                bullets[i].y + bullets[i].height > obstacles[j].y) {
                
                bullets.splice(i, 1);
                
                if (obstacles[j].takeDamage()) {
                    gameState.score += obstacles[j].points;
                    obstacles.splice(j, 1);
                }
                break;
            }
        }
    }
    
    // 敵の弾丸とプレイヤー
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        if (enemyBullets[i].x < player.x + player.width &&
            enemyBullets[i].x + enemyBullets[i].width > player.x &&
            enemyBullets[i].y < player.y + player.height &&
            enemyBullets[i].y + enemyBullets[i].height > player.y) {
            
            enemyBullets.splice(i, 1);
            gameState.lives--;
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
            }
            break;
        }
    }
    
    // 敵とプレイヤー
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].x < player.x + player.width &&
            enemies[i].x + enemies[i].width > player.x &&
            enemies[i].y < player.y + player.height &&
            enemies[i].y + enemies[i].height > player.y) {
            
            enemies.splice(i, 1);
            gameState.lives--;
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
            }
            break;
        }
    }
    
    // プレイヤーの弾丸とボス
    if (boss && boss.isActive) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i].x < boss.x + boss.width &&
                bullets[i].x + bullets[i].width > boss.x &&
                bullets[i].y < boss.y + boss.height &&
                bullets[i].y + bullets[i].height > boss.y) {
                
                bullets.splice(i, 1);
                boss.health--;
                boss.damageFlash = 10; // ダメージフラッシュを10フレーム表示
                
                // ダメージテキストを追加
                damageTexts.push(new DamageText(boss.x + boss.width/2, boss.y, 1));
                
                gameState.score += 5;
                break;
            }
        }
    }
    
    // ボスとプレイヤー
    if (boss && boss.isActive) {
        if (boss.x < player.x + player.width &&
            boss.x + boss.width > player.x &&
            boss.y < player.y + player.height &&
            boss.y + boss.height > player.y) {
            
            gameState.lives--;
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
            }
        }
    }
    
    // プレイヤーと障害物
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].x < player.x + player.width &&
            obstacles[i].x + obstacles[i].width > player.x &&
            obstacles[i].y < player.y + player.height &&
            obstacles[i].y + obstacles[i].height > player.y) {
            
            gameState.lives--;
            if (gameState.lives <= 0) {
                gameState.gameOver = true;
            }
            break;
        }
    }
    
    // 敵の弾丸と障害物
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        for (let j = obstacles.length - 1; j >= 0; j--) {
            if (enemyBullets[i].x < obstacles[j].x + obstacles[j].width &&
                enemyBullets[i].x + enemyBullets[i].width > obstacles[j].x &&
                enemyBullets[i].y < obstacles[j].y + obstacles[j].height &&
                enemyBullets[i].y + enemyBullets[i].height > obstacles[j].y) {
                
                enemyBullets.splice(i, 1);
                break;
            }
        }
    }
}

// ダメージテキスト更新
function updateDamageTexts() {
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        damageTexts[i].update();
        if (damageTexts[i].lifeTime <= 0) {
            damageTexts.splice(i, 1);
        }
    }
}

// 背景スクロール描画
function drawScrollingBackground() {
    // 背景のベース色
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#001122');
    gradient.addColorStop(1, '#000044');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 星の描画
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        const x = (i * 37) % canvas.width;
        const y = (gameState.backgroundY + i * 73) % (canvas.height + 100);
        const size = 1 + (i % 3);
        ctx.fillRect(x, y, size, size);
    }
    
    // 背景スクロール更新
    gameState.backgroundY += 1;
    if (gameState.backgroundY > canvas.height) {
        gameState.backgroundY = 0;
    }
}

// 描画
function draw() {
    // 背景スクロール
    drawScrollingBackground();
    
    // プレイヤー描画（絵文字）
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🚀', player.x + player.width/2, player.y + player.height - 5);
    
    // 弾丸描画
    bullets.forEach(bullet => bullet.draw());
    enemyBullets.forEach(bullet => bullet.draw());
    
    // 敵描画
    enemies.forEach(enemy => enemy.draw());
    
    // 障害物描画
    obstacles.forEach(obstacle => obstacle.draw());
    
    // ボス描画
    if (boss) {
        boss.draw();
    }
    
    // ダメージテキスト描画
    damageTexts.forEach(damageText => damageText.draw());
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    
    if (!gameState.gameStarted) {
        document.getElementById('gameStart').style.display = 'block';
        document.getElementById('gameOver').style.display = 'none';
    } else if (gameState.gameCleared) {
        document.getElementById('gameStart').style.display = 'none';
        document.getElementById('finalScore').textContent = gameState.score;
        document.getElementById('gameOver').style.display = 'block';
        document.querySelector('#gameOver h2').textContent = 'GAME CLEAR!';
        document.getElementById('gameOverMessage').innerHTML = 'おめでとうございます！あなたの空手でくまを倒しました🐻！<br>最終スコア: <span id="finalScore">' + gameState.score + '</span>';
    } else if (gameState.gameOver) {
        document.getElementById('gameStart').style.display = 'none';
        document.getElementById('finalScore').textContent = gameState.score;
        document.getElementById('gameOver').style.display = 'block';
        document.querySelector('#gameOver h2').textContent = 'GAME OVER';
        document.getElementById('gameOverMessage').innerHTML = '最終スコア: <span id="finalScore">' + gameState.score + '</span>';
    } else {
        document.getElementById('gameStart').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';
    }
}

// ゲーム開始
function startGame() {
    gameState.gameStarted = true;
    document.getElementById('gameStart').style.display = 'none';
}

// ゲームリスタート
function restartGame() {
    gameState.score = 0;
    gameState.lives = 10;
    gameState.gameOver = false;
    gameState.gameCleared = false;
    gameState.gameStarted = true;
    gameState.shootTimer = 0;
    gameState.backgroundY = 0;
    gameState.keys = {};
    gameState.touchMove = { x: 0, y: 0 };
    gameState.touchShoot = false;
    player.x = canvas.width / 2 - 15;
    player.y = canvas.height - 80;
    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    obstacles.length = 0;
    damageTexts.length = 0;
    boss = null;
    bossCount = 0;
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('gameStart').style.display = 'none';
}

// メインゲームループ
function gameLoop() {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.gameCleared) {
        updatePlayer();
        updateBullets();
        updateEnemies();
        updateObstacles();
        updateBoss();
        updateDamageTexts();
        spawnEnemy();
        checkCollisions();
    }
    
    draw();
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
gameLoop();