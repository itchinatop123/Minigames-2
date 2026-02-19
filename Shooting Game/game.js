// Game Constants
const GAME_WIDTH = 1200;
const GAME_HEIGHT = 600;
const GAME_STATES = {
    IDLE: 'idle',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

// Main Game Class
class ShooterGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.scoreDisplay = document.getElementById('score');
        this.healthDisplay = document.getElementById('health');
        this.ammoDisplay = document.getElementById('ammo');
        this.bombsDisplay = document.getElementById('bombs');
        this.missilesDisplay = document.getElementById('missiles');
        this.waveDisplay = document.getElementById('wave');
        this.gameStatus = document.getElementById('gameStatus');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');

        this.gameState = GAME_STATES.IDLE;
        this.score = 0;
        this.health = 100;
        this.ammo = 999;
        this.bombs = 9000000000000;
        this.missiles = 8000000000000;
        this.wave = 1;
        this.killCount = 0;

        // Player
        this.player = {
            x: GAME_WIDTH / 2,
            y: GAME_HEIGHT - 60,
            width: 40,
            height: 40,
            speed: 5,
            velocityX: 0,
            velocityY: 0,
            element: null
        };

        // Arrays
        this.bullets = [];
        this.enemies = [];
        this.bombs_dropped = [];
        this.missiles_fired = [];
        this.explosions = [];
        
        // Spawn timer to control enemy spawning rate
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 35; // Spawn an enemy every 35 frames (~0.58 seconds at 60 FPS)

        // Input handling
        this.keysPressed = {};
        this.mouseX = GAME_WIDTH / 2;
        this.mouseY = GAME_HEIGHT / 2;

        this.setupEventListeners();
        this.createPlayerElement();
        this.render();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('click', () => this.shoot());
        document.addEventListener('keypress', (e) => {
            if (e.key === ' ') this.shoot();
            if (e.key.toLowerCase() === 'b') this.dropBomb();
            if (e.key.toLowerCase() === 'm') this.fireMissile();
            if (e.key.toLowerCase() === 'p') this.togglePause();
        });

        this.startBtn.addEventListener('click', () => this.startGame());
        this.resetBtn.addEventListener('click', () => this.resetGame());
    }

    handleKeyDown(e) {
        this.keysPressed[e.key.toLowerCase()] = true;

        if (e.shiftKey) {
            this.dropBomb();
        }
    }

    handleKeyUp(e) {
        this.keysPressed[e.key.toLowerCase()] = false;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
    }

    createPlayerElement() {
        const player = document.createElement('div');
        player.className = 'player';
        player.style.left = this.player.x + 'px';
        player.style.top = this.player.y + 'px';
        this.canvas.appendChild(player);
        this.player.element = player;
    }

    updatePlayerMovement() {
        let moveX = 0;
        let moveY = 0;

        if (this.keysPressed['arrowup'] || this.keysPressed['w']) moveY -= this.player.speed;
        if (this.keysPressed['arrowdown'] || this.keysPressed['s']) moveY += this.player.speed;
        if (this.keysPressed['arrowleft'] || this.keysPressed['a']) moveX -= this.player.speed;
        if (this.keysPressed['arrowright'] || this.keysPressed['d']) moveX += this.player.speed;

        this.player.x += moveX;
        this.player.y += moveY;

        // Boundary checking
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > GAME_WIDTH) this.player.x = GAME_WIDTH - this.player.width;
        if (this.player.y < 0) this.player.y = 0;
        if (this.player.y + this.player.height > GAME_HEIGHT) this.player.y = GAME_HEIGHT - this.player.height;

        // Update player element
        this.player.element.style.left = this.player.x + 'px';
        this.player.element.style.top = this.player.y + 'px';
    }

    shoot() {
        if (this.gameState !== GAME_STATES.PLAYING || this.ammo <= 0) return;

        const bullet = {
            x: this.player.x + this.player.width / 2,
            y: this.player.y,
            width: 8,
            height: 8,
            speed: 8,
            element: null
        };

        // Calculate direction towards mouse
        const dx = this.mouseX - bullet.x;
        const dy = this.mouseY - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        bullet.velocityX = (dx / distance) * bullet.speed;
        bullet.velocityY = (dy / distance) * bullet.speed;

        const bulletEl = document.createElement('div');
        bulletEl.className = 'bullet';
        bulletEl.style.left = bullet.x + 'px';
        bulletEl.style.top = bullet.y + 'px';
        this.canvas.appendChild(bulletEl);
        bullet.element = bulletEl;

        this.bullets.push(bullet);
        this.ammo--;
    }

    dropBomb() {
        if (this.gameState !== GAME_STATES.PLAYING || this.bombs <= 0) return;

        const bomb = {
            x: this.player.x + this.player.width / 2 - 12.5,
            y: this.player.y - 30,
            width: 25,
            height: 25,
            speed: 4,
            velocityX: (Math.random() - 0.5) * 6,
            velocityY: -5,
            element: null,
            gravity: 0.2,
            timer: 60
        };

        const bombEl = document.createElement('div');
        bombEl.className = 'bomb';
        bombEl.style.left = bomb.x + 'px';
        bombEl.style.top = bomb.y + 'px';
        this.canvas.appendChild(bombEl);
        bomb.element = bombEl;

        this.bombs_dropped.push(bomb);
        this.bombs--;
    }

    fireMissile() {
        if (this.gameState !== GAME_STATES.PLAYING || this.missiles <= 0) return;

        const missile = {
            x: this.player.x + this.player.width / 2,
            y: this.player.y,
            width: 15,
            height: 40,
            speed: 12,
            element: null,
            power: 20
        };

        // Calculate direction towards mouse
        const dx = this.mouseX - missile.x;
        const dy = this.mouseY - missile.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        missile.velocityX = (dx / distance) * missile.speed;
        missile.velocityY = (dy / distance) * missile.speed;

        const missileEl = document.createElement('div');
        missileEl.className = 'missile';
        missileEl.style.left = missile.x + 'px';
        missileEl.style.top = missile.y + 'px';
        this.canvas.appendChild(missileEl);
        missile.element = missileEl;

        this.missiles_fired.push(missile);
        this.missiles--;
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.x += bullet.velocityX;
            bullet.y += bullet.velocityY;

            bullet.element.style.left = bullet.x + 'px';
            bullet.element.style.top = bullet.y + 'px';

            // Remove if out of bounds
            if (bullet.x < 0 || bullet.x > GAME_WIDTH || bullet.y < 0 || bullet.y > GAME_HEIGHT) {
                bullet.element.remove();
                this.bullets.splice(i, 1);
            }
        }
    }

    updateMissiles() {
        for (let i = this.missiles_fired.length - 1; i >= 0; i--) {
            const missile = this.missiles_fired[i];
            missile.x += missile.velocityX;
            missile.y += missile.velocityY;

            missile.element.style.left = missile.x + 'px';
            missile.element.style.top = missile.y + 'px';

            // Remove if out of bounds
            if (missile.x < 0 || missile.x > GAME_WIDTH || missile.y < 0 || missile.y > GAME_HEIGHT) {
                missile.element.remove();
                this.missiles_fired.splice(i, 1);
            }
        }
    }

    updateBombs() {
        for (let i = this.bombs_dropped.length - 1; i >= 0; i--) {
            const bomb = this.bombs_dropped[i];
            bomb.velocityY += bomb.gravity;
            bomb.x += bomb.velocityX;
            bomb.y += bomb.velocityY;
            bomb.timer--;

            bomb.element.style.left = bomb.x + 'px';
            bomb.element.style.top = bomb.y + 'px';

            // Explode on timer or when falling off screen
            if (bomb.timer <= 0 || bomb.y > GAME_HEIGHT) {
                if (bomb.y <= GAME_HEIGHT) { // Only explode with full effect if still on screen
                    this.createExplosion(bomb.x + 12.5, bomb.y + 12.5, 150);
                }
                bomb.element.remove();
                this.bombs_dropped.splice(i, 1);
            }
        }
    }

    spawnEnemy() {
        const types = [
            { health: 1, speed: 2, strong: false },
            { health: 2, speed: 3, strong: true }
        ];

        const type = types[Math.floor(Math.random() * types.length)];
        const x = GAME_WIDTH - 35;
        const y = Math.random() * (GAME_HEIGHT - 100);

        const enemy = {
            x: x,
            y: y,
            width: 35,
            height: 35,
            speed: type.speed,
            health: type.health,
            strong: type.strong,
            element: null,
            shootTimer: 30
        };

        const enemyEl = document.createElement('div');
        enemyEl.className = `enemy ${enemy.strong ? 'strong' : ''}`;
        enemyEl.style.left = enemy.x + 'px';
        enemyEl.style.top = enemy.y + 'px';
        this.canvas.appendChild(enemyEl);
        enemy.element = enemyEl;

        this.enemies.push(enemy);
    }

    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Move towards player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed;
                enemy.y += (dy / distance) * enemy.speed;
            }

            enemy.element.style.left = enemy.x + 'px';
            enemy.element.style.top = enemy.y + 'px';

            // Check collision with player
            if (this.checkCollision(this.player, enemy)) {
                this.health -= 5;
                this.createExplosion(enemy.x, enemy.y, 40);
                enemy.element.remove();
                this.enemies.splice(i, 1);
            }
        }
    }

    updateCollisions() {
        // Bullet-Enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkCollision(this.bullets[i], this.enemies[j])) {
                    this.enemies[j].health--;
                    this.createExplosion(this.bullets[i].x, this.bullets[i].y, 30);

                    if (this.enemies[j].health <= 0) {
                        this.score += this.enemies[j].strong ? 100 : 50;
                        this.killCount++;
                        this.enemies[j].element.remove();
                        this.enemies.splice(j, 1);
                    }

                    this.bullets[i].element.remove();
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }

        // Bomb explosion collisions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const dist = Math.hypot(
                    explosion.x - (this.enemies[j].x + 17.5),
                    explosion.y - (this.enemies[j].y + 17.5)
                );

                if (dist < explosion.radius) {
                    this.score += this.enemies[j].strong ? 100 : 50;
                    this.killCount++;
                    this.enemies[j].element.remove();
                    this.enemies.splice(j, 1);
                }
            }
        }

        // Missile-Enemy collisions (20x more powerful, instant one-shot)
        for (let i = this.missiles_fired.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkCollision(this.missiles_fired[i], this.enemies[j])) {
                    this.score += this.enemies[j].strong ? 1000 : 500;
                    this.killCount++;
                    // Create massive explosion with 20x impact
                    this.createExplosion(this.missiles_fired[i].x, this.missiles_fired[i].y, 250);
                    this.enemies[j].element.remove();
                    this.enemies.splice(j, 1);
                }
            }
            // Clean up missile after it hits something
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkCollision(this.missiles_fired[i], this.enemies[j])) {
                    this.missiles_fired[i].element.remove();
                    this.missiles_fired.splice(i, 1);
                    break;
                }
            }
        }
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    createExplosion(x, y, radius) {
        const explosion = {
            x: x,
            y: y,
            radius: radius,
            element: null,
            timer: 40
        };

        const explosionEl = document.createElement('div');
        explosionEl.className = 'explosion';
        explosionEl.style.left = (x - radius/2) + 'px';
        explosionEl.style.top = (y - radius/2) + 'px';
        explosionEl.style.width = radius + 'px';
        explosionEl.style.height = radius + 'px';
        this.canvas.appendChild(explosionEl);
        explosion.element = explosionEl;

        this.explosions.push(explosion);
        setTimeout(() => {
            if (explosionEl.parentElement) {
                explosionEl.remove();
            }
        }, 600);
    }

    updateExplosions() {
        this.explosions = this.explosions.filter(e => {
            e.timer--;
            return e.timer > 0;
        });
    }

    updateWave() {
        if (this.killCount >= 5 * this.wave && this.enemies.length === 0) {
            this.wave++;
            this.ammo += 100;
            this.bombs += 2;
            this.gameStatus.textContent = `🌊 WAVE ${this.wave}! 🌊`;
            setTimeout(() => {
                if (this.gameState === GAME_STATES.PLAYING) {
                    this.gameStatus.textContent = 'WAVE ' + this.wave;
                }
            }, 2000);
        }
    }

    update() {
        if (this.gameState !== GAME_STATES.PLAYING) return;

        this.updatePlayerMovement();
        this.updateBullets();
        this.updateMissiles();
        this.updateBombs();
        this.updateEnemies();
        this.updateCollisions();
        this.updateExplosions();
        this.updateWave();

        // Spawn enemies with timer to prevent too fast spawning
        this.enemySpawnTimer++;
        if (this.enemies.length < 3 + this.wave && this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // Respawn ammo
        if (this.ammo < 50 && Math.random() < 0.005) {
            this.ammo += 10;
        }

        // Update displays
        this.scoreDisplay.textContent = this.score;
        this.healthDisplay.textContent = Math.max(0, this.health);
        this.ammoDisplay.textContent = this.ammo;
        this.bombsDisplay.textContent = this.bombs;
        this.missilesDisplay.textContent = this.missiles;
        this.waveDisplay.textContent = this.wave;

        // Game over check
        if (this.health <= 0) {
            this.endGame();
        }
    }

    render() {
        // Render will be handled by requestAnimationFrame in gameLoop
    }

    startGame() {
        if (this.gameState === GAME_STATES.IDLE || this.gameState === GAME_STATES.GAME_OVER) {
            this.gameState = GAME_STATES.PLAYING;
            this.gameStatus.textContent = '🎮 GAME START! 🎮';
            setTimeout(() => {
                if (this.gameState === GAME_STATES.PLAYING) {
                    this.gameStatus.textContent = 'WAVE ' + this.wave;
                }
            }, 1000);
        }
    }

    togglePause() {
        if (this.gameState === GAME_STATES.PLAYING) {
            this.gameState = GAME_STATES.PAUSED;
            this.gameStatus.textContent = '⏸️ PAUSED ⏸️';
        } else if (this.gameState === GAME_STATES.PAUSED) {
            this.gameState = GAME_STATES.PLAYING;
            this.gameStatus.textContent = 'WAVE ' + this.wave;
        }
    }

    endGame() {
        this.gameState = GAME_STATES.GAME_OVER;
        this.gameStatus.textContent = `💥 GAME OVER! 💥 Final Score: ${this.score} | Wave: ${this.wave}`;
    }

    resetGame() {
        // Clear all elements
        document.querySelectorAll('.bullet, .enemy, .bomb, .explosion, .missile').forEach(el => el.remove());

        // Reset game state
        this.gameState = GAME_STATES.IDLE;
        this.score = 0;
        this.health = 100;
        this.ammo = 999;
        this.bombs = 9000000000000;
        this.missiles = 8000000000000;
        this.wave = 1;
        this.killCount = 0;
        this.bullets = [];
        this.enemies = [];
        this.bombs_dropped = [];
        this.missiles_fired = [];
        this.explosions = [];
        this.enemySpawnTimer = 0;

        // Reset player position
        this.player.x = GAME_WIDTH / 2;
        this.player.y = GAME_HEIGHT - 60;
        this.player.element.style.left = this.player.x + 'px';
        this.player.element.style.top = this.player.y + 'px';

        // Update displays
        this.scoreDisplay.textContent = '0';
        this.healthDisplay.textContent = '100';
        this.ammoDisplay.textContent = '999';
        this.bombsDisplay.textContent = '9000000000000';
        this.missilesDisplay.textContent = '8000000000000';
        this.waveDisplay.textContent = '1';
        this.gameStatus.textContent = 'Press Start to play!';
    }
}

// Game loop
let game;

window.addEventListener('load', () => {
    game = new ShooterGame();
    game.gameStatus.textContent = 'Press Start to play!';

    // Game loop with requestAnimationFrame
    function gameLoop() {
        game.update();
        requestAnimationFrame(gameLoop);
    }

    gameLoop();
});
