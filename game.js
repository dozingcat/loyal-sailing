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

const NUM_ISLANDS = 4;
const MIN_DIST_ISLAND_FACTORY_PADDING = 600; // Min space between factory and island edges
const MIN_DIST_ISLAND_ISLAND_PADDING = 600;  // Min space between island edges
const MIN_DIST_WORLD_EDGE = 150;            // Min space from island to world edge

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
        initializeIslands();
        initializeDogsOnIslands();
        // Initialize pirate position after islands are placed
        if (islands.length > 0) {
            pirate.x = islands[0].x + islands[0].width / 2 - pirate.width / 2; // Start at the first island
            pirate.y = islands[0].y - pirate.height - 30; // Slightly above the first island
        } else {
            // Fallback if no islands, place off-screen (should not happen with NUM_ISLANDS > 0)
            pirate.x = -200;
            pirate.y = -200;
        }
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

const islands = []; // Initialize as empty, will be populated

function initializeIslands() {
    islands.length = 0; // Clear for potential re-initialization
    const islandWidth = 360;
    const islandHeight = 360;
    const islandImageKeys = ['island1', 'island2', 'island3', 'island4']; // Assuming 4 unique island images

    for (let i = 0; i < NUM_ISLANDS; i++) {
        let placed = false;
        let attempts = 0;
        const MAX_PLACEMENT_ATTEMPTS = 100;

        while (!placed && attempts < MAX_PLACEMENT_ATTEMPTS) {
            attempts++;
            // Ensure potential island is within world boundaries minus padding and its own size
            const newX = MIN_DIST_WORLD_EDGE + Math.random() * (worldWidth - islandWidth - 2 * MIN_DIST_WORLD_EDGE);
            const newY = MIN_DIST_WORLD_EDGE + Math.random() * (worldHeight - islandHeight - 2 * MIN_DIST_WORLD_EDGE);

            const potentialIsland = {
                x: newX,
                y: newY,
                width: islandWidth,
                height: islandHeight,
                imageKey: islandImageKeys[i % islandImageKeys.length], // Cycle through images if NUM_ISLANDS > 4
                dogs: []
            };

            let isValidPosition = true;

            // Check against factory (using padded factory for collision)
            const paddedFactory = {
                x: factory.x - MIN_DIST_ISLAND_FACTORY_PADDING,
                y: factory.y - MIN_DIST_ISLAND_FACTORY_PADDING,
                width: factory.width + 2 * MIN_DIST_ISLAND_FACTORY_PADDING,
                height: factory.height + 2 * MIN_DIST_ISLAND_FACTORY_PADDING
            };
            if (rectCollision(potentialIsland, paddedFactory)) {
                isValidPosition = false;
            }

            // Check against other already placed islands (using padded existing islands)
            if (isValidPosition) {
                for (const placedIsland of islands) {
                    const paddedPlacedIsland = {
                        x: placedIsland.x - MIN_DIST_ISLAND_ISLAND_PADDING,
                        y: placedIsland.y - MIN_DIST_ISLAND_ISLAND_PADDING,
                        width: placedIsland.width + 2 * MIN_DIST_ISLAND_ISLAND_PADDING,
                        height: placedIsland.height + 2 * MIN_DIST_ISLAND_ISLAND_PADDING
                    };
                    if (rectCollision(potentialIsland, paddedPlacedIsland)) {
                        isValidPosition = false;
                        break;
                    }
                }
            }

            if (isValidPosition) {
                islands.push(potentialIsland);
                placed = true;
            }
        }

        if (!placed) {
            console.warn(`Island ${i + 1} (image: ${potentialIsland.imageKey}) could not be placed after ${MAX_PLACEMENT_ATTEMPTS} attempts due to spacing constraints.`);
            // Fallback: place it somewhere less ideal or skip. For now, just log and it won't be added.
        }
    }
    console.log("Islands initialized at random positions:", JSON.parse(JSON.stringify(islands)));
}

function initializeDogsOnIslands() {
    islands.forEach(island => {
        // Ensure island.dogs is an empty array before populating
        island.dogs = []; 
        const availableDogTypes = [...dogTypes]; // dogTypes should be [1,2,3,4]
        
        for (let i = 0; i < 2; i++) { // Add two dogs to each island
            if (availableDogTypes.length === 0) break; 

            const randomIndex = Math.floor(Math.random() * availableDogTypes.length);
            const dogType = availableDogTypes.splice(randomIndex, 1)[0];

            // Position dogs side-by-side on the island
            // dogImageWidth and dogImageHeight are global constants (e.g., 112.5)
            const xOffset = (island.width / 2) - dogImageWidth + (i * (dogImageWidth + 20)); // 20px spacing
            const yOffset = (island.height / 2) - (dogImageHeight / 2);

            island.dogs.push({
                type: dogType,
                state: 'asleep',
                // Calculate absolute world coordinates for the dog
                x: island.x + xOffset,
                y: island.y + yOffset,
                width: dogImageWidth, 
                height: dogImageHeight, 
                currentImageKey: `dog${dogType}Asleep`
            });
        }
    });
    // console.log("Initialized dogs on islands:", islands.map(i => ({islandKey: i.imageKey, dogs: i.dogs}))); // More detailed log
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
    x: 0, // Will be set near the first island initially
    y: 0,
    width: 120,
    height: 120,
    speed: 5, // Slightly reduced speed for patrolling, can be increased when chasing if desired
    facingDirection: 'right',
    currentImageKey: 'pirateRight',
    isActive: true, // Pirate is always active (patrolling or chasing)
    patrolTargetIndex: 0, // Start by targeting the first island
    isChasing: false, // New flag to distinguish between patrolling and chasing
    isDepartingIsland: false, // New flag for departure maneuver
    departureTargetX: 0,    // Target X for departure
    departureTargetY: 0,    // Target Y for departure
};

const PIRATE_DEPARTURE_DISTANCE = 250; // How far pirate moves away from an island after reaching it
const PATROL_ARRIVAL_RADIUS = pirate.width + 100; // How close pirate needs to be to island center for patrol arrival

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

        // Only move if the target is further than a very small threshold to prevent jitter when pointer is on player
        if (distanceToTarget > player.speed / 4) { 
            dx = (diffX / distanceToTarget) * player.speed;
            dy = (diffY / distanceToTarget) * player.speed;

            if (Math.abs(dx) > 0.1) {
                 player.facingDirection = dx > 0 ? 'right' : 'left';
            }
        } else {
            // If the pointer is very close to or on the player, don't set dx/dy, effectively stopping
            // but isMovingToTarget remains true until pointerup.
            dx = 0;
            dy = 0;
        }
        // NO automatic stopping: player.isMovingToTarget is only set to false on pointer up/out/cancel or keyboard override.

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
    if (!pirate.isActive || islands.length === 0) return;

    // Determine mode: Chasing, Departing, or Patrolling
    if (player.hasMedicine) {
        pirate.isChasing = true;
        pirate.isDepartingIsland = false; // Chasing overrides departure
    } else {
        pirate.isChasing = false;
    }

    let targetCenterX, targetCenterY; // These will be the center of what the pirate aims for
    let currentPirateSpeed = pirate.speed;
    const pirateCurrentCenterX = pirate.x + pirate.width / 2;
    const pirateCurrentCenterY = pirate.y + pirate.height / 2;

    if (pirate.isChasing) {
        targetCenterX = player.x + player.width / 2;
        targetCenterY = player.y + player.height / 2;
    } else if (pirate.isDepartingIsland) {
        targetCenterX = pirate.departureTargetX; // This was already set as a center point
        targetCenterY = pirate.departureTargetY;

        const dxToDeparture = targetCenterX - pirateCurrentCenterX;
        const dyToDeparture = targetCenterY - pirateCurrentCenterY;
        const distanceToDeparture = Math.sqrt(dxToDeparture * dxToDeparture + dyToDeparture * dyToDeparture);

        if (distanceToDeparture < currentPirateSpeed) { // Reached departure point
            pirate.isDepartingIsland = false;
            pirate.patrolTargetIndex = (pirate.patrolTargetIndex + 1) % islands.length;
            // Fall through to patrol mode in the next frame or immediately set next patrol target for this frame if not chasing
            if (!pirate.isChasing) { // Should always be true here, but good check
                const nextPatrolIsland = islands[pirate.patrolTargetIndex];
                targetCenterX = nextPatrolIsland.x + nextPatrolIsland.width / 2;
                targetCenterY = nextPatrolIsland.y + nextPatrolIsland.height / 2;
            }
        }
    } else { // Patrolling (and not chasing, not departing)
        const currentPatrolIsland = islands[pirate.patrolTargetIndex];
        targetCenterX = currentPatrolIsland.x + currentPatrolIsland.width / 2;
        targetCenterY = currentPatrolIsland.y + currentPatrolIsland.height / 2;

        const dxToPatrol = targetCenterX - pirateCurrentCenterX;
        const dyToPatrol = targetCenterY - pirateCurrentCenterY;
        const distanceToPatrol = Math.sqrt(dxToPatrol * dxToPatrol + dyToPatrol * dyToPatrol);

        if (distanceToPatrol < PATROL_ARRIVAL_RADIUS) { // Changed condition to use PATROL_ARRIVAL_RADIUS
            pirate.isDepartingIsland = true;

            // Calculate departure target: move away from currentPatrolIsland center
            const dirFromIslandX = pirateCurrentCenterX - targetCenterX; // Vector from island center to pirate center
            const dirFromIslandY = pirateCurrentCenterY - targetCenterY;
            const magDirFromIsland = Math.sqrt(dirFromIslandX * dirFromIslandX + dirFromIslandY * dirFromIslandY);

            let normDirX = dirFromIslandX / (magDirFromIsland || 1); // Avoid NaN if magnitude is 0
            let normDirY = dirFromIslandY / (magDirFromIsland || 1);

            if (magDirFromIsland < 0.1) { // If pirate is (almost) on island center, pick a random direction
                const randomAngle = Math.random() * 2 * Math.PI;
                normDirX = Math.cos(randomAngle);
                normDirY = Math.sin(randomAngle);
            }
            
            pirate.departureTargetX = pirateCurrentCenterX + normDirX * PIRATE_DEPARTURE_DISTANCE;
            pirate.departureTargetY = pirateCurrentCenterY + normDirY * PIRATE_DEPARTURE_DISTANCE;
            
            // For this frame, aim for the newly set departure target
            targetCenterX = pirate.departureTargetX;
            targetCenterY = pirate.departureTargetY;
        }
    }

    // Calculate delta for pirate's top-left to reach the target (whose center is targetCenterX/Y)
    const targetTopLeftX = targetCenterX - pirate.width / 2;
    const targetTopLeftY = targetCenterY - pirate.height / 2;

    const dx = targetTopLeftX - pirate.x;
    const dy = targetTopLeftY - pirate.y;
    const distanceToFinalTarget = Math.sqrt(dx * dx + dy * dy);

    let moveDx = 0;
    let moveDy = 0;

    if (distanceToFinalTarget > currentPirateSpeed / 4) {
        moveDx = (dx / distanceToFinalTarget) * currentPirateSpeed;
        moveDy = (dy / distanceToFinalTarget) * currentPirateSpeed;
    }

    // Check horizontal collision
    if (moveDx !== 0) {
        const potentialPirateX = { x: pirate.x + moveDx, y: pirate.y, width: pirate.width, height: pirate.height };
        if (!isCollidingWithObstacles(potentialPirateX)) {
            pirate.x += moveDx;
        }
    }
    // Check vertical collision
    if (moveDy !== 0) {
        const potentialPirateY = { x: pirate.x, y: pirate.y + moveDy, width: pirate.width, height: pirate.height };
        if (!isCollidingWithObstacles(potentialPirateY)) {
            pirate.y += moveDy;
        }
    }

    // Update facing direction based on intended movement vector (dx, dy towards targetTopLeft)
    // even if blocked, it faces where it wants to go.
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) { // Check if there was any intended movement
        if (Math.abs(dx) > Math.abs(dy) * 0.5) { // Prioritize horizontal facing if significant horizontal movement
            pirate.facingDirection = dx > 0 ? 'right' : 'left';
        } else if (Math.abs(dy) < 0.1 && Math.abs(dx) < 0.1) {
            // No significant movement, keep current direction or default
        } else {
            // Primarily vertical movement, but dx might still determine side if not perfectly vertical
            // This part can be tricky. For now, if dx is very small, it will keep previous direction
            // or we can decide a default. Let's stick to dx based primarily.
             if (Math.abs(dx) > 0.1) pirate.facingDirection = dx > 0 ? 'right' : 'left';
        }
    }
    
    updatePirateImage();
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
    if (pirate.isActive && rectCollision(player, pirate)) { // Removed !pirate.isReturning, using pirate.isChasing implicitly
        if (player.hasMedicine) {
            player.hasMedicine = false;
            console.log("The pirate stole your medicine!");
            pirate.isChasing = false; // Pirate stops chasing and resumes patrol
            // updatePlayerImage() in main update() will handle player ship image change
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

function handlePointerMove(event) {
    if (!player.isMovingToTarget) return; // Only act if mouse/touch is already down
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    let moveX, moveY;

    if (event.touches) {
        moveX = event.touches[0].clientX - rect.left;
        moveY = event.touches[0].clientY - rect.top;
    } else {
        moveX = event.clientX - rect.left;
        moveY = event.clientY - rect.top;
    }

    player.targetX = (moveX / zoomLevel) + camera.x;
    player.targetY = (moveY / zoomLevel) + camera.y;
}

canvas.addEventListener('mousemove', handlePointerMove);
canvas.addEventListener('touchmove', handlePointerMove, { passive: false });

function handlePointerUp(event) {
    // No preventDefault here as it might interfere with other UI if we add it (e.g. buttons outside canvas)
    if (player.isMovingToTarget) {
        player.isMovingToTarget = false;
    }
}

canvas.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('mouseout', handlePointerUp); // Stop if mouse leaves canvas while pressed
canvas.addEventListener('touchend', handlePointerUp);
canvas.addEventListener('touchcancel', handlePointerUp);

// Initial check in case images are already cached and loaded quickly
if (imagesLoaded === totalImages && totalImages > 0) {
    console.log("Images were already cached. Starting game.");
    initializeIslands();
    initializeDogsOnIslands();
    if (islands.length > 0) {
        pirate.x = islands[0].x + islands[0].width / 2 - pirate.width / 2;
        pirate.y = islands[0].y - pirate.height - 30;
    } else {
        pirate.x = -200;
        pirate.y = -200;
    }
    gameLoop();
} else if (totalImages === 0) {
    console.error("No images to load.");
} 