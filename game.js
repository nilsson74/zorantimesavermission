// game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Background Music Element
const backgroundMusic = document.getElementById('backgroundMusic');
backgroundMusic.volume = 0.5; // Set initial volume (0.0 to 1.0)
backgroundMusic.preload = 'auto';
backgroundMusic.load();

// Preload Images
const images = {
    middleBoss1: new Image(),
    middleBoss2: new Image(),
    middleBoss3: new Image(),
    ledning: new Image(),
    iverCloud: new Image()
};

// Set image sources
images.middleBoss1.src = 'assets/middleboss1.png';
images.middleBoss2.src = 'assets/middleboss2.png';
images.middleBoss3.src = 'assets/middleboss3.png';
images.ledning.src = 'assets/ledning.png';
images.iverCloud.src = 'assets/ivercloud.png';

// Ensure all images are loaded before starting the game
let imagesLoaded = 0;
const totalImages = Object.keys(images).length;

for (let key in images) {
    images[key].onload = () => {
        imagesLoaded++;
        if (imagesLoaded === totalImages) {
            // All images loaded
            console.log('All images loaded successfully.');
        }
    };
    images[key].onerror = () => {
        console.error(`Failed to load image: ${images[key].src}`);
    };
}

// Focus on the canvas when the page loads
window.addEventListener('load', () => {
    canvas.focus();
});

// Game State Variables
let gameState = 'title';
let score = 40;
let player = { 
    x: canvas.width / 2 - 25, 
    y: canvas.height - 60, 
    width: 50, 
    height: 50, 
    speed: 5 
};
let bullets = [];
let monsters = [];
let stars = [];
let titleLetters = "Zoran's Timesaver Mission".split('').map((letter, index) => ({
    letter,
    x: canvas.width,
    y: 150,
    targetX: 0
}));

// Remove individual letter handling for "GAME OVER"
// let gameOverLetters = "GAME OVER".split('').map((letter, index, array) => ({
//     letter,
//     x: (canvas.width / 2) - ((array.length * 24) / 2) + index * 24, // Centered based on character count and spacing
//     y: 250
// }));

let pauseTimer = 0;
let canShoot = true;
let endTimer = 0; // Initialize to 0 to allow immediate input in title and info states
let lastTime = 0;

// Monster Types with Images
const monsterTypes = [
    { 
        name: "Ledningsmöte", 
        value: 1, 
        speed: 3, 
        width: 50, 
        height: 50,
        image: images.ledning // Associate the image
    },
    { 
        name: "Iver Cloud Meeting", 
        value: 0.5, 
        speed: 2, 
        width: 60, 
        height: 60,
        image: images.iverCloud // Use the new Iver Cloud image
    },
    { 
        name: "Middle Boss Management", 
        value: 0.25, 
        speed: 1, 
        width: 70, 
        height: 70,
        images: [images.middleBoss1, images.middleBoss2, images.middleBoss3] // Array of images for variety
    }
];

// Key Presses
const keys = { ArrowLeft: false, ArrowRight: false, Space: false };

// Sound Effects using Oscillator
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playNote(freq, duration) {
    const oscillator = new OscillatorNode(audioContext, { frequency: freq, type: 'sine' });
    const gain = new GainNode(audioContext);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
}

// Event Listeners for Key Presses (Attached to Window for Reliability)
window.addEventListener('keydown', (e) => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === 'Space') {
        if (gameState === 'title') {
            gameState = 'info'; // Transition to info state
        } else if (gameState === 'info') {
            gameState = 'monsterInfo'; // Show monsters after info
        } else if (gameState === 'monsterInfo') {
            startGame(); // Start the game after monsters are shown
        } else if (['won', 'lost'].includes(gameState) && endTimer <= 0) {
            startGame(); // Restart game after win/loss
        }
        e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code in keys) keys[e.code] = false;
    if (e.code === 'Space') canShoot = true;
});

// Add a Mute/Unmute Button
const muteButton = document.createElement('button');
muteButton.id = 'muteButton';
muteButton.textContent = 'Mute';
document.getElementById('gameContainer').appendChild(muteButton);

let isMuted = false;
muteButton.addEventListener('click', () => {
    isMuted = !isMuted;
    backgroundMusic.muted = isMuted;
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
});

// Initialize Explosions Array
let explosions = [];

// Create an Explosion at (x, y)
function createExplosion(x, y) {
    const particles = [];
    const particleCount = 20; // Number of particles per explosion

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            velocityX: (Math.random() - 0.5) * 4, // Random horizontal velocity
            velocityY: (Math.random() - 0.5) * 4, // Random vertical velocity
            radius: Math.random() * 2 + 1,       // Random radius between 1 and 3
            alpha: 1,                            // Initial opacity
            decay: 0.02                          // Opacity decay rate
        });
    }

    explosions.push(particles);
}

// Update Explosions
function updateExplosions() {
    explosions.forEach((explosion, index) => {
        explosion.forEach(particle => {
            // Update particle position
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;

            // Fade out the particle
            particle.alpha -= particle.decay;
        });

        // Remove particles that are fully transparent
        explosions[index] = explosion.filter(p => p.alpha > 0);

        // Remove the explosion if all particles have faded
        if (explosions[index].length === 0) {
            explosions.splice(index, 1);
        }
    });
}

// Draw Explosions
function drawExplosions() {
    explosions.forEach(explosion => {
        explosion.forEach(particle => {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = '#ff4c4c'; // Explosion color (bright red)
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    });
}

// Game Speed Variables
let gameSpeedFactor = 1.0;          // Initial speed factor
let speedIncreaseTimer = 0;         // Timer to track elapsed time
const SPEED_INCREASE_INTERVAL = 60; // Time interval in seconds (1 minute)
const SPEED_MULTIPLIER = 1.10;      // 10% speed increase
const MAX_SPEED_FACTOR = 3.0;       // Maximum speed factor to cap the difficulty

// Start Game Function
function startGame() {
    console.log('Starting game and attempting to play background music.');
    gameState = 'playing';
    score = 40;
    monsters = [];
    bullets = [];
    createStars();
    endTimer = 0; // Reset endTimer when starting the game
    speedIncreaseTimer = 0; // Reset speed increase timer
    gameSpeedFactor = 1.0;    // Reset game speed factor

    // Play Background Music if not already playing
    if (backgroundMusic.paused) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().then(() => {
            console.log('Background music is playing.');
        }).catch((error) => {
            console.error('Background music playback failed:', error);
        });
    }
}

// Create Stars with Enhanced Brightness
function createStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2.5 + 0.5, // Slightly larger radius
            speed: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.8 + 0.2 // Increase alpha for brighter stars
        });
    }
}

// Create Monsters
function createMonster() {
    const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
    let monster = {
        x: Math.random() * (canvas.width - type.width),
        y: -type.height,
        ...type,
        rotation: Math.random() * Math.PI * 2
    };

    // If monster type has multiple images, assign one randomly
    if (type.name === "Middle Boss Management" && type.images && type.images.length > 0) {
        monster.image = type.images[Math.floor(Math.random() * type.images.length)];
    }

    // Increase speed by 15% and apply game speed factor
    monster.speed *= 1.15 * gameSpeedFactor;

    monsters.push(monster);
}

// Draw Spaceship with Advanced Graphics
function drawSpaceship(x, y, width, height) {
    // Ship Body
    ctx.fillStyle = '#00ffea';
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
    
    // Engine Glow
    const gradient = ctx.createRadialGradient(x + width / 2, y + height + 10, 5, x + width / 2, y + height + 10, 20);
    gradient.addColorStop(0, 'rgba(255, 165, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height + 10, width * 0.3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Window
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width * 0.15, 0, Math.PI * 2);
    ctx.fill();
}

// Draw Monster with Enhanced Graphics (Using Images)
function drawMonster(monster) {
    if (monster.image) {
        ctx.save();
        ctx.translate(monster.x + monster.width / 2, monster.y + monster.height / 2);
        ctx.rotate(monster.rotation);
        ctx.drawImage(monster.image, -monster.width / 2, -monster.height / 2, monster.width, monster.height);
        ctx.restore();
    } else {
        // Fallback: Draw with color if image not available
        ctx.fillStyle = '#ff0000'; // Default color
        ctx.beginPath();
        ctx.arc(monster.x + monster.width / 2, monster.y + monster.height / 2, monster.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Draw Stars with Enhanced Brightness
function drawStars() {
    stars.forEach(star => {
        ctx.save();
        ctx.globalAlpha = star.alpha; // Increased alpha for brighter stars
        const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Update Function
function update(time) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    if (gameState === 'title') {
        let allInPlace = true;
        ctx.font = '48px Orbitron, sans-serif';
        let totalWidth = ctx.measureText("Zoran's Timesaver Mission").width;
        let startX = (canvas.width - totalWidth) / 2;
        titleLetters.forEach((letter, index) => {
            letter.targetX = startX + ctx.measureText("Zoran's Timesaver Mission".substring(0, index)).width;
            if (letter.x > letter.targetX) {
                letter.x = Math.max(letter.x - 5, letter.targetX);
                allInPlace = false;
            }
        });
        if (allInPlace) {
            pauseTimer++;
            if (pauseTimer > 180) { // Approximately 3 seconds at 60 FPS
                gameState = 'info';
                pauseTimer = 0;
                endTimer = 0; // Ensure endTimer is 0 in info state
            }
        }
    } else if (gameState === 'info') {
        // No dynamic updates needed for the info screen
    } else if (gameState === 'monsterInfo') {
        // No dynamic updates needed for the monster info screen
    } else if (gameState === 'playing') {
        // Increment the speed increase timer
        speedIncreaseTimer += deltaTime;

        // Check if it's time to increase the game speed
        if (speedIncreaseTimer >= SPEED_INCREASE_INTERVAL && gameSpeedFactor < MAX_SPEED_FACTOR) {
            gameSpeedFactor *= SPEED_MULTIPLIER; // Increase speed by 10%
            speedIncreaseTimer -= SPEED_INCREASE_INTERVAL; // Reset timer
            console.log(`Game speed increased to ${gameSpeedFactor.toFixed(2)}x`);
        }

        // Player Movement
        if (keys.ArrowLeft) player.x -= player.speed;
        if (keys.ArrowRight) player.x += player.speed;
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

        // Shooting Bullets
        if (keys.Space && canShoot && bullets.length < 2) { // Limit to 2 bullets
            bullets.push({ x: player.x + player.width / 2, y: player.y });
            playNote(440, 0.1); // Shooting sound
            canShoot = false;
        }

        // Update Bullets
        bullets.forEach(bullet => bullet.y -= 7 * gameSpeedFactor);
        bullets = bullets.filter(bullet => bullet.y > 0);

        // Create Monsters
        const spawnProbability = Math.min(0.02 * gameSpeedFactor, 1); // Cap at 1
        if (Math.random() < spawnProbability) createMonster();
        monsters.forEach(monster => {
            monster.y += monster.speed;
            monster.rotation += 0.02 * gameSpeedFactor;
        });

        // Remove Monsters that go off screen and update score
        monsters = monsters.filter(monster => {
            if (monster.y > canvas.height) {
                score += monster.value;
                return false;
            }
            return true;
        });

        // Collision Detection and Explosion Trigger
        bullets = bullets.filter(bullet => {
            let hit = false;
            monsters = monsters.filter(monster => {
                // Define smaller hitboxes by reducing width and height by 10%
                const monsterHitboxWidth = monster.width * 0.9;
                const monsterHitboxHeight = monster.height * 0.9;
                const monsterHitboxX = monster.x + (monster.width - monsterHitboxWidth) / 2;
                const monsterHitboxY = monster.y + (monster.height - monsterHitboxHeight) / 2;

                // Check collision between bullet and monster's reduced hitbox
                if (
                    bullet.x > monsterHitboxX &&
                    bullet.x < monsterHitboxX + monsterHitboxWidth &&
                    bullet.y > monsterHitboxY &&
                    bullet.y < monsterHitboxY + monsterHitboxHeight
                ) {
                    score -= monster.value;
                    playNote(100, 0.2); // Explosion sound
                    createExplosion(monster.x + monster.width / 2, monster.y + monster.height / 2); // Trigger explosion
                    hit = true;
                    return false; // Remove monster
                }
                return true; // Keep monster
            });
            return !hit; // Remove bullet if it hit
        });

        // Update Stars
        stars.forEach(star => {
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        });

        // Update Explosions
        updateExplosions();

        // Check Game Over Conditions
        if (score <= 0) {
            gameState = 'won';
            endTimer = 15;
        } else if (score >= 80) {
            gameState = 'lost';
            endTimer = 15;
            // No need to adjust letters as we're drawing the entire "GAME OVER" text centered
        }
    } else if (['won', 'lost'].includes(gameState)) {
        endTimer = Math.max(0, endTimer - deltaTime);
    }
}

// Draw Function
function draw() {
    // Clear Canvas with Black Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Stars
    drawStars();

    if (gameState === 'title') {
        ctx.font = '48px Orbitron, sans-serif';
        ctx.fillStyle = '#00ffea';
        titleLetters.forEach(letter => {
            ctx.fillText(letter.letter, letter.x, letter.y);
        });
    } else if (gameState === 'info') {
        // First info screen (centered text and space to continue)
        ctx.font = '20px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';  // Center all text

        const infoTexts = [
            "HELLO ZORAN !!",
            "The average time it takes to order a new employee laptop",
            "computer at Iver is atleast 40 hours !!!! You need to",
            "free your schedule by shooting down time-consuming",
            "tasks. When you have saved 40 hours, your mission",
            "is accomplished.",
            "",
            "Use arrow keys to move, space to shoot.",
            "Be aware of what happens if your time reaches 80 hours!"
        ];

        infoTexts.forEach((text, index) => {
            ctx.fillText(text, canvas.width / 2, 200 + index * 30);
        });

        ctx.fillStyle = '#00ffea';
        ctx.fillText("Press SPACE to continue", canvas.width / 2, 500);
    } else if (gameState === 'monsterInfo') {
        // Second screen showing monster info (each monster with its image and info)
        ctx.font = '20px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';  // Align left for images and text

        // Calculate positions to center the images horizontally
        const imageWidth = 50;
        const imageHeight = 50;
        const spacing = 40; // Increased spacing to prevent overlap
        const startX = (canvas.width - (3 * (imageWidth + spacing))) / 2;
        const baseY = 100;

        // Ledningsmöte
        if (images.ledning.complete) { 
            ctx.drawImage(images.ledning, startX, baseY, imageWidth, imageHeight);
        } else {
            // Placeholder if image not loaded
            ctx.fillRect(startX, baseY, imageWidth, imageHeight);
        }
        ctx.fillText("Ledningsmöte", startX + imageWidth + 20, baseY + 25);
        ctx.fillText("Speed: Fast", startX + imageWidth + 20, baseY + 50);
        ctx.fillText("Points: -1 Hour", startX + imageWidth + 20, baseY + 75);

        // Iver Cloud Meeting
        if (images.iverCloud.complete) { 
            ctx.drawImage(images.iverCloud, startX + imageWidth + spacing, baseY + 100, imageWidth, imageHeight);
        } else {
            // Placeholder if image not loaded
            ctx.fillRect(startX + imageWidth + spacing, baseY + 100, imageWidth, imageHeight);
        }
        ctx.fillText("Iver Cloud Meeting", startX + 2 * imageWidth + 2 * spacing, baseY + 125);
        ctx.fillText("Speed: Average", startX + 2 * imageWidth + 2 * spacing, baseY + 150);
        ctx.fillText("Points: -30 minutes", startX + 2 * imageWidth + 2 * spacing, baseY + 175);

        // Middle Boss Management
        [images.middleBoss1, images.middleBoss2, images.middleBoss3].forEach((img, index) => {
            if (img.complete) {
                ctx.drawImage(img, startX + index * (imageWidth + spacing), baseY + 200, imageWidth, imageHeight);
            } else {
                // Placeholder if image not loaded
                ctx.fillRect(startX + index * (imageWidth + spacing), baseY + 200, imageWidth, imageHeight);
            }
        });
        ctx.fillText("Middle Boss Management", startX, baseY + 275);
        ctx.fillText("Speed: Slow", startX, baseY + 300);
        ctx.fillText("Points: -15 minutes", startX, baseY + 325);

        // Press SPACE to start
        ctx.fillStyle = '#00ffea';
        ctx.textAlign = 'center';  // Center this text
        ctx.fillText("Press SPACE to start", canvas.width / 2, 500);
    } else if (gameState === 'playing') {
        // Draw Player
        drawSpaceship(player.x, player.y, player.width, player.height);

        // Draw Bullets
        ctx.fillStyle = '#ffea00';
        bullets.forEach(bullet => ctx.fillRect(bullet.x - 1, bullet.y, 2, 10));

        // Draw Monsters
        monsters.forEach(drawMonster);

        // Draw Explosions
        drawExplosions();

        // Display Score
        ctx.font = '20px Orbitron, sans-serif';
        ctx.fillStyle = '#00ffea';
        ctx.textAlign = 'left';
        ctx.fillText(`Time left: ${score.toFixed(2)} hours`, 10, 30);
    } else if (gameState === 'won') {
        ctx.fillStyle = '#00ffea';
        ctx.font = '36px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Congratulations Zoran !", canvas.width / 2, 250);
        ctx.fillText("You've freed up time to order", canvas.width / 2, 320);
        ctx.fillText("Jonas a new client+ laptop!! Hurry Up !!", canvas.width / 2, 380);
        ctx.font = '20px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Replay in ${Math.ceil(endTimer)} seconds`, canvas.width / 2, 500);
        if (endTimer <= 0) {
            ctx.fillStyle = '#ff4c4c';
            ctx.fillText("Press SPACE to play again", canvas.width / 2, 550);
        }
    } else if (gameState === 'lost') {
        // Draw "GAME OVER" Text Centered
        ctx.font = '48px Orbitron, sans-serif';
        ctx.fillStyle = '#ff4c4c'; // Red color for visibility
        ctx.textAlign = 'center'; // Center the text
        ctx.fillText("GAME OVER", canvas.width / 2, 250);

        // Additional Game Over Text
        ctx.font = '24px Orbitron, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText("New company structure", canvas.width / 2, 300);
        ctx.fillText("will be deployed", canvas.width / 2, 350);
        ctx.fillText(`Replay in ${Math.ceil(endTimer)} seconds`, canvas.width / 2, 500);
        if (endTimer <= 0) {
            ctx.fillStyle = '#00ffea';
            ctx.fillText("Press SPACE to try again", canvas.width / 2, 550);
        }
    }
}

// Game Loop
function gameLoop(time) {
    update(time);
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize Stars and Start Game Loop
createStars();
gameLoop(0);
