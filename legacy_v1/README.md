# Word2Card 🎴

A desktop application that converts vocabulary lists into Anki flashcards with automatic pronunciation using Azure Cognitive Services Text-to-Speech.


## ✨ Features

- **Vocabulary Conversion**: Create flashcards from text or JSON files
- **Text-to-Speech**: Automatically generate audio pronunciation files using Azure Cognitive Services
- **Multiple Choice**: Support for creating multiple-choice questions
- **Direct Anki Integration**: **Automatically imports flashcards to Anki using Anki-Connect.**
- **Bidirectional Learning**:
    - English → Vietnamese
    - Vietnamese → English
- **Quantity Limit**: Allow limiting the number of vocabulary words to process

## 💻 System Requirements

- **Anki (Opened)**: The Anki desktop application **must be running** during the submission process.
- **[Anki-Connect Extension](https://ankiweb.net/shared/info/2055492159)**: **Required** to allow Word2Card to communicate with and add cards directly to Anki.
- **Azure Subscription Key**: For Text-to-Speech functionality.

## 🚀 Installation

### Download Pre-built Release

Download the latest version from the [Releases](https://github.com/marcomoi395/word2card/releases) page:

- **v1.1** (Latest): Added Limit Input field feature - [Download](https://github.com/marcomoi395/word2card/releases/tag/v1. 1)
- **v1. 0.0-beta**: Initial release - [Download](https://github.com/marcomoi395/word2card/releases/tag/v1.0.0-beta)

### Run from Source

1.  **Clone the repository**

<!-- end list -->

```bash
git clone https://github. com/marcomoi395/word2card.git
cd word2card
```

2.  **Install dependencies**

<!-- end list -->

```bash
npm install
```

3.  **Start the application**

<!-- end list -->

```bash
npm start
```

## 📖 Usage

### Step 1: Prepare Anki & Launch Application

1.  **Open Anki**: Ensure your Anki desktop application is **running**.
2.  **Install Anki-Connect**: If you haven't already, install the **Anki-Connect** add-on (You can find the code on the Anki website's add-ons section).
3.  **Launch Word2Card**: Run the downloaded executable or start from source:
    ```bash
    npm start
    ```

### Step 2: Configure Settings

In the application interface, fill in the following information:

1.  **Select File**: Choose your vocabulary file (`. txt` or `.json`)
2.  **Deck Name**: Name for your Anki deck (will be created if it doesn't exist)
3.  **Limit**: Limit number of words (leave empty to process all)
4.  **Subscription Key**: Azure Cognitive Services subscription key

### Step 3: Select Options

- ☑️ **Multiple Choice**: Generate multiple-choice questions
- ☑️ **Eng - Vie**: Create English to Vietnamese flashcards
- ☑️ **Vie - Eng**: Create Vietnamese to English flashcards

### Step 4: Submit

Click the **Submit** button to start processing.

> **✅ Success\!** The new flashcards will be **automatically added** to the specified deck in the Anki application that is currently open.

## 📄 Input File Format

### Text File (. txt)

```text
hello: xin chào: Hello, how are you?
world: thế giới: Welcome to the world   
computer: máy tính: This is a computer.
good: tốt: This is a good book.
```

### JSON File (.json)

```json
[
  {
    "word": "hello",
    "meaning": "xin chào",
    "example": "Hello, how are you?"
  },
  {
    "word": "world",
    "meaning": "thế giới",
    "example": "Welcome to the world"
  }
]
```

## ⚙️ Configuration

### Getting Azure Subscription Key

1.  Visit [Azure Portal](https://portal.azure.com/)
2.  Create a **Cognitive Services** or **Speech Services** resource
3.  Get the **Subscription Key** from the Keys and Endpoint section

### Anki-Connect Requirement

- **Status**: Anki must be running with the Anki-Connect extension installed and active.
- **Function**: This extension allows the Word2Card application to communicate with Anki to create the deck and add notes directly.

### Audio File Location

Audio files are stored locally (and referenced by Anki) at:

- **Windows**: `%APPDATA%/Word2Card/audio/`
- **macOS**: `~/Library/Application Support/Word2Card/audio/`
- **Linux**: `~/.config/Word2Card/audio/`

## 🛠️ Tech Stack

- **Electron**: Framework for building desktop applications
- **Node.js**: Runtime environment
- **Azure Cognitive Services Speech SDK**: Text-to-Speech API
- **Anki-Connect API**: For direct Anki integration
- **electron-store**: Local data storage
- **HTML/CSS/JavaScript**: User interface

**Note**: To use the Text-to-Speech feature, you need a valid Azure Subscription Key. Azure provides a free tier with monthly limits.
