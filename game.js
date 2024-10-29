// 游戏配置
const config = {
    cols: 6,
    rows: 10,
    blockSize: 40,
    moveInterval: 500,
    spawnDelay: 800,
    bufferRows: 2,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    initialMoveInterval: 400,
    speedIncreaseThreshold: 50,
    speedIncreaseRate: 0.8,
    minMoveInterval: 100,
    // 添加闪烁动画配置
    flashDuration: 500, // 闪烁动画持续时间（毫秒）
    flashCount: 3,      // 闪烁次数
    rainbowBlockChance: 0.1,   // 10%概率生成彩虹方块
    baseScore: 10,            // 基础分数
    rainbowScore: 5,          // 彩虹方块分数
    superRainbowScore: 20,    // 三个彩虹方块消除的分数
    comboTimeout: 1000,       // 连击判定时间窗口（毫秒）
    comboMultiplier: 0.5      // 连击额外分数倍数（每次连击增加50%）
};

// 添加图片加载相关状态
const blockImages = {
    images: [],
    loaded: false,
    count: 0
};

// 加载图片
function loadBlockImages() {
    return new Promise((resolve, reject) => {
        const imagePaths = [
            './imgs/block1.png',
            './imgs/block2.png',
            './imgs/block3.png',
            './imgs/block4.png',
            './imgs/block5.png',
            './imgs/block6.png',
            './imgs/block7.png'  // 添加彩虹方块图片
        ];

        let loadedCount = 0;
        const totalImages = imagePaths.length;

        imagePaths.forEach((path, index) => {
            const img = new Image();
            img.src = path;
            
            img.onload = () => {
                blockImages.images[index] = img;
                loadedCount++;
                
                if (loadedCount === totalImages) {
                    blockImages.loaded = true;
                    resolve();
                }
            };
            
            img.onerror = (err) => {
                console.error('Error loading image:', path, err);
                reject(new Error(`Failed to load image: ${path}`));
            };
        });
    });
}

// 游戏状态
let gameState = {
    grid: [],
    currentBlock: null,
    score: 0,
    playerName: '',
    isGameOver: false,
    lastMoveTime: 0,
    isBlockMoving: false,
    canSpawnNewBlock: true,  // 是否可以生成新方块
    lastBlockPlacedTime: 0,   // 上一个方块放置的时间
    currentMoveInterval: config.initialMoveInterval, // 当前下落间隔
    lastSpeedIncreaseScore: 0,  // 上次加速时的分数
    // 添加闪烁动画状态
    flashingBlocks: [],
    comboCount: 0,            // 当前连击数
    lastMatchTime: 0,         // 上次消除时间
    isRainbowBlock: false     // 是否是彩虹方块
};

// 初始化游戏
function initGame() {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = config.cols * config.blockSize;
    canvas.height = config.rows * config.blockSize;
    
    // 初始化网格
    for (let i = 0; i < config.rows; i++) {
        gameState.grid[i] = new Array(config.cols).fill(null);
    }
    
    // 初始化速度相关状态
    gameState.currentMoveInterval = config.initialMoveInterval;
    gameState.lastSpeedIncreaseScore = 0;
}

// 开始游戏
function startGame() {
    const playerName = document.getElementById('playerId').value.trim();
    if (!playerName) {
        alert('请输入玩家ID！');
        return;
    }
    
    // 保存玩家名称
    gameState.playerName = playerName;
    document.getElementById('currentPlayer').textContent = playerName;
    
    // 显示加载提示
    const loadingNotice = document.createElement('div');
    loadingNotice.className = 'loading-notice';
    loadingNotice.textContent = '游戏加载中...';
    document.body.appendChild(loadingNotice);
    
    // 加载图片
    loadBlockImages()
        .then(() => {
            //   片加载完成后，移除加载提示
            loadingNotice.remove();
            // 切换界面
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            // 初始化并开始游戏
            initGame();
            spawnNewBlock();
            gameLoop();
        })
        .catch(error => {
            console.error('图片加载失败:', error);
            alert('游戏资源加载失败，请刷新页面重试');
            loadingNotice.remove();
        });
}

// 生成新方块
function spawnNewBlock() {
    if (!gameState.canSpawnNewBlock) return;
    
    let randomX;
    const lastBlock = gameState.currentBlock;
    
    do {
        randomX = Math.floor(Math.random() * config.cols);
    } while (lastBlock && randomX === lastBlock.x);
    
    // 随机决定是否生成彩虹方块
    const isRainbow = Math.random() < config.rainbowBlockChance;
    
    gameState.currentBlock = {
        x: randomX,
        y: -config.bufferRows,
        imageIndex: isRainbow ? -1 : Math.floor(Math.random() * blockImages.images.length), // -1表示彩虹方块
        isRainbow: isRainbow
    };
    
    gameState.isBlockMoving = true;
    gameState.lastMoveTime = Date.now();
    gameState.canSpawnNewBlock = false;
}

// 游戏主循环
function gameLoop() {
    if (gameState.isGameOver) return;
    
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 更新游戏状态
function update() {
    const currentTime = Date.now();
    
    // 如果没有当前方块且可以生成新方块
    if (!gameState.currentBlock && gameState.canSpawnNewBlock) {
        if (currentTime - gameState.lastBlockPlacedTime >= config.spawnDelay) {
            spawnNewBlock();
        }
        return;
    }
    
    if (!gameState.currentBlock || !gameState.isBlockMoving) return;
    
    // 检查是否到达移动时间间隔
    if (currentTime - gameState.lastMoveTime >= gameState.currentMoveInterval) {
        const nextY = Math.floor(gameState.currentBlock.y + 1);
        
        // 检查碰撞
        if (checkCollision(gameState.currentBlock.x, nextY)) {
            // 只有当方块完全进入游戏区域才放置
            if (gameState.currentBlock.y >= 0) {
                placeBlock();
                checkMatches();
                gameState.lastBlockPlacedTime = currentTime;
                gameState.canSpawnNewBlock = true;
            } else {
                // 如果方块在缓冲区就碰撞，游戏结束
                endGame();
                return;
            }
            gameState.currentBlock = null;
            gameState.isBlockMoving = false;
        } else {
            // 移动方块
            gameState.currentBlock.y = nextY;
            gameState.lastMoveTime = currentTime;
        }
    }
}

// 绘制游戏画面
function draw() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格中的方块
    for (let y = 0; y < config.rows; y++) {
        for (let x = 0; x < config.cols; x++) {
            if (gameState.grid[y][x] !== null) {
                // 检查是否是闪烁方块
                const flashingBlock = gameState.flashingBlocks.find(
                    block => block.x === x && block.y === y
                );
                
                if (flashingBlock) {
                    // 计算闪烁效果
                    const elapsed = Date.now() - flashingBlock.startTime;
                    const phase = Math.floor((elapsed / (config.flashDuration / config.flashCount)) % 2);
                    
                    if (phase === 0) {
                        drawBlock(ctx, x, y, flashingBlock.imageIndex);
                    }
                } else {
                    drawBlock(ctx, x, y, gameState.grid[y][x]);
                }
            }
        }
    }
    
    // 绘制当前方块
    if (gameState.currentBlock && gameState.currentBlock.y >= -config.bufferRows) {
        drawBlock(ctx, 
                 gameState.currentBlock.x, 
                 Math.floor(gameState.currentBlock.y), 
                 gameState.currentBlock.imageIndex);
    }
    
    // 绘制顶部边界线
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.stroke();
}

// 绘制单个方块
function drawBlock(ctx, x, y, imageIndex) {
    if (blockImages.loaded) {
        if (imageIndex === -1) {
            // 使用彩虹方块图片（最后一张图片）
            const rainbowImage = blockImages.images[blockImages.images.length - 1];
            ctx.drawImage(rainbowImage, 
                x * config.blockSize, 
                y * config.blockSize, 
                config.blockSize - 1, 
                config.blockSize - 1);
        } else {
            const img = blockImages.images[imageIndex];
            ctx.drawImage(img, 
                x * config.blockSize, 
                y * config.blockSize, 
                config.blockSize - 1, 
                config.blockSize - 1);
        }
    }
}

// 检查碰撞
function checkCollision(x, y) {
    // 检查是否到达底部
    if (y >= config.rows) return true;
    
    // 只有当y坐标大于等于0时才检查与其他方块的碰撞
    if (y >= 0) {
        return gameState.grid[y][x] !== null;
    }
    
    return false;
}

// 放置方块
function placeBlock() {
    const block = gameState.currentBlock;
    const y = Math.floor(block.y);
    // 确保在有效范围内放置方块
    if (y >= 0 && y < config.rows) {
        gameState.grid[y][block.x] = block.imageIndex;
    }
}

// 修改检查三个方块匹配的函数
function checkThreeBlockMatch(block1, block2, block3) {
    // 如果任何一个位置是空的，直接返回false
    if (block1 === null || block2 === null || block3 === null) {
        return false;
    }
    
    // 统计彩虹方块(-1)的数量
    const blocks = [block1, block2, block3];
    const rainbowCount = blocks.filter(block => block === -1).length;
    
    // 根据彩虹方块数量判断匹配条件
    switch (rainbowCount) {
        case 0: // 没有彩虹方块
            // 三个普通方块必须完全相同
            return block1 === block2 && block2 === block3;
            
        case 1: // 一个彩虹方块
            // 获取非彩虹方块
            const normalBlocks = blocks.filter(block => block !== -1);
            // 确保剩余两个普通方块相同
            return normalBlocks.length === 2 && normalBlocks[0] === normalBlocks[1];
            
        case 2: // 两个彩虹方块
            // 只要有一个普通方块就可以匹配
            return blocks.some(block => block !== -1 && block !== null);
            
        case 3: // 三个彩虹方块
            // 特殊情况：三个彩虹方块
            return true;
            
        default:
            return false;
    }
}

// 为了更好地调试，添加日志函数
function logMatch(block1, block2, block3, isMatch) {
    console.log(`匹配检查: [${block1}, ${block2}, ${block3}] => ${isMatch ? '匹配' : '不匹配'}`);
    if (block1 === -1 || block2 === -1 || block3 === -1) {
        console.log('包含彩虹方块');
    }
}

// 添加检查彩虹方块周围匹配的函数
function checkRainbowBlockMatches() {
    let matchFound = false;
    const directions = [
        { dx: [-2, -1, 0], dy: [0, 0, 0] },  // 左向检查
        { dx: [0, 1, 2], dy: [0, 0, 0] },    // 右向检查
        { dx: [0, 0, 0], dy: [-2, -1, 0] },  // 上向检查
        { dx: [0, 0, 0], dy: [0, 1, 2] }     // 下向检查
    ];

    // 遍历所有格子找彩虹方块
    for (let y = 0; y < config.rows; y++) {
        for (let x = 0; x < config.cols; x++) {
            if (gameState.grid[y][x] === -1) { // 找到彩虹方块
                // 检查四个方向
                for (const dir of directions) {
                    const blocks = [];
                    let validCheck = true;

                    // 收集方向上的三个方块
                    for (let i = 0; i < 3; i++) {
                        const checkX = x + dir.dx[i];
                        const checkY = y + dir.dy[i];

                        // 检查坐标是否在有效范围内
                        if (checkX >= 0 && checkX < config.cols && 
                            checkY >= 0 && checkY < config.rows) {
                            blocks.push({
                                x: checkX,
                                y: checkY,
                                value: gameState.grid[checkY][checkX]
                            });
                        } else {
                            validCheck = false;
                            break;
                        }
                    }

                    if (validCheck && checkRainbowMatch(blocks)) {
                        // 将匹配的方块添加到闪烁列表
                        blocks.forEach(block => {
                            if (!gameState.flashingBlocks.some(fb => 
                                fb.x === block.x && fb.y === block.y)) {
                                gameState.flashingBlocks.push({
                                    x: block.x,
                                    y: block.y,
                                    imageIndex: block.value,
                                    startTime: Date.now()
                                });
                            }
                        });
                        matchFound = true;
                    }
                }
            }
        }
    }
    return matchFound;
}

// 检查彩虹方块匹配条件
function checkRainbowMatch(blocks) {
    // 确保有三个方块
    if (blocks.length !== 3) return false;

    // 统计彩虹方块数量
    const rainbowCount = blocks.filter(block => block.value === -1).length;
    
    // 获取普通方块
    const normalBlocks = blocks.filter(block => block.value !== -1 && block.value !== null);

    // 条件1：一个彩虹方块 + 两个相同普通方块
    if (rainbowCount === 1 && normalBlocks.length === 2) {
        return normalBlocks[0].value === normalBlocks[1].value;
    }

    // 条件2：两个彩虹方块 + 一个普通方块
    if (rainbowCount === 2 && normalBlocks.length === 1) {
        return true;
    }

    return false;
}

// 修改检查匹配函数
function checkMatches() {
    let matchFound = false;
    
    // 先检查彩虹方块的特殊匹配
    matchFound = checkRainbowBlockMatches() || matchFound;
    
    // 如果没有彩虹方块匹配，再检查普通匹配
    if (!matchFound) {
        // 检查水平匹配
        for (let y = 0; y < config.rows; y++) {
            for (let x = 0; x < config.cols - 2; x++) {
                if (gameState.grid[y][x] !== null && gameState.grid[y][x] !== -1) {
                    const block1 = gameState.grid[y][x];
                    const block2 = gameState.grid[y][x+1];
                    const block3 = gameState.grid[y][x+2];
                    
                    if (block1 === block2 && block2 === block3) {
                        gameState.flashingBlocks.push(
                            {x: x, y: y, imageIndex: block1, startTime: Date.now()},
                            {x: x+1, y: y, imageIndex: block2, startTime: Date.now()},
                            {x: x+2, y: y, imageIndex: block3, startTime: Date.now()}
                        );
                        matchFound = true;
                    }
                }
            }
        }
        
        // 检查垂直匹配
        for (let y = 0; y < config.rows - 2; y++) {
            for (let x = 0; x < config.cols; x++) {
                if (gameState.grid[y][x] !== null && gameState.grid[y][x] !== -1) {
                    const block1 = gameState.grid[y][x];
                    const block2 = gameState.grid[y+1][x];
                    const block3 = gameState.grid[y+2][x];
                    
                    if (block1 === block2 && block2 === block3) {
                        gameState.flashingBlocks.push(
                            {x: x, y: y, imageIndex: block1, startTime: Date.now()},
                            {x: x, y: y+1, imageIndex: block2, startTime: Date.now()},
                            {x: x, y: y+2, imageIndex: block3, startTime: Date.now()}
                        );
                        matchFound = true;
                    }
                }
            }
        }
    }

    if (matchFound) {
        setTimeout(() => {
            removeMatchedBlocks();
            // 在移除方块后再次检查是否有新的匹配
            setTimeout(() => {
                checkMatches();
            }, 50);
        }, config.flashDuration);
    }
    
    return matchFound;
}

// 添加移除匹配方块的函数
function removeMatchedBlocks() {
    // 移除匹配的方块
    gameState.flashingBlocks.forEach(block => {
        gameState.grid[block.y][block.x] = null;
    });
    
    updateScore();
    gameState.flashingBlocks = [];
    
    // 处理方块下落
    let falling = true;
    while (falling) {
        falling = handleBlocksFalling();
        // 检查下落后是否形成新的匹配
        if (falling) {
            const hasMatches = checkMatches();
            if (hasMatches) {
                // 等待闪烁动画完成后再继续
                return;
            }
        }
    }
}

// 添加处理方块下落的函数
function handleBlocksFalling() {
    let hasFalling = false;
    
    // 从底部往上检查，不包括最上面一行
    for (let y = config.rows - 1; y > 0; y--) {
        for (let x = 0; x < config.cols; x++) {
            // 如果当前位置是空的，检查上面的方块
            if (gameState.grid[y][x] === null) {
                // 找到上方最近的方块
                for (let above = y - 1; above >= 0; above--) {
                    if (gameState.grid[above][x] !== null) {
                        // 移动方块
                        gameState.grid[y][x] = gameState.grid[above][x];
                        gameState.grid[above][x] = null;
                        hasFalling = true;
                        break;
                    }
                }
            }
        }
    }
    
    return hasFalling;
}

// 修改更新分数函数
function updateScore() {
    const currentTime = Date.now();
    let scoreToAdd = config.baseScore; // 默认10分
    
    // 计算消除中彩虹方块的数量
    const rainbowCount = gameState.flashingBlocks.filter(block => block.imageIndex === -1).length;
    
    // 根据彩虹方块数量决定分数
    if (rainbowCount === 3) {
        // 三个彩虹方块特殊消除
        scoreToAdd = config.superRainbowScore; // 20分
        showSuperRainbowEffect();
    } else if (rainbowCount > 0) {
        // 普通彩虹方块消除
        scoreToAdd = config.rainbowScore; // 5分
    }
    
    // 检查连击
    if (currentTime - gameState.lastMatchTime < config.comboTimeout) {
        gameState.comboCount++;
        // 计算连击加成
        scoreToAdd *= (1 + gameState.comboCount * config.comboMultiplier);
    } else {
        gameState.comboCount = 0;
    }
    
    gameState.lastMatchTime = currentTime;
    gameState.score += Math.floor(scoreToAdd);
    
    // 更新显示分数
    document.getElementById('score').textContent = gameState.score;
    
    // 显示连击提示
    if (gameState.comboCount > 0) {
        showComboEffect(gameState.comboCount);
    }
    
    // 检查是否需要加速
    if (gameState.score >= gameState.lastSpeedIncreaseScore + config.speedIncreaseThreshold) {
        increaseSpeed();
    }
}

// 添加显示连击效果的函数
function showComboEffect(comboCount) {
    const comboNotice = document.createElement('div');
    comboNotice.className = 'combo-notice';
    comboNotice.textContent = `${comboCount}连击！ x${(1 + comboCount * config.comboMultiplier).toFixed(1)}`;
    document.getElementById('gameScreen').appendChild(comboNotice);
    
    setTimeout(() => {
        comboNotice.remove();
    }, 1000);
}

// 添加增加速度的函数
function increaseSpeed() {
    // 计算新的移动间隔
    const newInterval = Math.max(
        gameState.currentMoveInterval * config.speedIncreaseRate,
        config.minMoveInterval
    );
    
    // 只有当新间隔大于最小间隔时才更新
    if (newInterval >= config.minMoveInterval) {
        gameState.currentMoveInterval = newInterval;
        gameState.lastSpeedIncreaseScore = gameState.score;
        
        // 可以添加速度提升的视觉或声音提示
        showSpeedIncreaseEffect();
    }
}

// 添加速度提升效果的函数
function showSpeedIncreaseEffect() {
    // 创建一个临时的提示元素
    const speedUpNotice = document.createElement('div');
    speedUpNotice.className = 'speed-up-notice';
    speedUpNotice.textContent = '速度提升！';
    document.getElementById('gameScreen').appendChild(speedUpNotice);
    
    // 2秒后移除提示
    setTimeout(() => {
        speedUpNotice.remove();
    }, 2000);
}

// 检查游戏结束
function checkGameOver() {
    return gameState.grid[0].some(cell => cell !== null);
}

// 结束游戏
function endGame() {
    gameState.isGameOver = true;
    updateLeaderboard();
    showGameOver();
}

// 更新排行榜
function updateLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    leaderboard.push({
        name: gameState.playerName,
        score: gameState.score
    });
    
    // 排序并只保留前10名
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
}

// 显示游戏结束界面
function showGameOver() {
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'block';
    document.getElementById('finalScore').textContent = 
        `最终得分：${gameState.score}`;
    
    // 显示排行榜
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    const leaderboardHtml = leaderboard
        .map((entry, index) => 
            `<div>${index + 1}. ${entry.name}: ${entry.score}分</div>`)
        .join('');
    document.getElementById('leaderboard').innerHTML = leaderboardHtml;
}

// 重新开始游戏
function restartGame() {
    location.reload();
}

// 添加键盘控制
document.addEventListener('keydown', (event) => {
    if (!gameState.currentBlock || !gameState.isBlockMoving || gameState.isGameOver) return;
    
    switch (event.key.toLowerCase()) {
        case 'a': // 左移
            if (gameState.currentBlock.x > 0 && 
                !checkCollision(gameState.currentBlock.x - 1, 
                    Math.floor(gameState.currentBlock.y))) {
                gameState.currentBlock.x--;
            }
            break;
        case 'd': // 右移
            if (gameState.currentBlock.x < config.cols - 1 && 
                !checkCollision(gameState.currentBlock.x + 1, 
                    Math.floor(gameState.currentBlock.y))) {
                gameState.currentBlock.x++;
            }
            break;
        case 's': // 加速下落
            const nextY = Math.floor(gameState.currentBlock.y + 1);
            if (!checkCollision(gameState.currentBlock.x, nextY)) {
                gameState.currentBlock.y = nextY;
                gameState.lastMoveTime = Date.now();
            }
            break;
    }
});

// 添加鼠标控制
document.getElementById('gameCanvas').addEventListener('mousemove', (event) => {
    if (!gameState.currentBlock || gameState.isGameOver) return;
    
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const newX = Math.floor(mouseX / config.blockSize);
    
    if (newX >= 0 && newX < config.cols && 
        !gameState.grid[Math.floor(gameState.currentBlock.y)][newX]) {
        gameState.currentBlock.x = newX;
    }
});

// 初始化触摸控制
function initTouchControls() {
    const canvas = document.getElementById('gameCanvas');
    let touchStartX = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        if (!gameState.currentBlock || !gameState.isBlockMoving) return;
        touchStartX = e.touches[0].clientX;
        e.preventDefault();
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!gameState.currentBlock || !gameState.isBlockMoving) return;
        const touchX = e.touches[0].clientX;
        const diffX = touchX - touchStartX;
        const blockWidth = config.blockSize;
        
        // 计算移动的格子数
        const moveAmount = Math.floor(diffX / blockWidth);
        
        if (moveAmount !== 0) {
            const newX = Math.min(Math.max(0, 
                gameState.currentBlock.x + moveAmount), 
                config.cols - 1);
                
            if (!checkCollision(newX, Math.floor(gameState.currentBlock.y))) {
                gameState.currentBlock.x = newX;
            }
            touchStartX = touchX;
        }
        e.preventDefault();
    });
}

// 添加超级彩虹消除效果的函数
function showSuperRainbowEffect() {
    const superEffect = document.createElement('div');
    superEffect.className = 'super-rainbow-notice';
    superEffect.textContent = '超级消除！+20分';
    document.getElementById('gameScreen').appendChild(superEffect);
    
    // 添加特殊的动画效果
    setTimeout(() => {
        superEffect.remove();
    }, 1500);
}
