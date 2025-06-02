const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions
canvas.width = 2400;
canvas.height = 1800;

function resizeCanvas() {
    const aspectRatio = 2400 / 1800; // 4/3
    let newWidth = window.innerWidth;
    let newHeight = window.innerHeight;
    const windowAspectRatio = newWidth / newHeight;

    if (windowAspectRatio > aspectRatio) {
        // Window is wider than the game, so height is the limiting factor
        newWidth = newHeight * aspectRatio;
        canvas.style.height = newHeight + 'px';
        canvas.style.width = newWidth + 'px';
    } else {
        // Window is taller (or same aspect ratio) than the game, so width is the limiting factor
        newHeight = newWidth / aspectRatio;
        canvas.style.width = newWidth + 'px';
        canvas.style.height = newHeight + 'px';
    }

    // Center the canvas
    canvas.style.marginLeft = (window.innerWidth - newWidth) / 2 + 'px';
    canvas.style.marginTop = (window.innerHeight - newHeight) / 2 + 'px';
}

// Call resizeCanvas initially and on window resize
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call to set size

// Load images
const images = {};
const imageSources = {
    background: 'assets/background.png',
    factory: 'assets/factory.png',
    island1: 'assets/island1.png',
    island2: 'assets/island2.png',
    island3: 'assets/island3.png',
    island4: 'assets/island4.png',
    shipEmptyLeft: 'assets/ship-empty-left.png',
    shipFullLeft: 'assets/ship-full-left.png',
    shipEmptyRight: 'assets/ship-empty-right.png',
    shipFullRight: 'assets/ship-full-right.png'
};

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // All images loaded, start the game
        console.log("All images loaded. Starting game.");
        gameLoop();
    }
}

for (const key in imageSources) {
    images[key] = new Image();
    images[key].src = imageSources[key];
    images[key].onload = imageLoaded;
    images[key].onerror = () => {
        console.error(`Error loading image: ${imageSources[key]}`);
    }
}


// Game objects
const factory = {
    x: canvas.width / 2 - 150, // Scaled: (canvas.width / 2 - 100) * 1.5 -> canvas.width / 2 - 150
    y: canvas.height / 2 - 150, // Scaled: (canvas.height / 2 - 100) * 1.5 -> canvas.height / 2 - 150
    width: 300, // Scaled: 200 * 1.5
    height: 300 // Scaled: 200 * 1.5
};

const islands = [
    { x: 300, y: 300, width: 240, height: 240, imageKey: 'island1' }, // Scaled: 200*1.5, 200*1.5, 160*1.5, 160*1.5
    { x: 1800, y: 450, width: 240, height: 240, imageKey: 'island2' }, // Scaled: 1200*1.5, 300*1.5, 160*1.5, 160*1.5
    { x: 450, y: 1200, width: 240, height: 240, imageKey: 'island3' }, // Scaled: 300*1.5, 800*1.5, 160*1.5, 160*1.5
    { x: 1650, y: 1350, width: 240, height: 240, imageKey: 'island4' } // Scaled: 1100*1.5, 900*1.5, 160*1.5, 160*1.5
];

const player = {
    x: canvas.width / 2 - 75, // Start near the factory
    y: factory.y + factory.height + 50, // Start below the factory
    width: 150, // Player ship size (adjust as needed)
    height: 150,
    speed: 8, // Player movement speed
    hasMedicine: false,
    facingDirection: 'right', // 'left' or 'right'
    currentImageKey: 'shipEmptyRight' // Initial image
};

const keysPressed = {};

window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

function updatePlayerImage() {
    let newImageKey = 'ship';
    newImageKey += player.hasMedicine ? 'Full' : 'Empty';
    newImageKey += player.facingDirection.charAt(0).toUpperCase() + player.facingDirection.slice(1);
    player.currentImageKey = newImageKey;
}

function drawBackground() {
    // Tile the background image
    const bgPattern = ctx.createPattern(images.background, 'repeat');
    ctx.fillStyle = bgPattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawFactory() {
    if (images.factory.complete && images.factory.naturalHeight !== 0) {
        ctx.drawImage(images.factory, factory.x, factory.y, factory.width, factory.height);
    } else {
        console.warn("Factory image not ready to draw or is broken.");
    }
}

function drawIslands() {
    islands.forEach(island => {
        if (images[island.imageKey] && images[island.imageKey].complete && images[island.imageKey].naturalHeight !== 0) {
            ctx.drawImage(images[island.imageKey], island.x, island.y, island.width, island.height);
        } else {
             console.warn(`Island image ${island.imageKey} not ready to draw or is broken.`);
        }
    });
}

function drawPlayer() {
    if (images[player.currentImageKey] && images[player.currentImageKey].complete && images[player.currentImageKey].naturalHeight !== 0) {
        ctx.drawImage(images[player.currentImageKey], player.x, player.y, player.width, player.height);
    } else {
        console.warn(`Player image ${player.currentImageKey} not ready to draw or is broken.`);
    }
}

function update() {
    // Player movement
    let movedHorizontally = false;
    if (keysPressed['ArrowUp'] || keysPressed['w']) {
        player.y -= player.speed;
    }
    if (keysPressed['ArrowDown'] || keysPressed['s']) {
        player.y += player.speed;
    }
    if (keysPressed['ArrowLeft'] || keysPressed['a']) {
        player.x -= player.speed;
        player.facingDirection = 'left';
        movedHorizontally = true;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d']) {
        player.x += player.speed;
        player.facingDirection = 'right';
        movedHorizontally = true;
    }

    // Update player image based on state
    updatePlayerImage();

    // Keep player within canvas bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

    // Game logic will go here (e.g., collision detection)
    checkCollisions();
}

function checkCollisions() {
    // Check collision with factory
    if (rectCollision(player, factory)) {
        if (!player.hasMedicine) {
            player.hasMedicine = true;
            console.log("Picked up medicine!");
            // updatePlayerImage() is already called in the main update loop,
            // so the image will change automatically.
        }
    }

    // Collision with islands for delivery will be added later
    islands.forEach(island => {
        if (rectCollision(player, island)) {
            if (player.hasMedicine) {
                player.hasMedicine = false;
                console.log(`Delivered medicine to ${island.imageKey}!`);
                // The score will be updated here later.
                // updatePlayerImage() is already called in the main update loop,
                // so the image will change automatically back to empty.
            }
        }
    });
}

function rectCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    drawBackground();
    drawFactory();
    drawIslands();
    drawPlayer();

    // Player and dogs will be drawn here later
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initial check in case images are already cached and loaded quickly
if (imagesLoaded === totalImages && totalImages > 0) {
    console.log("Images were already cached. Starting game.");
    gameLoop();
} else if (totalImages === 0) {
    console.error("No images to load.");
} 