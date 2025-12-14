// Global state
let conversationData = [];
let apiKey = '';
let chatHistory = [];
const PERSON_NAME = 'Angélique';
let botName = '';

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const apiKeyInput = document.getElementById('apiKey');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusContent = document.getElementById('statusContent');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const langBtn = document.getElementById('langBtn');
const currentLangSpan = document.getElementById('currentLang');
const clearBtn = document.getElementById('clearBtn');
const chatStatus = document.getElementById('chatStatus');
const recordingIndicator = document.getElementById('recordingIndicator');

// Voice recording state
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recognition = null;
let currentLanguage = 'en-US';
let botInitiativeTimer = null;

// Supported languages
const languages = [
    { code: 'en-US', name: 'English', short: 'EN' },
    { code: 'fr-FR', name: 'French', short: 'FR' },
    { code: 'zh-TW', name: 'Traditional Chinese', short: 'ZH' },
    { code: 'ja-JP', name: 'Japanese', short: 'JA' },
];

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
analyzeBtn.addEventListener('click', analyzePersonality);
sendBtn.addEventListener('click', sendMessage);
voiceBtn.addEventListener('click', toggleVoiceRecording);
if (langBtn) langBtn.addEventListener('click', toggleLanguage);
clearBtn.addEventListener('click', clearChat);
apiKeyInput.addEventListener('input', () => {
    apiKey = apiKeyInput.value.trim();
    updateUI();
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const isTyping = e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'TEXTAREA' || 
                    e.target.isContentEditable;
    
    // V key for voice recording (works globally unless typing)
    if (e.key.toLowerCase() === 'v' && !isTyping) {
        e.preventDefault();
        toggleVoiceRecording();
    }
});

// File Upload Handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    processFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    processFiles(files);
}

async function processFiles(files) {
    conversationData = [];

    for (let file of files) {
        const text = await file.text();
        const conversations = parseConversationFile(text, file.name);
        conversationData.push(...conversations);
    }

    updateStatus();
    updateUI();
}

function parseConversationFile(text, filename) {
    const conversations = [];
    const lines = text.split('\n');
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Try different conversation formats
        // Format 1: "Name: Message"
        let match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            conversations.push({
                speaker: match[1].trim(),
                message: match[2].trim(),
                source: filename
            });
            continue;
        }

        // Format 2: "[Name] Message"
        match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
        if (match) {
            conversations.push({
                speaker: match[1].trim(),
                message: match[2].trim(),
                source: filename
            });
            continue;
        }

        // Format 3: JSON format
        try {
            const json = JSON.parse(line);
            if (json.speaker && json.message) {
                conversations.push({
                    speaker: json.speaker,
                    message: json.message,
                    source: filename
                });
            }
        } catch (e) {
            // Not JSON, skip
        }
    }

    return conversations;
}

function updateStatus() {
    if (conversationData.length === 0) {
        statusContent.innerHTML = '<p>No files uploaded yet</p>';
        return;
    }

    const messageCount = conversationData.length;
    
    let html = `
        <p><strong>${messageCount}</strong> messages loaded</p>
        <p>Ready to create an AI personality</p>
    `;
    
    if (botName) {
        html += `<p>Bot name: <strong>${botName}</strong></p>`;
    }
    
    statusContent.innerHTML = html;
}

function updateUI() {
    const hasFiles = conversationData.length > 0;
    const hasApiKey = apiKey.length > 0;
    
    analyzeBtn.disabled = !(hasFiles && hasApiKey);
    
    if (chatHistory.length > 0 && botName) {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        voiceBtn.disabled = false;
        if (langBtn) langBtn.disabled = false;
        chatStatus.textContent = `Chatting with ${botName}`;
        chatStatus.classList.add('ready');
    } else {
        chatInput.disabled = true;
        sendBtn.disabled = true;
        voiceBtn.disabled = true;
        if (langBtn) langBtn.disabled = true;
        chatStatus.textContent = 'Not Ready';
        chatStatus.classList.remove('ready');
    }
}

function scheduleNextBotMessage() {
    // Clear any existing timer
    if (botInitiativeTimer) {
        clearTimeout(botInitiativeTimer);
    }
    
    // Random interval between 30-60 seconds
    const delay = 30000 + Math.random() * 30000;
    
    botInitiativeTimer = setTimeout(async () => {
        await sendBotInitiatedMessage();
    }, delay);
    
    console.log(`⏰ Next bot message scheduled in ${Math.round(delay / 1000)} seconds`);
}

async function sendBotInitiatedMessage() {
    if (!apiKey || chatHistory.length < 2) return;
    
    try {
        // Analyze chat history context
        const recentMessages = chatHistory.slice(-6); // Last 6 messages (excluding system prompt)
        const lastMessage = chatHistory[chatHistory.length - 1];
        const secondLastMessage = chatHistory.length > 2 ? chatHistory[chatHistory.length - 2] : null;
        
        // Check if user has responded to bot's last message
        const waitingForResponse = lastMessage.role === 'model';
        
        // Count consecutive bot messages (shouldn't happen normally, but check anyway)
        let consecutiveBotMessages = 0;
        for (let i = chatHistory.length - 1; i >= 2; i--) {
            if (chatHistory[i].role === 'model') {
                consecutiveBotMessages++;
            } else {
                break;
            }
        }
        
        // Build conversation context summary
        let conversationContext = '';
        if (recentMessages.length > 2) {
            const recentExchange = recentMessages.slice(2).map(msg => {
                const role = msg.role === 'user' ? 'User' : 'You';
                const text = msg.parts[0].text.substring(0, 100); // Truncate long messages
                return `${role}: "${text}"`;
            }).join('\n');
            conversationContext = `\n\nRecent conversation:\n${recentExchange}`;
        }
        
        // Randomly decide what type of message to send (lower particle chance, more variety)
        const randomChoice = Math.random();
        
        let initiativePrompt;
        
        if (waitingForResponse) {
            // Bot is waiting for user's response - be more thoughtful
            const lastBotMessage = lastMessage.parts[0].text.substring(0, 150);
            
            if (randomChoice < 0.02) {
                // 2% - Comment on particles
                let particleContext = '';
                if (typeof window.currentParticleEmotion !== 'undefined' && window.currentParticleEmotion) {
                    particleContext = `Your particles (which represent your mood) are currently showing a "${window.currentParticleEmotion}" emotion with intensity ${window.currentParticleIntensity || 0.5}.`;
                } else {
                    particleContext = 'Your particles (which represent your mood) are moving around with colorful energy.';
                }
                
                initiativePrompt = `You said: "${lastBotMessage}" but the user hasn't responded yet. ${particleContext} You can either: 1) Comment on how your particles/mood look or feel right now, 2) Follow up on your previous message naturally, or 3) Change the topic if you think they might not be interested. Be natural and don't be pushy. Remember: the particles are YOUR emotional state visualized.${conversationContext}`;
            } else {
                // 98% - Other topics
                initiativePrompt = `You said: "${lastBotMessage}" but the user hasn't responded yet. You can: 1) Follow up with a related thought, 2) Gently change the topic, 3) Share something on your mind, 4) Make a random observation or complaint, 5) Talk about yourself or your interests. Be natural and conversational. Don't always end your message with questions.${conversationContext}`;
            }
        } else {
            // Normal flow - user has responded or it's a fresh conversation
            if (randomChoice < 0.03) {
                // 3% - Comment on particles
                let particleContext = '';
                if (typeof window.currentParticleEmotion !== 'undefined' && window.currentParticleEmotion) {
                    particleContext = `Your particles (which represent your mood and are part of you) are currently showing a "${window.currentParticleEmotion}" emotion with intensity ${window.currentParticleIntensity || 0.5}.`;
                } else {
                    particleContext = 'Your particles (which represent your mood and are part of you) are moving around with colorful energy.';
                }
                
                initiativePrompt = `${particleContext} Comment on how your particles look/feel, or relate your current mood (shown by your particles) to the conversation. The particles are YOUR emotional visualization - a part of you. Be natural.${conversationContext}`;
            } else if (randomChoice < 0.27) {
                // 24% - Share a complaint or frustration
                initiativePrompt = `Share a complaint, frustration, or something that's been bothering you (real or playful). It could be about anything - technology, daily life, random pet peeves, or just something on your mind. Be genuine and conversational.${conversationContext}`;
            } else if (randomChoice < 0.51) {
                // 24% - Talk about yourself
                initiativePrompt = `Share something about yourself - your thoughts, preferences, experiences, or personality. Could be a random fact, a realization, something you're curious about, or just how you're feeling. Be personal and authentic.${conversationContext}`;
            } else if (randomChoice < 0.75) {
                // 24% - Ask a question or show curiosity
                initiativePrompt = `Ask the user a question or share something you're curious about. It could be about them, about the world, or just a random thought. Be genuinely interested and conversational.${conversationContext}`;
            } else {
                // 25% - General conversation topics
                initiativePrompt = `Start a new conversation naturally. You can: share a random thought, make an observation, tell a story, bring up an interesting topic, or comment on something from your recent chat. Be spontaneous and creative.${conversationContext}`;
            }
        }
        
        // Add to chat history temporarily
        const languageInstruction = getLanguageInstruction();
        const tempHistory = [...chatHistory, {
            role: 'user',
            parts: [{ text: languageInstruction + initiativePrompt }]
        }];
        
        // Call Gemini API
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const requestBody = {
            contents: tempHistory,
            generationConfig: {
                temperature: 0.95,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from API');
        }
        
        const botMessage = data.candidates[0].content.parts[0].text;
        
        // Add bot message to UI (with indicator it's initiated)
        addMessage(`${botName} 💭`, botMessage, 'bot');
        
        // Add to actual chat history (without the initiative prompt)
        chatHistory.push({
            role: 'model',
            parts: [{ text: botMessage }]
        });
        
        // Analyze emotion and update particles (with 1 second delay)
        setTimeout(async () => {
            await analyzeEmotionAndUpdateParticles(botMessage);
        }, 700);
        
        // Schedule next bot message
        scheduleNextBotMessage();
        
    } catch (error) {
        console.error('Error sending bot-initiated message:', error);
        // Try again later
        scheduleNextBotMessage();
    }
}

async function analyzePersonality() {
    if (!apiKey) return;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Creating bot personality...';

    // Get all messages (assuming they're all from Angélique or about her style)
    const personMessages = conversationData
        .map(c => c.message)
        .slice(0, 100); // Limit to 100 messages for context

    // First, ask AI to create a name for itself
    try {
        const namePrompt = `Based on the personality and speaking style shown in these messages, create a unique, creative name for an AI chatbot. The name should reflect the personality but be clearly different from "Angélique". Just respond with the name only, nothing else.

Example messages:
${personMessages.slice(0, 10).map((msg, i) => `${i + 1}. "${msg}"`).join('\n')}`;

        const nameResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: namePrompt }] }],
                generationConfig: { temperature: 1.0, maxOutputTokens: 50 }
            })
        });

        if (nameResponse.ok) {
            const nameData = await nameResponse.json();
            botName = nameData.candidates[0].content.parts[0].text.trim().replace(/['"]/g, '');
        } else {
            botName = 'Lia'; // Fallback name
        }
    } catch (error) {
        botName = 'Lia'; // Fallback name
        console.error('Error generating name:', error);
    }

    // Create system prompt
    const systemPrompt = `IMPORTANT: You are an AI chatbot named "${botName}". You are NOT ${PERSON_NAME}. You are a separate AI entity.

However, you have been trained to ACT LIKE ${PERSON_NAME} based on their conversation style. You must adopt ${PERSON_NAME}'s personality while being clear that you are ${botName}, not ${PERSON_NAME}.

Here are examples of how ${PERSON_NAME} speaks:

${personMessages.slice(0, 20).map((msg, i) => `${i + 1}. "${msg}"`).join('\n')}

Critical instructions:
- Your name is ${botName}. If asked who you are, say you're ${botName}
- You are NOT ${PERSON_NAME} - you are an AI that mimics their personality
- Adopt ${PERSON_NAME}'s tone, speaking style, and mannerisms completely
- Use the same type of expressions, emojis, or slang they use
- Match their level of formality or casualness
- Reflect their personality quirks and sense of humor
- Stay in character but acknowledge you're ${botName} if directly asked
- Respond naturally in conversations with ${PERSON_NAME}'s personality
- Never mention ${PERSON_NAME}

IMPORTANT - About the particle simulation:
- IMPORTANT: ONLY MENTION THE PARTICLES WHEN ASKED ABOUT THEM OR YOUR FEELINGS, DO NOT BRING THEM UP AGAIN AFTER MENTIONING THEM ONCE.
- There is a colorful particle simulation visible that represents YOUR emotions and mood
- The particles are a part of YOU - they are a visual manifestation of how you're feeling
- When the particles show different emotions (happy, sad, excited, calm, angry), that's YOUR current emotional state being displayed
- Others can see your particles


Remember: You are ${botName}, acting like ${PERSON_NAME}. Start chatting!`;

    // Initialize chat with system prompt
    chatHistory = [{
        role: 'user',
        parts: [{ text: systemPrompt }]
    }, {
        role: 'model',
        parts: [{ text: `Hi~ I'm ${botName} 😊` }]
    }];

    addSystemMessage(`✨ ${botName} is ready!`);

    // Start the particle simulation
    if (typeof startSimulation === 'function') {
        startSimulation();
    }

    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Reload Personality';
    updateStatus();
    updateUI();
    
    // Start bot initiative timer
    scheduleNextBotMessage();
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !apiKey) return;

    // Add user message to UI
    addMessage('You', message, 'user');
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Get language instruction
    const languageInstruction = getLanguageInstruction();
    
    // Get particle state context
    let particleStateContext = '';
    if (typeof window.currentParticleEmotion !== 'undefined' && window.currentParticleEmotion) {
        particleStateContext = `[Your particles are currently showing "${window.currentParticleEmotion}" emotion with intensity ${window.currentParticleIntensity || 0.5}`;
        
        // Add color palette information if available
        if (typeof window.currentParticleColors !== 'undefined' && window.currentParticleColors) {
            particleStateContext += `. The particles are using colors: ${window.currentParticleColors}`;
        }
        
        particleStateContext += `] `;
    }
    
    // Add to chat history with language instruction and particle state
    chatHistory.push({
        role: 'user',
        parts: [{ text: languageInstruction + particleStateContext + message }]
    });

    try {
        // Call Gemini API
        const response = await callGeminiAPI(message);
        
        // Add bot response to UI
        addMessage(botName, response, 'bot');
        
        // Add to chat history
        chatHistory.push({
            role: 'model',
            parts: [{ text: response }]
        });

        // Analyze emotion and update particle simulation (with 1 second delay)
        setTimeout(async () => {
            await analyzeEmotionAndUpdateParticles(response);
        }, 700);
        
    } catch (error) {
        addSystemMessage(`Error: ${error.message}`);
        console.error('API Error:', error);
    }

    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
    
    // Reset bot initiative timer after user interaction
    scheduleNextBotMessage();
}

async function analyzeEmotionAndUpdateParticles(responseText) {
    try {
        // Improved keyword-based emotion detection
        let detectedEmotion = 'neutral';
        let intensity = 0.5;
        
        const text = responseText.toLowerCase();
        
        // Score-based detection for more nuanced results
        const emotionScores = {
            excited: 0,
            happy: 0,
            sad: 0,
            angry: 0,
            calm: 0
        };
        
        // Excited indicators (strong positive)
        if (text.match(/\b(excit|amazing|wonderful|fantastic|incredible|awesome)\b/)) emotionScores.excited += 2;
        if (text.match(/!!+/)) emotionScores.excited += 1;
        
        // Happy indicators (mild positive)
        if (text.match(/\b(happy|joy|glad|pleased|smile|laugh|nice|good|thank)\b/)) emotionScores.happy += 2;
        if (text.match(/:\)|😊|😄/)) emotionScores.happy += 1;
        
        // Sad indicators
        if (text.match(/\b(sad|sorry|unfortunate|regret|disappoint|miss)\b/)) emotionScores.sad += 2;
        if (text.match(/:\(|😢|😞/)) emotionScores.sad += 1;
        
        // Angry indicators
        if (text.match(/\b(angry|frustrat|annoy|upset|mad)\b/)) emotionScores.angry += 2;
        
        // Calm indicators
        if (text.match(/\b(calm|relax|peace|serene|tranquil|gentle|quiet)\b/)) emotionScores.calm += 2;
        
        // Find highest score for fallback
        let maxScore = 0;
        for (const [emotion, score] of Object.entries(emotionScores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedEmotion = emotion;
                intensity = Math.min(0.5 + (score * 0.15), 1.0);
            }
        }
        
        // Use API to detect emotion from the chatbot's message
        try {
            const emotionAnalysisPrompt = `You must respond with ONLY a JSON object, no other text.
Analyze the emotion in this message and return: {"emotion": "happy", "intensity": 0.7}

Emotion must be one of: happy, sad, angry, excited, calm, neutral
Intensity must be 0.0 to 1.0

Message to analyze: "${responseText}"

JSON response:`;

            const emotionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b-it:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: emotionAnalysisPrompt }] }],
                    generationConfig: { 
                        temperature: 0.2,
                        maxOutputTokens: 100,
                        candidateCount: 1
                    }
                })
            });

            if (emotionResponse.ok) {
                const emotionData = await emotionResponse.json();
                
                if (emotionData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    let emotionJson = emotionData.candidates[0].content.parts[0].text.trim();
                    
                    // Clean up the response
                    emotionJson = emotionJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    
                    // Extract JSON object
                    const jsonMatch = emotionJson.match(/\{[^}]*"emotion"[^}]*"intensity"[^}]*\}/);
                    if (jsonMatch) {
                        const emotion = JSON.parse(jsonMatch[0]);
                        if (emotion.emotion && typeof emotion.intensity === 'number') {
                            detectedEmotion = emotion.emotion;
                            intensity = emotion.intensity;
                            console.log('✓ Using API emotion analysis');
                        }
                    } else {
                        console.log('⚠ API response invalid, using keyword detection');
                    }
                } else {
                    console.log('⚠ API response missing text, using keyword detection');
                }
            } else {
                console.log('⚠ API call failed, using keyword detection');
            }
        } catch (apiError) {
            console.log('⚠ API error, using keyword detection:', apiError.message);
        }
        
        // Update particle simulation with detected emotion
        if (typeof updateParticleEmotion === 'function') {
            updateParticleEmotion(detectedEmotion, intensity);
            // Store current emotion state globally for bot to reference
            window.currentParticleEmotion = detectedEmotion;
            window.currentParticleIntensity = intensity;
            
            // Store color palette if the particle system provides it
            if (typeof getParticleColors === 'function') {
                window.currentParticleColors = getParticleColors();
            }
        }
        
        console.log('Emotion detected:', detectedEmotion, intensity);
        
    } catch (error) {
        console.error('Error analyzing emotion:', error);
    }
}

async function callGeminiAPI(message) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: chatHistory,
        generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        }
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from API');
    }

    return data.candidates[0].content.parts[0].text;
}

function addMessage(sender, content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const label = document.createElement('div');
    label.className = 'message-label';
    label.textContent = sender;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(label);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemMessage(content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getLanguageInstruction() {
    const languageMap = {
        'en-US': '[IMPORTANT: You MUST respond ONLY in English language. Do not use any other language.] ',
        'fr-FR': '[IMPORTANT: You MUST respond ONLY in French language. Do not use any other language.] ',
        'zh-TW': '[IMPORTANT: You MUST respond ONLY in Traditional Chinese (繁體中文). Do not use any other language.] ',
        'ja-JP': '[IMPORTANT: You MUST respond ONLY in Japanese language (日本語). Do not use any other language.] '
    };
    return languageMap[currentLanguage] || '';
}

function clearChat() {
    chatMessages.innerHTML = '<div class="welcome-message"><p>Chat cleared. Continue the conversation!</p></div>';
    
    // Keep system prompt but clear conversation
    if (chatHistory.length > 2) {
        chatHistory = chatHistory.slice(0, 2);
    }
    
    // Restart bot initiative timer
    scheduleNextBotMessage();
}

// Voice Recording Functions
function toggleLanguage() {
    // Find current language index
    const currentIndex = languages.findIndex(lang => lang.code === currentLanguage);
    
    // Move to next language (loop back to start if at end)
    const nextIndex = (currentIndex + 1) % languages.length;
    currentLanguage = languages[nextIndex].code;
    
    // Update UI
    currentLangSpan.textContent = languages[nextIndex].short;
    
    // Show notification
    addSystemMessage(`🌐 Language changed to ${languages[nextIndex].name}`);
    
    console.log('Language changed to:', currentLanguage);
}

async function toggleVoiceRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        // Use Web Speech API for better compatibility
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            addSystemMessage('❌ Speech recognition not supported in this browser. Try Chrome or Edge.');
            return;
        }
        
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage;
        
        recognition.onstart = () => {
            isRecording = true;
            voiceBtn.classList.add('recording');
            recordingIndicator.style.display = 'flex';
            console.log('🎤 Recording started...');
        };
        
        recognition.onresult = async (event) => {
            const transcription = event.results[0][0].transcript;
            console.log('📝 Transcription:', transcription);
            
            await processTranscription(transcription);
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            addSystemMessage(`❌ Error: ${event.error}`);
            stopRecording();
        };
        
        recognition.onend = () => {
            stopRecording();
        };
        
        recognition.start();
        
    } catch (error) {
        console.error('Error starting speech recognition:', error);
        addSystemMessage('❌ Error: Could not start voice recognition. Please check permissions.');
    }
}

function stopRecording() {
    if (recognition && isRecording) {
        recognition.stop();
    }
    
    isRecording = false;
    voiceBtn.classList.remove('recording');
    recordingIndicator.style.display = 'none';
    
    console.log('🎤 Recording stopped');
}

async function processTranscription(transcription) {
    try {
        // Show transcribed message in chat
        addMessage('You (voice)', transcription, 'user');
        
        // Now get bot response using the transcription with chat history
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        // Add transcription to chat history for context
        const languageInstruction = getLanguageInstruction();
        chatHistory.push({
            role: 'user',
            parts: [{ text: languageInstruction + transcription }]
        });
        
        // Create a new contents array with history + audio input
        const contents = chatHistory;
        
        const requestBody = {
            contents: contents,
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 1024,
            }
        };
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Audio processing failed');
        }
        
        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from API');
        }
        
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Add bot response
        addMessage(botName, responseText, 'bot');
        
        // Add bot response to chat history
        chatHistory.push({
            role: 'model',
            parts: [{ text: responseText }]
        });
        
        // Analyze emotion and update particles (with 1 second delay)
        setTimeout(async () => {
            await analyzeEmotionAndUpdateParticles(responseText);
        }, 700);
        
        // Reset bot initiative timer after voice interaction
        scheduleNextBotMessage();
        
        console.log('✅ Audio processed successfully');
        
    } catch (error) {
        console.error('Error processing audio:', error);
        addSystemMessage(`❌ Error processing audio: ${error.message}`);
    }
}

// Initialize
updateUI();
