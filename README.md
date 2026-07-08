# Local File AI 🚀

An interactive CLI tool that enables seamless analysis of local files and entire project directories using local AI models run via Ollama. 

With this tool, you can navigate your local drives, load files or whole folders into the AI context, and chat with your preferred model completely offline.

---

## 🧠 Retrieval-Augmented Generation (RAG)

This application implements a local **RAG (Retrieval-Augmented Generation)** workflow:
1. **Context Ingestion:** The tool reads your local source files or directory contents directly from your drive.
2. **Prompt Augmentation:** It automatically packages the file structures and contents as an enriched context layer.
3. **Local Inference:** The augmented prompt is sent to your local Ollama instance. Your data never leaves your machine—no cloud APIs, no data leaks, 100% privacy.

---

## 📋 Prerequisites & Installation

To run this project locally, you need to set up **Ollama** and **Node.js** on your system. Follow the step-by-step guide below.

### 1. Install and Set Up Ollama

Ollama serves as the local engine that runs the AI models on your machine.

1. **Download Ollama:**
   Go to the official website [ollama.com](https://ollama.com) and download the installer for your operating system (e.g., Windows).
2. **Install:**
   Run the downloaded installer and complete the setup.
3. **Verify Installation:**
   Open your terminal (PowerShell or Command Prompt) and type:
   ```bash
   ollama --version

If it returns a version number, Ollama is running successfully in the background.
2. Download AI Models

Before running the script, you need to pull at least one AI model. For development and coding tasks, we highly recommend Qwen2.5-Coder or the Polish model Bielika v3.0.

Open your terminal and run one (or both) of the following commands:

    To pull Qwen2.5-Coder (14B parameters - recommended for coding):
    Bash

    ollama run qwen2.5-coder:14b

    To pull Bielika v3.0 (11B parameters - official SpeakLeash Polish model):
    Bash

    ollama run SpeakLeash/bielik-11b-v3.0-instruct:Q4_K_M

Note: The download might take several minutes depending on your internet speed (each model is ~7.5 GB). Once the model starts a test chat session, type /exit to close it.
🛠️ Project Setup

Once Ollama and your models are ready, follow these steps to launch the CLI application:

    Clone or download this repository to your local machine.

    Open your terminal inside the project directory (local-file-ai).

    Install the required dependencies:
    Bash

    npm install

    Run the application:
    Bash

    node index.js

💡 How It Works

    Model Selection: Upon launch, the script dynamically fetches all AI models currently installed on your local Ollama instance and asks you to choose one.

    File Explorer: Use your arrow keys to navigate your drive. You can go up a directory (⬆️ ..), enter subfolders (📁 [FOLDER]), select a specific file, or ingest the entire current directory (📂 [CAŁY TEN FOLDER]).

    Chat Mode: Once the context is loaded, enter your prompt. The AI will analyze your local code and provide insights using your computer's GPU! Type exit to quit the session.

📄 License

This project is licensed under the MIT License - see the package.json file for details.
