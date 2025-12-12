// Global state
let conversationData = [];
let apiKey = '';
let gladiaApiKey = '';
let chatHistory = [];
const PERSON_NAME = 'Angélique';
let botName = '';

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const apiKeyInput = document.getElementById('apiKey');
const gladiaApiKeyInput = document.getElementById('gladiaApiKey');
const analyzeBtn = document.getElementById('analyzeBtn');
const statusContent = document.getElementById('statusContent');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const clearBtn = document.getElementById('clearBtn');
const chatStatus = document.getElementById('chatStatus');
const recordingIndicator = document.getElementById('recordingIndicator');

// Voice recording state
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recognition = null;

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
clearBtn.addEventListener('click', clearChat);
apiKeyInput.addEventListener('input', () => {
    apiKey = apiKeyInput.value.trim();
    updateUI();
});

gladiaApiKeyInput.addEventListener('input', () => {
    gladiaApiKey = gladiaApiKeyInput.value.trim();
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
        chatStatus.textContent = `Chatting with ${botName}`;
        chatStatus.classList.add('ready');
    } else {
        chatInput.disabled = true;
        sendBtn.disabled = true;
        voiceBtn.disabled = true;
        chatStatus.textContent = 'Not Ready';
        chatStatus.classList.remove('ready');
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
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !apiKey) return;

    // Add user message to UI
    addMessage('You', message, 'user');
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    // Add to chat history
    chatHistory.push({
        role: 'user',
        parts: [{ text: message }]
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

        // Analyze emotion and update particle simulation
        await analyzeEmotionAndUpdateParticles(response);
        
    } catch (error) {
        addSystemMessage(`Error: ${error.message}`);
        console.error('API Error:', error);
    }

    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
}

async function analyzeEmotionAndUpdateParticles(responseText) {
    try {
        const emotionPrompt = `Analyze the emotional tone of this message and respond with ONLY a JSON object (no markdown, no extra text) in this exact format:
{"emotion": "happy/sad/angry/excited/calm/neutral", "intensity": 0.0-1.0}

Message: "${responseText}"

Respond with only the JSON object, nothing else.`;

        const emotionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: emotionPrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 100 }
            })
        });

        if (emotionResponse.ok) {
            const emotionData = await emotionResponse.json();
            let emotionJson = emotionData.candidates[0].content.parts[0].text.trim();
            
            // Remove markdown code blocks if present
            emotionJson = emotionJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            const emotion = JSON.parse(emotionJson);
            
            // Update particle simulation based on emotion
            if (typeof updateParticleEmotion === 'function') {
                updateParticleEmotion(emotion.emotion, emotion.intensity);
            }
            
            console.log('Emotion detected:', emotion);
        }
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

function clearChat() {
    chatMessages.innerHTML = '<div class="welcome-message"><p>Chat cleared. Continue the conversation!</p></div>';
    
    // Keep system prompt but clear conversation
    if (chatHistory.length > 2) {
        chatHistory = chatHistory.slice(0, 2);
    }
}

// Voice Recording Functions
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
        recognition.lang = 'en-US'; // Change this for other languages
        
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
        chatHistory.push({
            role: 'user',
            parts: [{ text: transcription }]
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
        
        // Analyze emotion and update particles
        await analyzeEmotionAndUpdateParticles(responseText);
        
        console.log('✅ Audio processed successfully');
        
    } catch (error) {
        console.error('Error processing audio:', error);
        addSystemMessage(`❌ Error processing audio: ${error.message}`);
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function transcribeWithGladia(audioBlob) {
    try {
        const GLADIA_API_KEY = gladiaApiKey;
        
        if (!GLADIA_API_KEY) {
            throw new Error('Gladia API key is required');
        }
        
        // Convert webm to WAV for better compatibility
        const wavBlob = await convertToWav(audioBlob);
        
        // Create FormData with the audio file
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language_behaviour', 'automatic single language');
        
        // Use Gladia's transcription endpoint
        const response = await fetch('https://api.gladia.io/v2/transcription/', {
            method: 'POST',
            headers: {
                'x-gladia-key': GLADIA_API_KEY
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gladia API error:', errorData);
            throw new Error(`Gladia API error: ${errorData.message || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Gladia response:', data);
        
        // Check if we got a result_url (async processing)
        if (data.result_url) {
            // Poll for the result
            const resultUrl = data.result_url;
            let attempts = 0;
            const maxAttempts = 30;
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const resultResponse = await fetch(resultUrl, {
                    headers: {
                        'x-gladia-key': GLADIA_API_KEY
                    }
                });
                
                if (resultResponse.ok) {
                    const result = await resultResponse.json();
                    console.log('Gladia result:', result);
                    
                    if (result.status === 'done') {
                        const transcription = result.result?.transcription?.full_transcript || 
                                            result.result?.transcription?.success ||
                                            '[Could not transcribe]';
                        return transcription;
                    } else if (result.status === 'error') {
                        throw new Error('Transcription failed');
                    }
                }
                
                attempts++;
            }
            
            throw new Error('Transcription timeout');
        }
        
        // If we got immediate results
        const transcription = data.prediction?.[0]?.transcription || 
                            data.transcription?.full_transcript ||
                            data.transcription?.text ||
                            data.result?.transcription?.full_transcript ||
                            '[Could not transcribe]';
        
        return transcription;
        
    } catch (error) {
        console.error('Gladia transcription error:', error);
        return '[Transcription failed: ' + error.message + ']';
    }
}

async function convertToWav(blob) {
    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const fileReader = new FileReader();
        
        fileReader.onload = async function(e) {
            try {
                const audioBuffer = await audioContext.decodeAudioData(e.target.result);
                
                // Convert to WAV
                const wavBuffer = audioBufferToWav(audioBuffer);
                const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
                
                resolve(wavBlob);
            } catch (error) {
                reject(error);
            }
        };
        
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(blob);
    });
}

function audioBufferToWav(buffer) {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;
    
    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(buffer.numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // avg. bytes/sec
    setUint16(buffer.numberOfChannels * 2); // block-align
    setUint16(16); // 16-bit
    
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length
    
    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }
    
    while (pos < length) {
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    
    return arrayBuffer;
    
    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }
    
    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

// Initialize
updateUI();
