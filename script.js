let playerName = '';
let selectedCharacter = '';
let score = 0;
let platformsHit = 0;
let currentQuestionIndex = 0;
let timer;
let questions = [
    {
        question: 'What is the capital city of Pakistan？',
        options: ['Lahore', 'Islamabad'],
        correctAnswer: 1
    },
    {
        question: 'What is the official language of Pakistan?',
        options: ['English', 'Urdu'],
        correctAnswer: 1
    },
    {
        question: 'Which colors are used on Pakistan National Flag？',
        options: ['Green and White', 'Red and Blue'],
        correctAnswer: 0
    },
    {
        question: 'What is the national sport of Pakistan?',
        options: ['Baseball', 'Hockey'],
        correctAnswer: 1
    },
    {
        question: 'When is Pakistan Day celebrated?',
        options: ['August 14th', 'March 23rd'],
        correctAnswer: 1
    }
];
let firstRowHits = 0;
let secondRowHits = 0;
let usedQuestions = [];
const collisionSound = document.getElementById('collision-sound');
let isJumping = false;
let isOnPlatform = false;
let currentPlatform = null;
let triggeredCombinations = []; // 用于记录已经触发过题目的箱子组合
let isQuestionActive = false; // 用于标记是否有问题正在处理
let questionBoxPositions = [];
const MAX_PLATFORM_HITS = 20; // 设定最大平台触碰次数
const backgroundMusic = document.getElementById('background-music');
const celebrateVideo = document.getElementById('celebrate-video');

// 页面加载完成后播放背景音乐
window.addEventListener('load', function () {
    backgroundMusic.play().catch(error => {
        console.error('播放背景音乐失败:', error);
    });
});

function selectCharacter(character) {
    playerName = document.getElementById('name-input').value;
    if (playerName === '') {
        alert('请输入你的姓名');
        return;
    }
    selectedCharacter = character;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';

    // 进入游戏页面后背景音乐从头播放
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(error => {
        console.error('重新播放背景音乐失败:', error);
    });

    setupQuestionPositions();
    setupPlatforms();
    setupCharacter();
}

function setupQuestionPositions() {
    const platformCounts = [2, 3, 4, 3, 3, 2, 4, 3];
    const allPositions = [];
    let currentIndex = 0;
    // 每个箱子组合的起始位置
    const groupStarts = [];
    for (let i = 0; i < platformCounts.length; i++) {
        groupStarts.push(currentIndex);
        for (let j = 0; j < platformCounts[i]; j++) {
            allPositions.push(currentIndex++);
        }
    }

    // 排除第一排最后侧的箱子位置
    const lastBoxIndex = groupStarts[4] + platformCounts[4] - 1;
    const availablePositions = allPositions.filter(pos => pos!== lastBoxIndex);

    // 随机选择箱子组合来放置问题
    const shuffledGroupIndices = Array.from({ length: availablePositions.length }, (_, i) => i);
    // 打乱箱子组合索引顺序
    for (let i = shuffledGroupIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledGroupIndices[i], shuffledGroupIndices[j]] = [shuffledGroupIndices[j], shuffledGroupIndices[i]];
    }

    // 从打乱后的组合中选取前 5 个来放置问题
    const selectedGroups = shuffledGroupIndices.slice(0, questions.length);
    questionBoxPositions = selectedGroups.map(groupIndex => availablePositions[groupIndex]).sort((a, b) => a - b);
}

function setupPlatforms() {
    const platformCounts = [2, 3, 4, 3, 3, 2, 4, 3];
    const platformsDiv = document.getElementById('platforms');
    let x = 50;
    let y = 500;
    let row = 0;
    for (let i = 0; i < platformCounts.length; i++) {
        if (i === 5) {
            y = 350;
            x = 150;
        }
        for (let j = 0; j < platformCounts[i]; j++) {
            const platform = document.createElement('div');
            platform.classList.add('platform');
            platform.style.left = x + 'px';
            platform.style.top = y + 'px';
            platformsDiv.appendChild(platform);
            x += 50;
        }
        x += 70;
    }
}

function setupCharacter() {
    const character = document.getElementById('character');
    if (selectedCharacter === 'boy') {
        character.style.backgroundImage = 'url("boy-run.png")';
    } else {
        character.style.backgroundImage = 'url("girl-run.png")';
    }
    document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft') {
            moveCharacter(-10);
        } else if (event.key === 'ArrowRight') {
            moveCharacter(10);
        } else if (event.key === ' ' && !isJumping) {
            jumpCharacter();
        }
    });
}

function moveCharacter(dx) {
    const character = document.getElementById('character');
    let left = parseInt(character.style.left) || 0;
    left += dx;
    if (left < 0) {
        left = 0;
    }
    if (left > 1000) {
        left = 1000;
    }
    character.style.left = left + 'px';
    checkPlatformCollision();
}

function jumpCharacter() {
    isJumping = true;
    const character = document.getElementById('character');
    let bottom = parseInt(character.style.bottom) || 0;
    let jumpInterval = setInterval(function () {
        if (bottom < 300) {
            bottom += 10;
            character.style.bottom = bottom + 'px';
        } else {
            clearInterval(jumpInterval);
            let fallInterval = setInterval(function () {
                if (bottom > 0) {
                    bottom -= 10;
                    character.style.bottom = bottom + 'px';
                } else {
                    clearInterval(fallInterval);
                    isJumping = false;
                    isOnPlatform = false;
                    currentPlatform = null;
                }
                checkPlatformCollision();
            }, 20);
        }
    }, 20);
}

function checkPlatformCollision() {
    const character = document.getElementById('character');
    const platforms = document.querySelectorAll('.platform');
    let wasOnPlatform = isOnPlatform;
    isOnPlatform = false;
    currentPlatform = null;
    let allPlatformsHit = true;

    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        const characterRect = character.getBoundingClientRect();
        const platformRect = platform.getBoundingClientRect();

        if (
            characterRect.left < platformRect.right &&
            characterRect.right > platformRect.left &&
            characterRect.bottom > platformRect.top &&
            characterRect.top < platformRect.bottom
        ) {
            if (!platform.classList.contains('hit')) {
                platform.classList.add('hit');
                platformsHit++;
                collisionSound.currentTime = 0;
                collisionSound.play();

                const combinationKey = `${platform.style.top}-${Math.floor(parseInt(platform.style.left) / 50)}`;
                if (questionBoxPositions.includes(i) && !triggeredCombinations.includes(combinationKey) && currentQuestionIndex < questions.length && !isQuestionActive) {
                    triggeredCombinations.push(combinationKey);
                    isQuestionActive = true;
                    if (parseInt(platform.style.top) === 500) {
                        firstRowHits++;
                    } else {
                        secondRowHits++;
                    }
                    showQuestion();
                }
            }

            if (characterRect.bottom >= platformRect.top && characterRect.bottom <= platformRect.top + 10) {
                isOnPlatform = true;
                currentPlatform = platform;
                const character = document.getElementById('character');
                character.style.bottom = 500 - parseInt(platform.style.top) + 'px';
            }
        }

        if (!platform.classList.contains('hit')) {
            allPlatformsHit = false;
        }
    }

    // 如果所有箱子都被触发，显示成功页面
    if (allPlatformsHit) {
        showSuccess();
    }

    if (!isOnPlatform && wasOnPlatform) {
        isJumping = false;
    }
}

function showQuestion() {
    if (currentQuestionIndex >= questions.length) {
        return;
    }
    const questionIndex = currentQuestionIndex;
    currentQuestionIndex++;

    const questionScreen = document.getElementById('question-screen');
    const question = document.getElementById('question');
    const optionA = document.getElementById('option-a');
    const optionB = document.getElementById('option-b');
    const timerDiv = document.getElementById('timer');
    question.textContent = questions[questionIndex].question;
    optionA.textContent = 'A) ' + questions[questionIndex].options[0];
    optionB.textContent = 'B) ' + questions[questionIndex].options[1];
    optionA.onclick = function () {
        checkAnswer(0, questionIndex);
    };
    optionB.onclick = function () {
        checkAnswer(1, questionIndex);
    };
    questionScreen.style.display = 'block';
    clearInterval(timer);
    let timeLeft = 10;
    timerDiv.textContent = 'Time Left: ' + timeLeft;
    timer = setInterval(function () {
        timeLeft--;
        timerDiv.textContent = 'Time Left: ' + timeLeft;
        if (timeLeft === 0) {
            clearInterval(timer);
            showFailure();
            isQuestionActive = false;
        }
    }, 1000);
}

function checkAnswer(selectedOption, questionIndex) {
    clearInterval(timer);
    const questionScreen = document.getElementById('question-screen');
    questionScreen.style.display = 'none';
    if (selectedOption === questions[questionIndex].correctAnswer) {
        score += 10;
        document.getElementById('score').textContent = 'Score: ' + score;
        if (score === 50) {
            showSuccess();
        }
    } else {
        showFailure();
    }
    isQuestionActive = false;
}

function showSuccess() {
    const endScreen = document.getElementById('end-screen');
    const video = celebrateVideo;
    const congratsMessage = document.getElementById('congrats-message');
    const tryAgainMessage = document.getElementById('try-again-message');
    const backgroundMusic = document.getElementById('background-music');
    if (selectedCharacter === 'boy') {
        video.src = 'boy-celebrate.mp4';
    } else {
        video.src = 'girl-celebrate.mp4';
    }
    congratsMessage.textContent = playerName + ' wishes Pakistan prosperity and success!';
    tryAgainMessage.style.display = 'none';
    endScreen.style.display = 'block';

    // 停止背景音乐
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;

    // 播放庆祝视频声音
    video.muted = false;
    video.play().catch(error => {
        console.error('播放庆祝视频声音失败:', error);
    });
}

function showFailure() {
    const endScreen = document.getElementById('end-screen');
    const animation = document.getElementById('animation');
    const tryAgainMessage = document.getElementById('try-again-message');
    animation.innerHTML = '<img src="failure.png" width="200" height="200" alt="failure">';
    tryAgainMessage.style.display = 'block';
    endScreen.style.display = 'block';
    backgroundMusic.pause();
}

function endGame() {
    if (score === 50 || (platformsHit === 20 && score < 50)) {
        showSuccess();
    } else {
        showFailure();
    }
}

function restartGame() {
    score = 0;
    platformsHit = 0;
    currentQuestionIndex = 0;
    firstRowHits = 0;
    secondRowHits = 0;
    usedQuestions = [];
    triggeredCombinations = [];
    isQuestionActive = false;
    questionBoxPositions = [];
    const platforms = document.querySelectorAll('.platform');
    platforms.forEach(platform => {
        platform.classList.remove('hit');
        platform.style.backgroundImage = 'url("box.png")';
    });
    document.getElementById('score').textContent = '得分: 0';
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('platforms').innerHTML = '';
    setupQuestionPositions();
    setupPlatforms();
    const character = document.getElementById('character');
    character.style.left = '0px';
    character.style.bottom = '0px';
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(error => {
        console.error('重新播放背景音乐失败:', error);
    });
    // 停止并重置庆祝视频
    celebrateVideo.pause();
    celebrateVideo.currentTime = 0;
    celebrateVideo.muted = true;
}
    