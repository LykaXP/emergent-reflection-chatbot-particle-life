# Emergent Reflection

An interactive AI chatbot application that visualizes the bot's emotional state through a dynamic particle simulation. The chatbot learns personality traits from uploaded conversation files and engages in natural conversations while displaying its emotions through colorful animated particles.

## Features

### AI Personality Training
- Upload conversation files to train the chatbot's personality
- Supports multiple conversation formats (Name: Message, [Name] Message, JSON)
- Automatically generates a unique name for the bot based on personality analysis
- Uses Google's Gemini API for advanced natural language processing

### Emotional Particle Visualization
- Real-time particle simulation that reflects the bot's emotional state
- Emotions detected: happy, sad, angry, excited, calm, neutral
- Dynamic color palettes and movement patterns based on emotion intensity
- Visual representation helps users understand the bot's mood

### Advanced Chat Features
- **Multi-language support**: English, French, Traditional Chinese, Japanese
- **Voice input**: Speech-to-text functionality
- **Bot initiative**: Chatbot proactively starts conversations after periods of inactivity
- **Context-aware responses**: Bot references its particle state and conversation history
- **Fullscreen mode**: Immersive chat experience with particle background

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Edge, Firefox, or Safari)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/chatbot-particle-life.git
cd chatbot-particle-life
```

2. Open `index.html` in your web browser

### Usage

1. **Enter your Gemini API key** in the provided input field

2. **Upload conversation files**:
   - Click the upload area or drag and drop files
   - Supported formats:
     ```
     Name: Message text here
     [Name] Message text here
     {"speaker": "Name", "message": "Message text here"}
     ```

3. **Create the bot personality**:
   - Click "Create Bot Personality"
   - Wait for the bot to initialize and generate its unique name

4. **Start chatting**:
   - Type messages in the input field and press Enter
   - Use the voice button to speak your message
   - Switch languages with the language toggle button
   - Enter fullscreen mode for an immersive experience

### Keyboard Shortcuts
- `R` - Randomize particle interaction rules
- `Space` - Pause/resume
- `F` - Toggle fullscreen
- `V` - Toggle voice recording (when not typing)

## File Structure

```
chatbot-particle-life/
├── index.html           # Main application page
├── chatbot.html         # Chatbot interface
├── chatbot.js          # Chatbot logic and API integration
├── chatbot-style.css   # Chatbot styling
├── particle.js         # Particle simulation engine
├── main.js            # Main application controller
├── style.css          # Main application styling
└── README.md          # This file
```

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI Model**: Google Gemini 2.5 Flash
- **Emotion Analysis**: Google Gemma 3 4B
- **Speech Recognition**: Web Speech API
- **Animation**: Canvas API for particle rendering

## Key Components

### Chatbot System ([`chatbot.js`](chatbot.js))
- Manages conversation state and history
- Handles file parsing and personality analysis
- Implements multi-language support
- Processes voice input via Web Speech API
- Triggers bot-initiated messages at random intervals

### Particle Simulation ([`particle.js`](particle.js))
- Renders emotion-based particle systems
- Updates colors and movement patterns based on detected emotions
- Provides smooth transitions between emotional states

### Main Controller ([`main.js`](main.js))
- Manages UI state and fullscreen mode
- Synchronizes chat messages between normal and fullscreen views
- Handles keyboard and interaction events

## API Usage

The application uses two Google AI models:
- **Gemini 2.5 Flash**: Main conversational AI
- **Gemma 3 4B**: Emotion analysis from text

API calls are made to:
```
https://generativelanguage.googleapis.com/v1beta/models/
```

## Configuration

### Emotion Detection
Emotions are detected using a hybrid approach:
1. Keyword-based fallback detection
2. API-based sentiment analysis (when available)

### Bot Initiative Timing
- Random intervals between 30-60 seconds
- Weighted message types:
  - 3% particle-related comments
  - 24% complaints/frustrations
  - 24% self-reflection
  - 24% questions/curiosity
  - 25% general topics

## Browser Compatibility

- Chrome/Edge (Recommended)

## Privacy & Security

- API key is stored locally in the browser session
- No conversation data is sent to external servers (except Google AI API)
- All processing happens client-side
- No cookies or tracking

---

**Note**: This application requires an active internet connection to communicate with the Google AI API.
