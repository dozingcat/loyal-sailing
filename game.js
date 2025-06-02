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
    shipFullRight: 'assets/ship-full-right.png',
    dog1Asleep: 'assets/dog-1-asleep.png',
    dog1Awake: 'assets/dog-1-awake.png',
    dog2Asleep: 'assets/dog-2-asleep.png',
    dog2Awake: 'assets/dog-2-awake.png',
    dog3Asleep: 'assets/dog-3-asleep.png',
    dog3Awake: 'assets/dog-3-awake.png',
    dog4Asleep: 'assets/dog-4-asleep.png',
    dog4Awake: 'assets/dog-4-awake.png'
};

const dogTypes = [1, 2, 3, 4];
const dogImageWidth = 60; // Approximate for layout, will use actual image dimensions for drawing
const dogImageHeight = 60;

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
    x: canvas.width / 2 - 150, // Scaled: (canvas.width / 2 - 100) * 1.5 -> canvas.width / 2 - 150
    y: canvas.height / 2 - 150, // Scaled: (canvas.height / 2 - 100) * 1.5 -> canvas.height / 2 - 150
    width: 300, // Scaled: 200 * 1.5
    height: 300 // Scaled: 200 * 1.5
};

const islands = [
    { x: 300, y: 300, width: 240, height: 240, imageKey: 'island1', dogs: [] },
    { x: 1800, y: 450, width: 240, height: 240, imageKey: 'island2', dogs: [] },
    { x: 450, y: 1200, width: 240, height: 240, imageKey: 'island3', dogs: [] },
    { x: 1650, y: 1350, width: 240, height: 240, imageKey: 'island4', dogs: [] }
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
    x: canvas.width / 2 - 75, // Start near the factory
    y: factory.y + factory.height + 50, // Start below the factory
    width: 150, // Player ship size (adjust as needed)
    height: 150,
    speed: 8, // Player movement speed
    hasMedicine: false,
    facingDirection: 'right', // 'left' or 'right'
    currentImageKey: 'shipEmptyRight' // Initial image
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

function drawDogs() {
    islands.forEach(island => {
        island.dogs.forEach(dog => {
            if (images[dog.currentImageKey] && images[dog.currentImageKey].complete && images[dog.currentImageKey].naturalHeight !== 0) {
                // Use the dog's stored width and height, which were based on constants.
                // Or, for more accuracy, use images[dog.currentImageKey].naturalWidth/Height
                // For now, let's use a fixed size or the one set during initialization.
                // The dog x,y are already absolute positions.
                ctx.drawImage(images[dog.currentImageKey], dog.x, dog.y, dog.width, dog.height);
            } else {
                console.warn(`Dog image ${dog.currentImageKey} not ready to draw or is broken.`);
            }
        });
    });
}

function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial'; // Increased font size for 2400x1800 canvas
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 50, 70); // Adjusted position for larger canvas
}

function update() {
    // Player movement
    let dx = 0;
    let dy = 0;

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
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    drawBackground();
    drawFactory();
    drawIslands();
    drawPlayer();
    drawDogs();
    drawScore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Initial check in case images are already cached and loaded quickly
if (imagesLoaded === totalImages && totalImages > 0) {
    console.log("Images were already cached. Starting game.");
    initializeDogsOnIslands();
    gameLoop();
} else if (totalImages === 0) {
    console.error("No images to load.");
} 