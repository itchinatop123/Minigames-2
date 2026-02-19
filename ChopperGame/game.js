const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let score = 0;
let lives = 3;
let combo = 0;
let gameRunning = true;
let vegetables = [];
let particles = [];

const vegetables_types = [
    { emoji: '🍎', name: 'apple', points: 10, color: '#ff0000' },
    { emoji: '🍌', name: 'banana', points: 15, color: '#ffeb3b' },
    { emoji: '🥕', name: 'carrot', points: 20, color: '#ff9800' },
    { emoji: '🍅', name: 'tomato', points: 25, color: '#f44336' },
    { emoji: '🥬', name: 'lettuce', points: 10, color: '#4caf50' },
    { emoji: '🥒', name: 'cucumber', points: 15, color: '#8bc34a' },
    { emoji: '🧅', name: 'onion', points: 20, color: '#f5deb3' },
    { emoji: '🌽', name: 'corn', points: 25, color: '#ffc107' }
];

class Vegetable {
    constructor() {
        const type = vegetables_types[Math.floor(Math.random() * vegetables_types.length)];
        this.x = Math.random() * (canvas.width - 50) + 25;
        this.y = -50;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = Math.random() * 3 + 3;
        this.radius = 25;
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.chopped = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.vy += 0.15; // gravity
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.emoji, 0, 0);
        ctx.restore();

        // Draw circle hitbox (for debugging)
        // ctx.strokeStyle = 'red';
        // ctx.beginPath();
        // ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        // ctx.stroke();
    }

    isOffScreen() {
        return this.y > canvas.height + 100;
    }
}

class Particle {
    constructor(x, y, emoji) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 3;
        this.emoji = emoji;
        this.life = 1;
        this.size = 30;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.font = (this.size * this.life) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.x, this.y);
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

function spawnVegetable() {
    vegetables.push(new Vegetable());
}

function updateScore(points) {
    score += points * (1 + combo * 0.1);
    combo++;
    document.getElementById('score').textContent = 'Score: ' + Math.floor(score);
    document.getElementById('combo').textContent = 'Combo: ' + combo + 'x';
}

function resetCombo() {
    combo = 0;
    document.getElementById('combo').textContent = 'Combo: 0x';
}

function loseLife() {
    lives--;
    resetCombo();
    updateLives();
}

function updateLives() {
    const hearts = '❤️'.repeat(Math.max(0, lives));
    document.getElementById('lives').textContent = 'Lives: ' + hearts;
    
    if (lives <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOver').classList.remove('hidden');
    document.getElementById('finalScore').textContent = 'Final Score: ' + Math.floor(score);
}

let spawnRate = 1.5;
let spawnTimer = 0;

function update() {
    if (!gameRunning) return;

    // Spawn vegetables
    spawnTimer++;
    if (spawnTimer > spawnRate) {
        spawnVegetable();
        spawnTimer = 0;
        spawnRate = Math.max(0.5, spawnRate - 0.001); // Gradually increase difficulty
    }

    // Update vegetables
    for (let i = vegetables.length - 1; i >= 0; i--) {
        vegetables[i].update();

        if (vegetables[i].isOffScreen()) {
            loseLife();
            vegetables.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(135, 206, 235, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw vegetables
    for (let vegetable of vegetables) {
        vegetable.draw();
    }

    // Draw particles
    for (let particle of particles) {
        particle.draw();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Mouse/Touch interaction
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function checkHit(x, y) {
    let hit = false;
    for (let i = vegetables.length - 1; i >= 0; i--) {
        const veg = vegetables[i];
        const dist = Math.sqrt((veg.x - x) ** 2 + (veg.y - y) ** 2);
        
        if (dist < veg.radius + 10) {
            updateScore(veg.type.points);
            particles.push(new Particle(veg.x, veg.y, veg.type.emoji));
            vegetables.splice(i, 1);
            hit = true;
            break;
        }
    }
    
    if (!hit) {
        resetCombo();
    }
}

canvas.addEventListener('click', (e) => {
    if (!gameRunning) return;
    const pos = getMousePos(e);
    checkHit(pos.x, pos.y);
});

canvas.addEventListener('touchstart', (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    for (let touch of e.touches) {
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        checkHit(x, y);
    }
});

// Start the game
gameLoop();
setInterval(() => {
    if (combo > 0) resetCombo();
}, 3000); // Reset combo after 3 seconds of no hits
