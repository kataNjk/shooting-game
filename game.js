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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.color = '#ff0000';
        this.type = type;
        this.shootTimer = 0;
        this.health = 1;
    }
    
    update() {
        this.y += this.speed;
        this.shootTimer++;
        
        // 敵の弾丸発射
        if (this.shootTimer > 60 && Math.random() < 0.02) {
            enemyBullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 3, '#ff4444'));
            this.shootTimer = 0;
        }
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 簡単な敵の形状
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(this.x + 5, this.y + 5, 20, 10);
        ctx.fillRect(this.x + 10, this.y + 15, 10, 10);
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
        
        // ボスタイプ別の攻撃パターン
        this.performAttack();
        
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
                enemyBullets.push(new Bullet(this.x + this.width/2, this.y + this.height, 5, '#8b4513'));
                this.shootTimer = 0;
            } else if (this.attackPattern === 1 && this.shootTimer > 20) {
                const angle = (Math.random() - 0.5) * Math.PI / 2;
                const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 4, '#8b4513');
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
                    const bullet = new Bullet(this.x + this.width/2, this.y + this.height, 3, '#8b4513');
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
        const currentImage = bossImages[this.type];
        
        if (currentImage && currentImage.complete) {
            ctx.drawImage(currentImage, this.x, this.y, this.width, this.height);
        } else {
            // 画像読み込み前の代替表示
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        // 体力バー
        if (this.isActive) {
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
    // ゲームに関連するキーのみ処理（矢印キー + WASD + スペース）
    const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
    if (gameKeys.includes(e.code)) {
        e.preventDefault();
        gameState.keys[e.code] = true;
    }
});

document.addEventListener('keyup', (e) => {
    // ゲームに関連するキーのみ処理（矢印キー + WASD + スペース）
    const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
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

function setupTouchControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const shootButton = document.getElementById('shootButton');
    
    // 要素が存在しない場合は処理を停止
    if (!joystick || !joystickKnob || !shootButton) {
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
    
    // ジョイスティック操作
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        joystickCenter = getJoystickCenter();
    });
    
    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystickActive) return;
        
        const touch = e.touches[0];
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
        joystickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        gameState.touchMove.x = 0;
        gameState.touchMove.y = 0;
    });
    
    // 発射ボタン
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        gameState.touchShoot = true;
    });
    
    shootButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        gameState.touchShoot = false;
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
    
    // タッチ操作の処理
    if (gameState.isMobile) {
        moveX += gameState.touchMove.x;
        moveY += gameState.touchMove.y;
    }
    
    // 斜め移動の場合は速度を調整（√2で割る）
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707; // 約1/√2
        moveY *= 0.707;
    }
    
    // 実際の移動
    let newX = player.x + moveX * player.speed;
    let newY = player.y + moveY * player.speed;
    
    // 画面範囲内に制限
    if (newX < 0) newX = 0;
    if (newX > canvas.width - player.width) newX = canvas.width - player.width;
    if (newY < 0) newY = 0;
    if (newY > canvas.height - player.height) newY = canvas.height - player.height;
    
    player.x = newX;
    player.y = newY;
    
    // 弾丸発射処理を最後に行う
    if (gameState.keys['Space'] || gameState.touchShoot) {
        if (gameState.shootTimer <= 0) {
            bullets.push(new Bullet(player.x + player.width/2, player.y, -8));
            gameState.shootTimer = 10;
        }
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
        } else if (bossCount === 2 && gameState.score >= 2700) {
            boss = new Boss('boss3'); // ダンシングベア
            return;
        }
    }
    
    // 通常の敵生成（ボス戦中は生成しない）
    if (boss === null && Math.random() < 0.02) {
        const x = Math.random() * (canvas.width - 30);
        enemies.push(new Enemy(x, -30));
    }
}

// ボス更新
function updateBoss() {
    if (boss) {
        boss.update();
        
        // ボスが倒されたかチェック
        if (boss.health <= 0) {
            gameState.score += 1000;
            bossCount++;
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
                enemies.splice(j, 1);
                gameState.score += 10;
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
    
    // プレイヤー描画
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // プレイヤーの形状
    ctx.fillStyle = '#00ff44';
    ctx.fillRect(player.x + 5, player.y + 5, 20, 10);
    ctx.fillRect(player.x + 10, player.y + 15, 10, 10);
    
    // 弾丸描画
    bullets.forEach(bullet => bullet.draw());
    enemyBullets.forEach(bullet => bullet.draw());
    
    // 敵描画
    enemies.forEach(enemy => enemy.draw());
    
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