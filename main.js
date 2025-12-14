// Configuration
const numTypes = 6;
let colorStep = 360 / numTypes;
const numParticles = 500;
const canvasWidth = 1150;
const canvasHeight = 600;

// Global variables
let canvas, ctx;
let swarm = [];
let forces = [];
let minDistances = [];
let radii = [];
let isPaused = false;
let animationId;
let simulationStarted = false;
let angryResetInterval = null;

// Emotion state
let currentEmotion = { emotion: 'calm', intensity: 0.5 };
let emotionColorPalette = [];
let emotionFrictionModifier = 1.0;
let emotionForceModifier = 1.0;

// Initialize
function setup() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Create fullscreen chat elements and append to wrapper
    const wrapper = document.getElementById('fullscreenWrapper');
    if (wrapper) {
        // Create toggle button
        const toggle = document.createElement('button');
        toggle.id = 'fullscreenChatToggle';
        toggle.className = 'fullscreen-chat-toggle';
        toggle.title = 'Toggle Chat (C)';
        toggle.textContent = '💬';
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'fullscreenChatOverlay';
        overlay.className = 'fullscreen-chat-overlay';
        overlay.innerHTML = `
            <div class="chat-header">
                <h2>Chat</h2>
                <div class="chat-status" id="fsChatStatus">Not Ready</div>
            </div>
            <div class="chat-messages" id="fsChatMessages">
                <div class="welcome-message">
                    <p>💬 Chat in fullscreen mode!</p>
                </div>
            </div>
            <div class="chat-input-container">
                <textarea class="fs-chat-input" id="fsChatInput" placeholder="Type your message..." rows="2" disabled></textarea>
                <button id="fsSendBtn" disabled>Send</button>
            </div>
        `;
        
        wrapper.appendChild(toggle);
        wrapper.appendChild(overlay);
    }

    // Create particles
    for (let i = 0; i < numParticles; i++) {
        swarm.push(new Particle(canvasWidth, canvasHeight, numTypes));
    }

    // Initialize matrices
    forces = Array(numTypes).fill(0).map(() => Array(numTypes).fill(0));
    minDistances = Array(numTypes).fill(0).map(() => Array(numTypes).fill(0));
    radii = Array(numTypes).fill(0).map(() => Array(numTypes).fill(0));

    setParameters();

    // Set default emotion to calm
    updateParticleEmotion('neutral', 1.0);

    // Event listeners
    document.getElementById('randomize').addEventListener('click', setParameters);
    document.getElementById('pause').addEventListener('click', togglePause);
    document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);
    
    // Fullscreen chat handlers
    const fullscreenChatToggle = document.getElementById('fullscreenChatToggle');
    const fullscreenChatOverlay = document.getElementById('fullscreenChatOverlay');
    const fsChatInput = document.getElementById('fsChatInput');
    const fsSendBtn = document.getElementById('fsSendBtn');
    
    fullscreenChatToggle.addEventListener('click', toggleFullscreenChat);
    fsSendBtn.addEventListener('click', () => sendFullscreenMessage());
    fsChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendFullscreenMessage();
        }
    });
    
    // Sync chat status
    syncFullscreenChatStatus();
    
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in input fields or textareas
        const isTyping = e.target.tagName === 'INPUT' || 
                        e.target.tagName === 'TEXTAREA' || 
                        e.target.isContentEditable;
        
        if (isTyping) {
            return; // Ignore keyboard shortcuts when typing
        }
        
        if (e.key.toLowerCase() === 'r') {
            setParameters();
        } else if (e.key === ' ') {
            e.preventDefault();
            togglePause();
        } else if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            toggleFullscreen();
        } else if (e.key.toLowerCase() === 'c' && document.fullscreenElement) {
            e.preventDefault();
            toggleFullscreenChat();
        }
    });
}

// Function to start the simulation
function startSimulation() {
    if (!simulationStarted) {
        simulationStarted = true;
        draw();
        console.log('🎬 Particle simulation started!');
    }
}

function draw() {
    if (!isPaused) {
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Update and display particles
        for (let p of swarm) {
            p.update(swarm, forces, minDistances, radii, emotionForceModifier, emotionFrictionModifier);
            p.display(ctx, emotionColorPalette);
        }
    }

    animationId = requestAnimationFrame(draw);
}

function setParameters() {
    for (let i = 0; i < numTypes; i++) {
        for (let j = 0; j < numTypes; j++) {
            forces[i][j] = Math.random() * (1.0 - 0.3) + 0.3;
            if (Math.random() < 0.5) {
                forces[i][j] *= -1;
            }
            minDistances[i][j] = Math.random() * (50 - 30) + 30;
            radii[i][j] = Math.random() * (250 - 70) + 70;
        }
    }
    printParameters();
}

function printParameters() {
    console.log('\n=== Parameters Updated ===');
    console.log('Number of types:', numTypes);
    console.log('Number of particles:', numParticles);
    console.log('K (force multiplier):', K);
    console.log('Friction:', friction);
    
    console.log('\nForces matrix:');
    for (let i = 0; i < numTypes; i++) {
        console.log(`Type ${i}:`, forces[i].map(f => f.toFixed(2)).join(' '));
    }
    
    console.log('\nMinimum distances matrix:');
    for (let i = 0; i < numTypes; i++) {
        console.log(`Type ${i}:`, minDistances[i].map(d => d.toFixed(1)).join(' '));
    }
    
    console.log('\nRadii matrix:');
    for (let i = 0; i < numTypes; i++) {
        console.log(`Type ${i}:`, radii[i].map(r => r.toFixed(1)).join(' '));
    }
    
    console.log('========================\n');
}

function togglePause() {
    isPaused = !isPaused;
    const button = document.getElementById('pause');
    button.textContent = isPaused ? 'Resume (Space)' : 'Pause (Space)';
}

function toggleFullscreen() {
    const wrapper = document.getElementById('fullscreenWrapper');
    if (!document.fullscreenElement) {
        if (wrapper) {
            wrapper.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
    } else {
        document.exitFullscreen();
    }
}

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', () => {
    const overlay = document.getElementById('fullscreenChatOverlay');
    const toggle = document.getElementById('fullscreenChatToggle');
    
    if (document.fullscreenElement) {
        // Entered fullscreen - show chat overlay
        console.log('Entered fullscreen mode');
        if (overlay) {
            overlay.classList.add('visible');
            syncChatMessages();
        }
        if (toggle) {
            toggle.classList.add('active');
        }
    } else {
        // Exited fullscreen - hide chat overlay
        console.log('Exited fullscreen mode');
        if (overlay) overlay.classList.remove('visible');
        if (toggle) toggle.classList.remove('active');
    }
});

function toggleFullscreenChat() {
    const overlay = document.getElementById('fullscreenChatOverlay');
    const toggle = document.getElementById('fullscreenChatToggle');
    
    if (overlay && toggle) {
        overlay.classList.toggle('visible');
        toggle.classList.toggle('active');
        
        // Sync messages from main chat
        if (overlay.classList.contains('visible')) {
            syncChatMessages();
        }
    }
}

function syncFullscreenChatStatus() {
    // Sync chat status between main and fullscreen chat
    const mainStatus = document.getElementById('chatStatus');
    const fsStatus = document.getElementById('fsChatStatus');
    const mainInput = document.getElementById('chatInput');
    const fsInput = document.getElementById('fsChatInput');
    const fsSendBtn = document.getElementById('fsSendBtn');
    
    if (mainStatus && fsStatus) {
        // Create observer to watch for status changes
        const observer = new MutationObserver(() => {
            fsStatus.textContent = mainStatus.textContent;
            fsStatus.className = mainStatus.className;
            
            // Sync input states
            if (fsInput && mainInput) {
                fsInput.disabled = mainInput.disabled;
            }
            if (fsSendBtn && document.getElementById('sendBtn')) {
                fsSendBtn.disabled = document.getElementById('sendBtn').disabled;
            }
        });
        
        observer.observe(mainStatus, { 
            childList: true, 
            characterData: true, 
            subtree: true,
            attributes: true 
        });
        
        // Initial sync
        fsStatus.textContent = mainStatus.textContent;
        fsStatus.className = mainStatus.className;
    }
}

function syncChatMessages() {
    // Copy messages from main chat to fullscreen chat
    const mainMessages = document.getElementById('chatMessages');
    const fsMessages = document.getElementById('fsChatMessages');
    
    if (mainMessages && fsMessages) {
        fsMessages.innerHTML = mainMessages.innerHTML;
        // Scroll to bottom
        fsMessages.scrollTop = fsMessages.scrollHeight;
    }
}

function sendFullscreenMessage() {
    const fsInput = document.getElementById('fsChatInput');
    const mainInput = document.getElementById('chatInput');
    const mainSendBtn = document.getElementById('sendBtn');
    
    if (fsInput && mainInput && fsInput.value.trim()) {
        // Copy message to main chat input and trigger send
        mainInput.value = fsInput.value;
        fsInput.value = '';
        
        // Trigger the main send button click
        if (mainSendBtn && !mainSendBtn.disabled) {
            mainSendBtn.click();
            
            // Wait a bit then sync messages
            setTimeout(() => {
                syncChatMessages();
            }, 100);
        }
    }
}

// Emotion-based particle control
function updateParticleEmotion(emotion, intensity) {
    currentEmotion = { emotion, intensity };
    
    // Clear any existing angry reset interval
    if (angryResetInterval) {
        clearInterval(angryResetInterval);
        angryResetInterval = null;
    }
    
    // Emotion color palettes - each emotion has multiple nuanced colors
    const emotionPalettes = {
        'happy': [
            '#FFD700',  // Pure vibrant yellow
            '#FFB84D',  // Bright orange
            '#B3D633',  // Lime green
            '#FFE680',  // Light golden
            '#FF9933',  // Deep orange
            '#99AA33'   // Dark yellow-green
        ],
        'excited': [
            '#FF0000',  // Pure bright red
            '#FF4D9E',  // Vibrant hot pink
            '#FF6633',  // Bright orange
            '#B30047',  // Deep magenta
            '#FFB3A3',  // Light coral
            '#CC0066'   // Dark pink
        ],
        'sad': [
            '#0D3D66',  // Deep navy blue
            '#4DB8E6',  // Bright cyan-blue
            '#8C99E6',  // Light periwinkle
            '#1A4D80',  // Dark blue
            '#A3A3E6',  // Pale lavender-blue
            '#1A4DCC'   // Medium royal blue
        ],
        'calm': [
            '#26D9D9',  // Pure bright cyan
            '#4DD9BF',  // Light teal
            '#1A7A80',  // Deep turquoise
            '#80FFEB',  // Very light aqua
            '#0D5966',  // Dark cyan
            '#33BFB3'   // Medium turquoise
        ],
        'angry': [
            '#ffd986ff',  // Deep blood red
            '#ff6200ff',  // Bright orange-red
            '#730000',  // Very dark crimson
            '#F20D0D',  // Medium red
            '#ff772eff',  // Light burnt orange
            '#ff9900ff'   // Dark ruby
        ],
        'neutral': [
            '#B300FF',  // Pure vibrant purple
            '#4D0D73',  // Very dark indigo
            '#E680FF',  // Light magenta
            '#7300CC',  // Deep violet
            '#F2C2FF',  // Pale pink-purple
            '#8C1ACC'   // Medium purple
        ]
    };
    
    // Get the palette for the current emotion
    let basePalette = emotionPalettes[emotion] || emotionPalettes['neutral'];
    
    // Use palette colors directly without intensity modification
    emotionColorPalette = basePalette;
    
    // Emotion behavior mappings
    switch(emotion) {
        case 'happy':
            emotionForceModifier = 2.0 + (intensity * 0.3); // More attraction
            emotionFrictionModifier = 0.9 - (intensity * 0.1); // More movement
            break;
        case 'excited':
            emotionForceModifier = 3.5 + (intensity * 0.5); // Strong forces
            emotionFrictionModifier = 0.7 - (intensity * 0.15); // Very energetic
            break;
        case 'sad':
            emotionForceModifier = 0.7 - (intensity * 0.3); // Weaker forces
            emotionFrictionModifier = 0.95 + (intensity * 0.04); // Slower movement
            break;
        case 'calm':
            emotionForceModifier = 0.85; // Gentle forces
            emotionFrictionModifier = 0.92; // Slow, smooth
            break;
        case 'angry':
            emotionForceModifier = 3.5 + (intensity * 0.5); // Aggressive forces
            emotionFrictionModifier = 0.75 - (intensity * 0.1); // Very fast, chaotic movement
            // Reset parameters every 2 seconds when angry
            angryResetInterval = setInterval(() => {
                setParameters();
                console.log('😡 Angry mode: Parameters reset!');
            }, 2000);
            break;
        case 'neutral':
            emotionForceModifier = 1.0 + (intensity * 0.4 * Math.sin(Date.now() / 200)); // Fluctuating
            emotionFrictionModifier = 0.85 - (intensity * 0.1); // Jittery
            break;
        default:
            emotionForceModifier = 1.0;
            emotionFrictionModifier = 1.0;
    }
    
    console.log(`🎨 Emotion: ${emotion} (${intensity.toFixed(2)}) - Palette: ${emotionColorPalette.length} colors - Force: ${emotionForceModifier.toFixed(2)}x - Friction: ${emotionFrictionModifier.toFixed(2)}x`);
}

// Initialize canvas and particles when page loads, but don't start animation
window.addEventListener('load', setup);
