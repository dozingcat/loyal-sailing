const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true; // Explicitly enable image smoothing
ctx.imageSmoothingQuality = 'high'; // Suggest high quality for image smoothing

// Set canvas dimensions initially (will be updated by resizeCanvas)
canvas.width = 2400;
canvas.height = 1800;

const worldWidth = 4800; // Double the canvas width
const worldHeight = 3600; // Double the canvas height

const zoomLevel = 0.75; // Zoom out by 25% (objects appear 75% of original size on screen)
const renderScaleMultiplier = 2.0; // Render at 2.0x resolution for crispness

const camera = {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    // We can add some dead zone or smoothing later if needed
};

function resizeCanvas() {
    // Set canvas internal resolution to a higher density for crisper rendering
    canvas.width = window.innerWidth * renderScaleMultiplier;
    canvas.height = window.innerHeight * renderScaleMultiplier;

    // Update camera dimensions based on CSS window size and desired on-screen zoomLevel
    // This determines how much of the world is visible.
    camera.width = window.innerWidth / zoomLevel;
    camera.height = window.innerHeight / zoomLevel;

    // No need to enforce aspect ratio or set margins for the canvas element itself,
    // as CSS is handling making it fill the window.
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
    shipFullRight: 'assets/ship-full-right.png',
    dog1Asleep: 'assets/dog-1-asleep.png',
    dog1Awake: 'assets/dog-1-awake.png',
    dog2Asleep: 'assets/dog-2-asleep.png',
    dog2Awake: 'assets/dog-2-awake.png',
    dog3Asleep: 'assets/dog-3-asleep.png',
    dog3Awake: 'assets/dog-3-awake.png',
    dog4Asleep: 'assets/dog-4-asleep.png',
    dog4Awake: 'assets/dog-4-awake.png',
    pirateLeft: 'assets/pirate-left.png',
    pirateRight: 'assets/pirate-right.png'
};

const dogTypes = [1, 2, 3, 4];
const dogImageWidth = 112.5; // Increased from 75 by 50%
const dogImageHeight = 112.5; // Increased from 75 by 50%

let imagesLoaded = 0;
const totalImages = Object.keys(imageSources).length;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        console.log("All images loaded. Starting game.");
        initializeDogsOnIslands();
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
    x: worldWidth / 2 - 150, // Centered in the world
    y: worldHeight / 2 - 150,
    width: 300,
    height: 300
};

const islands = [
    // Spread out in the larger world, now 50% bigger (360x360)
    { x: worldWidth * 0.2 - 180, y: worldHeight * 0.2 - 180, width: 360, height: 360, imageKey: 'island1', dogs: [] }, 
    { x: worldWidth * 0.8 - 180, y: worldHeight * 0.3 - 180, width: 360, height: 360, imageKey: 'island2', dogs: [] }, 
    { x: worldWidth * 0.25 - 180, y: worldHeight * 0.75 - 180, width: 360, height: 360, imageKey: 'island3', dogs: [] }, 
    { x: worldWidth * 0.7 - 180, y: worldHeight * 0.8 - 180, width: 360, height: 360, imageKey: 'island4', dogs: [] }
];

function initializeDogsOnIslands() {
    islands.forEach(island => {
        const availableDogTypes = [...dogTypes];
        for (let i = 0; i < 2; i++) { // Add two dogs to each island
            if (availableDogTypes.length === 0) break; // Should not happen with 4 types and 2 dogs

            const randomIndex = Math.floor(Math.random() * availableDogTypes.length);
            const dogType = availableDogTypes.splice(randomIndex, 1)[0]; // Pick and remove a random type

            // Position dogs side-by-side on the island
            const xOffset = (island.width / 2) - dogImageWidth + (i * (dogImageWidth + 20)); // 20px spacing
            const yOffset = (island.height / 2) - (dogImageHeight / 2);

            island.dogs.push({
                type: dogType,
                state: 'asleep',
                x: island.x + xOffset,
                y: island.y + yOffset,
                width: dogImageWidth, // Will be replaced by actual image width later if needed
                height: dogImageHeight, // Will be replaced by actual image height later if needed
                currentImageKey: `dog${dogType}Asleep`
            });
        }
    });
    console.log("Initialized dogs on islands:", islands.map(i => i.dogs)); // For debugging
}

const player = {
    x: worldWidth / 2 - 75, // Start near the factory in the world
    y: factory.y + factory.height + 50, 
    width: 150,
    height: 150,
    speed: 8, // Player movement speed
    hasMedicine: false,
    facingDirection: 'right', // 'left' or 'right'
    currentImageKey: 'shipEmptyRight', // Initial image
    targetX: null,
    targetY: null,
    isMovingToTarget: false
};

const pirate = {
    x: -200, // Initial off-screen position
    y: -200,
    width: 120, // Pirate ship size (adjust as needed)
    height: 120,
    speed: 6, // Pirate speed
    facingDirection: 'right',
    currentImageKey: 'pirateRight',
    isActive: false, // Becomes active when player has medicine
    isReturning: false // Flag to indicate pirate is moving off-screen
};

// Add score variable
let score = 0;

const obstacleCollisionPadding = 40; // Allows player to overlap edges by this much

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
    ctx.save();
    const finalScale = zoomLevel * renderScaleMultiplier;

    const bgTileWidthOnScreen = images.background.width * finalScale;
    const bgTileHeightOnScreen = images.background.height * finalScale;

    if (bgTileWidthOnScreen <= 0 || bgTileHeightOnScreen <= 0) {
        ctx.restore();
        return;
    }

    // Calculate the effective camera position on the scaled (high-res) grid
    const effectiveCamX = camera.x * finalScale;
    const effectiveCamY = camera.y * finalScale;

    const offsetX = -(effectiveCamX % bgTileWidthOnScreen);
    const offsetY = -(effectiveCamY % bgTileHeightOnScreen);

    // Number of tiles to draw to fill the canvas (which is now larger internally)
    const numX = Math.ceil(canvas.width / bgTileWidthOnScreen) + 1;
    const numY = Math.ceil(canvas.height / bgTileHeightOnScreen) + 1;

    for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
            if (images.background.complete && images.background.naturalHeight !== 0) {
                ctx.drawImage(
                    images.background, 
                    offsetX + i * bgTileWidthOnScreen, 
                    offsetY + j * bgTileHeightOnScreen, 
                    bgTileWidthOnScreen, 
                    bgTileHeightOnScreen
                );
            } else {
                break; 
            }
        }
    }
    ctx.restore();
}

function drawFactory() {
    if (rectAppearsInCamera(factory)) {
        if (images.factory.complete && images.factory.naturalHeight !== 0) {
            ctx.drawImage(images.factory, factory.x, factory.y, factory.width, factory.height);
        }
    }
}

function drawIslands() {
    islands.forEach(island => {
        if (rectAppearsInCamera(island)) {
            if (images[island.imageKey] && images[island.imageKey].complete && images[island.imageKey].naturalHeight !== 0) {
                ctx.drawImage(images[island.imageKey], island.x, island.y, island.width, island.height);
            }
        }
    });
}

function drawPlayer() {
    // Player is always technically in camera view due to camera following, but check is good practice
    if (rectAppearsInCamera(player)) { 
        if (images[player.currentImageKey] && images[player.currentImageKey].complete && images[player.currentImageKey].naturalHeight !== 0) {
            ctx.drawImage(images[player.currentImageKey], player.x, player.y, player.width, player.height);
        }
    }
}

function drawDogs() {
    islands.forEach(island => {
        // Only process dogs if the island itself might be visible
        if (rectAppearsInCamera(island)) { 
            island.dogs.forEach(dog => {
                // Dog x, y are already world coordinates
                if (rectAppearsInCamera(dog)) {
                    if (images[dog.currentImageKey] && images[dog.currentImageKey].complete && images[dog.currentImageKey].naturalHeight !== 0) {
                        ctx.drawImage(images[dog.currentImageKey], dog.x, dog.y, dog.width, dog.height);
                    }
                }
            });
        }
    });
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial'; // Increased font size for 2400x1800 canvas
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 50, 70); // Adjusted position for larger canvas
}

function updatePirateImage() {
    pirate.currentImageKey = pirate.facingDirection === 'left' ? 'pirateLeft' : 'pirateRight';
}

function drawPirate() {
    if (!pirate.isActive && !pirate.isReturning) return;
    if (rectAppearsInCamera(pirate)) {
        if (images[pirate.currentImageKey] && images[pirate.currentImageKey].complete && images[pirate.currentImageKey].naturalHeight !== 0) {
            ctx.drawImage(images[pirate.currentImageKey], pirate.x, pirate.y, pirate.width, pirate.height);
        }
    }
}

function update() {
    let dx = 0;
    let dy = 0;

    // Check for keyboard input first to see if it overrides touch/click
    let keyboardInputDetected = false;
    if (keysPressed['ArrowUp'] || keysPressed['w'] ||
        keysPressed['ArrowDown'] || keysPressed['s'] ||
        keysPressed['ArrowLeft'] || keysPressed['a'] ||
        keysPressed['ArrowRight'] || keysPressed['d']) {
        keyboardInputDetected = true;
        if (player.isMovingToTarget) {
            player.isMovingToTarget = false; // Keyboard overrides touch/click
        }
    }

    if (player.isMovingToTarget) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const diffX = player.targetX - playerCenterX;
        const diffY = player.targetY - playerCenterY;
        const distanceToTarget = Math.sqrt(diffX * diffX + diffY * diffY);

        if (distanceToTarget < player.speed / 2) { // If very close, stop to prevent overshooting/jitter
            player.isMovingToTarget = false;
            // Optional: Snap player center to targetX, targetY if desired
            // player.x = player.targetX - player.width / 2;
            // player.y = player.targetY - player.height / 2;
        } else {
            dx = (diffX / distanceToTarget) * player.speed;
            dy = (diffY / distanceToTarget) * player.speed;

            // Update facing direction based on movement for touch/click
            if (Math.abs(dx) > 0.1) { // Only change if moving horizontally significantly
                 player.facingDirection = dx > 0 ? 'right' : 'left';
            }
        }
    } else if (keyboardInputDetected) { // Process keyboard movement if no touch/click target or overridden
        if (keysPressed['ArrowUp'] || keysPressed['w']) {
            dy -= player.speed;
        }
        if (keysPressed['ArrowDown'] || keysPressed['s']) {
            dy += player.speed;
        }
        if (keysPressed['ArrowLeft'] || keysPressed['a']) {
            dx -= player.speed;
            player.facingDirection = 'left';
        }
        if (keysPressed['ArrowRight'] || keysPressed['d']) {
            dx += player.speed;
            player.facingDirection = 'right';
        }
    }

    // Check horizontal collision
    if (dx !== 0) {
        const potentialPlayerX = {
            x: player.x + dx,
            y: player.y,
            width: player.width,
            height: player.height
        };
        if (!isCollidingWithObstacles(potentialPlayerX)) {
            player.x += dx;
        }
    }

    // Check vertical collision
    if (dy !== 0) {
        const potentialPlayerY = {
            x: player.x, // Use current x (could have been updated by horizontal move)
            y: player.y + dy,
            width: player.width,
            height: player.height
        };
        if (!isCollidingWithObstacles(potentialPlayerY)) {
            player.y += dy;
        }
    }

    // Update player image based on state
    updatePlayerImage();
    console.log(`Facing: ${player.facingDirection}, Current Image: ${player.currentImageKey}`); // DEBUG LOG

    // Keep player within world bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > worldWidth) player.x = worldWidth - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > worldHeight) player.y = worldHeight - player.height;

    // Game logic will go here (e.g., collision detection)
    checkCollisions();
    updatePirate(); // Call pirate update logic
    updateCamera(); // Call camera update logic

    drawPlayer();
    drawDogs();
    drawScore();
    drawPirate();
}

function updatePirate() {
    if (!player.hasMedicine && pirate.isActive && !pirate.isReturning) {
        // Player lost medicine (not by pirate yet), pirate should return
        pirate.isReturning = true;
    }

    if (pirate.isReturning) {
        // Move towards initial off-screen position (e.g., top-left)
        const returnX = -200;
        const returnY = -200;
        const dx = returnX - pirate.x;
        const dy = returnY - pirate.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < pirate.speed) {
            pirate.x = returnX;
            pirate.y = returnY;
            pirate.isActive = false;
            pirate.isReturning = false;
        } else {
            pirate.x += (dx / distance) * pirate.speed;
            pirate.y += (dy / distance) * pirate.speed;
            if (dx < 0) pirate.facingDirection = 'left';
            else if (dx > 0) pirate.facingDirection = 'right';
        }
    } else if (player.hasMedicine) {
        if (!pirate.isActive) {
            pirate.isActive = true;
            pirate.isReturning = false; // Ensure it is not returning when activated
            const edge = Math.floor(Math.random() * 4);
            // Spawn relative to camera view, then convert to world coordinates
            if (edge === 0) { // Top edge of camera
                pirate.x = camera.x + Math.random() * camera.width;
                pirate.y = camera.y - pirate.height;
            } else if (edge === 1) { // Bottom edge of camera
                pirate.x = camera.x + Math.random() * camera.width;
                pirate.y = camera.y + camera.height;
            } else if (edge === 2) { // Left edge of camera
                pirate.x = camera.x - pirate.width;
                pirate.y = camera.y + Math.random() * camera.height;
            } else { // Right edge of camera
                pirate.x = camera.x + camera.width;
                pirate.y = camera.y + Math.random() * camera.height;
            }
            console.log("Pirate activated at world coords:", pirate.x, pirate.y);
        }

        // Chase player
        const dx = player.x + player.width / 2 - (pirate.x + pirate.width / 2);
        const dy = player.y + player.height / 2 - (pirate.y + pirate.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) { // Avoid division by zero if pirate is on player
            pirate.x += (dx / distance) * pirate.speed;
            pirate.y += (dy / distance) * pirate.speed;

            if (dx < 0) pirate.facingDirection = 'left';
            else if (dx > 0) pirate.facingDirection = 'right';
        }
    } else {
        // If player doesn't have medicine and pirate is not active/returning, do nothing
        // Or could add patrol logic here if desired
    }

    if (pirate.isActive || pirate.isReturning) {
        updatePirateImage();
    }
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
                let medicineDeliveredThisIsland = false;
                island.dogs.forEach(dog => {
                    if (dog.state === 'asleep') {
                        dog.state = 'awake';
                        dog.currentImageKey = `dog${dog.type}Awake`;
                        score += 10; // Add 10 points for each woken dog
                        medicineDeliveredThisIsland = true;
                        console.log(`Dog type ${dog.type} on ${island.imageKey} woke up! Score: ${score}`);
                    }
                });

                if (medicineDeliveredThisIsland) {
                    player.hasMedicine = false; // Only consume medicine if a dog was woken up
                    console.log(`Delivered medicine to ${island.imageKey}!`);
                    // updatePlayerImage() is already called in the main update loop,
                    // so the image will change automatically back to empty.
                }
            }
        }
    });

    // Check collision with pirate
    if (pirate.isActive && !pirate.isReturning && rectCollision(player, pirate)) {
        if (player.hasMedicine) {
            player.hasMedicine = false;
            console.log("The pirate stole your medicine!");
            pirate.isReturning = true; // Pirate retreats after stealing
            // updatePlayerImage() in main update() will handle player ship image change
            // updatePirateImage() in updatePirate() will handle pirate image change if needed
        }
    }
}

function rectCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function isCollidingWithObstacles(rect) {
    // Check collision with the factory
    const effectiveFactoryHitbox = {
        x: factory.x + obstacleCollisionPadding,
        y: factory.y + obstacleCollisionPadding,
        width: Math.max(0, factory.width - 2 * obstacleCollisionPadding), // Ensure width doesn't go negative
        height: Math.max(0, factory.height - 2 * obstacleCollisionPadding) // Ensure height doesn't go negative
    };
    if (rectCollision(rect, effectiveFactoryHitbox)) {
        return true;
    }

    // Check collision with any of the islands
    for (const island of islands) {
        const effectiveIslandHitbox = {
            x: island.x + obstacleCollisionPadding,
            y: island.y + obstacleCollisionPadding,
            width: Math.max(0, island.width - 2 * obstacleCollisionPadding),
            height: Math.max(0, island.height - 2 * obstacleCollisionPadding)
        };
        if (rectCollision(rect, effectiveIslandHitbox)) {
            return true;
        }
    }
    return false;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear visible canvas (now higher res)

    drawBackground(); 

    ctx.save();
    // Apply combined scale for zoom and higher rendering resolution
    const finalScale = zoomLevel * renderScaleMultiplier;
    ctx.scale(finalScale, finalScale);
    ctx.translate(-camera.x, -camera.y);

    drawFactory();
    drawIslands();
    drawPlayer();
    drawDogs();
    drawPirate();

    ctx.restore(); // This restores the scale and translate

    // Draw UI elements (like score) last, so they are on top and not affected by camera or zoom
    drawScore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function updateCamera() {
    // Target camera position to center the player
    let targetX = player.x + player.width / 2 - camera.width / 2;
    let targetY = player.y + player.height / 2 - camera.height / 2;

    // Clamp camera to world boundaries
    camera.x = Math.max(0, Math.min(targetX, worldWidth - camera.width));
    camera.y = Math.max(0, Math.min(targetY, worldHeight - camera.height));
}

// Helper function to check if a rectangle is within camera view
function rectAppearsInCamera(rect) {
    return (
        rect.x < camera.x + camera.width &&
        rect.x + rect.width > camera.x &&
        rect.y < camera.y + camera.height &&
        rect.y + rect.height > camera.y
    );
}

// Event listeners for click/touch steering
function handlePointerDown(event) {
    event.preventDefault(); // Prevent default browser actions (like scrolling on touch)
    const rect = canvas.getBoundingClientRect();
    let clickX, clickY;

    if (event.touches) {
        clickX = event.touches[0].clientX - rect.left;
        clickY = event.touches[0].clientY - rect.top;
    } else {
        clickX = event.clientX - rect.left;
        clickY = event.clientY - rect.top;
    }

    // Convert screen click coordinates to world coordinates
    player.targetX = (clickX / zoomLevel) + camera.x;
    player.targetY = (clickY / zoomLevel) + camera.y;
    player.isMovingToTarget = true;

    // Clear keyboard presses so click/touch takes precedence if both happen
    for (const key in keysPressed) {
        keysPressed[key] = false;
    }
}

canvas.addEventListener('mousedown', handlePointerDown);
canvas.addEventListener('touchstart', handlePointerDown, { passive: false }); // passive:false to allow preventDefault

// Initial check in case images are already cached and loaded quickly
if (imagesLoaded === totalImages && totalImages > 0) {
    console.log("Images were already cached. Starting game.");
    initializeDogsOnIslands();
    gameLoop();
} else if (totalImages === 0) {
    console.error("No images to load.");
} 