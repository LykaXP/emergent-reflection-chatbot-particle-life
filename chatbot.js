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
const clearBtn = document.getElementById('clearBtn');
const chatStatus = document.getElementById('chatStatus');
const recordingIndicator = document.getElementById('recordingIndicator');

// Voice recording state
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

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

        const nameResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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

        const emotionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Use webm format with opus codec for better compatibility
        const options = { mimeType: 'audio/webm;codecs=opus' };
        mediaRecorder = new MediaRecorder(stream, options);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());
            await processAudioWithGemini(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        voiceBtn.classList.add('recording');
        recordingIndicator.style.display = 'flex';
        
        console.log('🎤 Recording started...');
    } catch (error) {
        console.error('Error accessing microphone:', error);
        addSystemMessage('❌ Error: Could not access microphone. Please check permissions.');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        voiceBtn.classList.remove('recording');
        recordingIndicator.style.display = 'none';
        
        console.log('🎤 Recording stopped');
    }
}

async function processAudioWithGemini(audioBlob) {
    try {
        addSystemMessage('🎧 Processing audio...');
        
        // Convert audio blob to base64
        const base64Audio = await blobToBase64(audioBlob);
        
        // Remove data URL prefix to get just the base64 string
        const base64Data = base64Audio.split(',')[1];
        
        // First, get transcription
        const TRANSCRIPTION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const transcriptionBody = {
            contents: [{
                role: 'user',
                parts: [
                    {
                        inline_data: {
                            mime_type: 'audio/webm',
                            data: base64Data
                        }
                    },
                    {
                        text: 'Provide only the transcription of what was said in this audio. Reply with just the transcribed text, nothing else.'
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 512,
            }
        };
        
        const transcriptionResponse = await fetch(TRANSCRIPTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transcriptionBody)
        });
        
        if (!transcriptionResponse.ok) {
            const error = await transcriptionResponse.json();
            throw new Error(error.error?.message || 'Transcription failed');
        }
        
        const transcriptionData = await transcriptionResponse.json();
        const transcription = transcriptionData.candidates?.[0]?.content?.parts?.[0]?.text || '[Could not transcribe]';
        
        console.log('📝 Transcription:', transcription);
        
        // Show transcribed message in chat
        addMessage('You (voice)', transcription, 'user');
        
        // Now get bot response using the transcription with chat history
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
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

// Initialize
updateUI();
