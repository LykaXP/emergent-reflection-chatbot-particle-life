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
        // Create overlay (always visible in fullscreen)
        const overlay = document.createElement('div');
        overlay.id = 'fullscreenChatOverlay';
        overlay.className = 'fullscreen-chat-overlay';
        overlay.innerHTML = `
            <div class="chat-messages" id="fsChatMessages">
                <div class="welcome-message">
                    <p>💬 Chat in fullscreen mode!</p>
                </div>
            </div>
            <div class="chat-input-container">
                <textarea class="fs-chat-input" id="fsChatInput" placeholder="Type your message..." rows="2" disabled></textarea>
                <button id="fsVoiceBtn" class="voice-btn" disabled title="Voice input (V)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </button>
                <button id="fsSendBtn" disabled>Send</button>
            </div>
            <div id="fsRecordingIndicator" class="recording-indicator" style="display: none;">
                <span class="recording-dot"></span>
                <span>Recording... (Press V or click to stop)</span>
            </div>
        `;
        
        // Create separate system messages container
        const systemContainer = document.createElement('div');
        systemContainer.id = 'fullscreenSystemMessages';
        
        // Create separate bot messages container
        const botContainer = document.createElement('div');
        botContainer.id = 'fullscreenBotMessages';
        
        wrapper.appendChild(overlay);
        wrapper.appendChild(systemContainer);
        wrapper.appendChild(botContainer);
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
    const fullscreenChatOverlay = document.getElementById('fullscreenChatOverlay');
    const fsChatInput = document.getElementById('fsChatInput');
    const fsSendBtn = document.getElementById('fsSendBtn');
    const fsVoiceBtn = document.getElementById('fsVoiceBtn');
    
    fsSendBtn.addEventListener('click', () => sendFullscreenMessage());
    fsChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendFullscreenMessage();
        }
    });
    
    // Voice button handler - delegates to main voice button
    if (fsVoiceBtn) {
        fsVoiceBtn.addEventListener('click', () => {
            const mainVoiceBtn = document.getElementById('voiceBtn');
            if (mainVoiceBtn && !mainVoiceBtn.disabled) {
                mainVoiceBtn.click();
            }
        });
    }
    
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
    
    if (document.fullscreenElement) {
        // Entered fullscreen - show chat overlay
        console.log('Entered fullscreen mode');
        if (overlay) {
            overlay.classList.add('visible');
            syncChatMessages();
        }
    } else {
        // Exited fullscreen - hide chat overlay and message containers
        console.log('Exited fullscreen mode');
        if (overlay) overlay.classList.remove('visible');
        
        const systemContainer = document.getElementById('fullscreenSystemMessages');
        const botContainer = document.getElementById('fullscreenBotMessages');
        
        if (systemContainer) systemContainer.classList.remove('visible');
        if (botContainer) botContainer.classList.remove('visible');
    }
});



function syncFullscreenChatStatus() {
    // Sync input states between main and fullscreen chat
    const mainStatus = document.getElementById('chatStatus');
    const mainInput = document.getElementById('chatInput');
    const fsInput = document.getElementById('fsChatInput');
    const fsSendBtn = document.getElementById('fsSendBtn');
    const fsVoiceBtn = document.getElementById('fsVoiceBtn');
    
    if (mainStatus) {
        // Create observer to watch for status changes
        const observer = new MutationObserver(() => {
            // Sync input states
            if (fsInput && mainInput) {
                fsInput.disabled = mainInput.disabled;
            }
            if (fsSendBtn && document.getElementById('sendBtn')) {
                fsSendBtn.disabled = document.getElementById('sendBtn').disabled;
            }
            if (fsVoiceBtn && document.getElementById('voiceBtn')) {
                fsVoiceBtn.disabled = document.getElementById('voiceBtn').disabled;
            }
        });
        
        observer.observe(mainStatus, { 
            childList: true, 
            characterData: true, 
            subtree: true,
            attributes: true 
        });
        
        // Initial sync
        if (fsInput && mainInput) {
            fsInput.disabled = mainInput.disabled;
        }
        if (fsSendBtn && document.getElementById('sendBtn')) {
            fsSendBtn.disabled = document.getElementById('sendBtn').disabled;
        }
        if (fsVoiceBtn && document.getElementById('voiceBtn')) {
            fsVoiceBtn.disabled = document.getElementById('voiceBtn').disabled;
        }
    }
    
    // Also sync the voice button recording state
    const mainVoiceBtn = document.getElementById('voiceBtn');
    if (mainVoiceBtn && fsVoiceBtn) {
        const voiceObserver = new MutationObserver(() => {
            if (mainVoiceBtn.classList.contains('recording')) {
                fsVoiceBtn.classList.add('recording');
            } else {
                fsVoiceBtn.classList.remove('recording');
            }
            syncRecordingIndicator();
        });
        
        voiceObserver.observe(mainVoiceBtn, { 
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Initial state
        if (mainVoiceBtn.classList.contains('recording')) {
            fsVoiceBtn.classList.add('recording');
        }
    }
}

function syncRecordingIndicator() {
    const mainIndicator = document.getElementById('recordingIndicator');
    const fsIndicator = document.getElementById('fsRecordingIndicator');
    
    if (mainIndicator && fsIndicator) {
        // Sync display state
        if (mainIndicator.style.display !== 'none') {
            fsIndicator.style.display = 'flex';
        } else {
            fsIndicator.style.display = 'none';
        }
    }
}

function syncChatMessages() {
    // Copy messages from main chat to fullscreen chat
    const mainMessages = document.getElementById('chatMessages');
    const fsMessages = document.getElementById('fsChatMessages');
    const systemContainer = document.getElementById('fullscreenSystemMessages');
    const botContainer = document.getElementById('fullscreenBotMessages');
    
    if (mainMessages && fsMessages) {
        // Clone the main messages
        const clone = mainMessages.cloneNode(true);
        
        // Extract system messages and move them to separate container
        const systemMessages = clone.querySelectorAll('.message.system');
        
        if (systemContainer && systemMessages.length > 0) {
            // Only show the latest (last) system message
            systemContainer.innerHTML = '';
            systemContainer.classList.add('visible');
            
            const lastSystemMsg = systemMessages[systemMessages.length - 1];
            const content = lastSystemMsg.querySelector('.message-content');
            if (content) {
                const systemDiv = document.createElement('div');
                systemDiv.className = 'system-message';
                systemDiv.textContent = content.textContent;
                systemContainer.appendChild(systemDiv);
            }
            
            // Remove all system messages from clone
            systemMessages.forEach(sysMsg => sysMsg.remove());
        }
        
        // Extract bot messages and move them to center container
        const botMessages = clone.querySelectorAll('.message.bot');
        
        if (botContainer && botMessages.length > 0) {
            const lastBotMsg = botMessages[botMessages.length - 1];
            const content = lastBotMsg.querySelector('.message-content');
            
            // Only update if content has changed
            if (content) {
                const currentBotMsg = botContainer.querySelector('.bot-message');
                const newContent = content.textContent;
                
                if (!currentBotMsg || currentBotMsg.textContent !== newContent) {
                    // Only update when there's a new or different message
                    botContainer.innerHTML = '';
                    botContainer.classList.add('visible');
                    
                    const botDiv = document.createElement('div');
                    botDiv.className = 'bot-message';
                    botContainer.appendChild(botDiv);
                    
                    // Type out the message word by word
                    typeMessage(botDiv, newContent);
                }
            }
            
            // Remove all bot messages from clone
            botMessages.forEach(botMsg => botMsg.remove());
        }
        
        // Copy remaining messages (user only)
        fsMessages.innerHTML = clone.innerHTML;
        // Scroll to bottom
        fsMessages.scrollTop = fsMessages.scrollHeight;
    }
}

function typeMessage(element, text) {
    // Split text into words
    const words = text.split(' ');
    let currentIndex = 0;
    
    // Clear any existing content
    element.textContent = '';
    
    function typeNextWord() {
        if (currentIndex < words.length) {
            const word = words[currentIndex];
            element.textContent += (currentIndex > 0 ? ' ' : '') + word;
            currentIndex++;
            
            // Calculate natural delay based on word length and punctuation
            let delay = 60 + Math.random() * 40; // Base: 60-100ms
            
            // Longer words take slightly more time
            delay += word.length * 8;
            
            // Add pauses after punctuation
            if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
                delay += 300; // Pause after sentence
            } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
                delay += 150; // Shorter pause after clause
            }
            
            setTimeout(typeNextWord, delay);
        }
    }
    
    typeNextWord();
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
