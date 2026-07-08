#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

const OLLAMA_HOST = 'http://localhost:11434';
const OLLAMA_URL = `${OLLAMA_HOST}/api/generate`;
const OLLAMA_TAGS_URL = `${OLLAMA_HOST}/api/tags`;

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.pnpm-store', 'package-lock.json'];
const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.txt', '.md'];

async function getAvailableModels() {
    try {
        const response = await fetch(OLLAMA_TAGS_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data.models && data.models.length > 0) {
            return data.models.map(m => m.name);
        }
        return [];
    } catch (error) {
        console.error("❌ Failed to fetch models from Ollama. Make sure Ollama is running.");
        console.error(`Error details: ${error.message}\n`);
        return [];
    }
}

function getFilesFromDirRecursive(dir, baseDir = dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    try {
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat && stat.isDirectory()) {
                if (!IGNORED_DIRS.includes(file)) {
                    results = results.concat(getFilesFromDirRecursive(fullPath, baseDir));
                }
            } else {
                const ext = path.extname(file).toLowerCase();
                if (ALLOWED_EXTENSIONS.includes(ext) && file !== 'package-lock.json') {
                    results.push(path.relative(baseDir, fullPath));
                }
            }
        });
    } catch (e) {}
    return results;
}

function getDirectSubfolders(dir) {
    try {
        return fs.readdirSync(dir).filter(file => {
            const fullPath = path.join(dir, file);
            return fs.statSync(fullPath).isDirectory() && !IGNORED_DIRS.includes(file);
        });
    } catch (e) {
        return [];
    }
}

async function main() {
    console.log("⏳ Connecting to Ollama and fetching available models...");
    const models = await getAvailableModels();

    if (models.length === 0) {
        console.log("❌ No available models found in Ollama. Please pull a model first (e.g., `ollama pull qwen2.5-coder:14b`) and try again.");
        return;
    }

    const { selectedModel } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedModel',
            message: 'Select an Ollama model to use:',
            choices: models
        }
    ]);

    console.log(`\n🤖 Selected Model: ${selectedModel}`);

    let currentDir = process.cwd();
    let selectedChoice = "";
    
    const ALL_PROJECT_OPTION = "📂 [WHOLE DIRECTORY] (Analyze everything here)";
    const GO_UP_OPTION = "⬆️ .. (Go up a directory)";

    while (true) {
        console.log(`\n🔍 Current Folder: ${currentDir}`);
        
        const availableFiles = getFilesFromDirRecursive(currentDir);
        const subFolders = getDirectSubfolders(currentDir);

        const choices = [ALL_PROJECT_OPTION, GO_UP_OPTION];
        subFolders.forEach(folder => choices.push(`📁 [FOLDER] ${folder}`));
        availableFiles.forEach(file => choices.push(file));

        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'Select a file, enter a subfolder, or ingest the entire directory:',
                choices: choices,
                pageSize: 12
            }
        ]);

        if (choice === GO_UP_OPTION) {
            currentDir = path.dirname(currentDir);
        } else if (choice.startsWith("📁 [FOLDER] ")) {
            const folderName = choice.replace("📁 [FOLDER] ", "");
            currentDir = path.join(currentDir, folderName);
        } else {
            selectedChoice = choice;
            break;
        }
    }

    let contextContent = "";
    let contextDescription = "";

    if (selectedChoice === ALL_PROJECT_OPTION) {
        console.log("\n📦 Ingesting context from all matching files...");
        const filesToRead = getFilesFromDirRecursive(currentDir);
        let combinedText = "";
        
        filesToRead.forEach(file => {
            const fullPath = path.join(currentDir, file);
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                combinedText += `\n--- FILE: ${file} ---\n${content}\n--- END OF FILE ---\n`;
            } catch (err) {
                console.error(`⚠️ Failed to read file ${file}: ${err.message}`);
            }
        });

        contextContent = combinedText;
        contextDescription = `entire directory "${path.basename(currentDir)}" (${filesToRead.length} files)`;
    } else {
        const fullSelectedPath = path.join(currentDir, selectedChoice);
        contextContent = fs.readFileSync(fullSelectedPath, 'utf-8');
        contextDescription = `file "${selectedChoice}"`;
    }

    console.log(`\n📖 Loaded context: ${contextDescription} (${contextContent.length} characters)`);
    console.log(`🤖 Chatting with: ${selectedModel}`);
    console.log("--------------------------------------------------\n");

    while (true) {
        const { userPrompt } = await inquirer.prompt([
            {
                type: 'input',
                name: 'userPrompt',
                message: 'You (type "exit" to quit) >'
            }
        ]);

        if (!userPrompt || userPrompt.trim().toLowerCase() === 'exit') {
            console.log("👋 Goodbye!");
            break;
        }

        let fullPrompt = "";
        if (selectedChoice === ALL_PROJECT_OPTION) {
            fullPrompt = `You are analyzing code from the directory: "${currentDir}". Below is the content of the files.\n\n${contextContent}\n\nUser Question: ${userPrompt}`;
        } else {
            fullPrompt = `You are analyzing a local file: "${selectedChoice}".\n\nContent:\n---\n${contextContent}\n---\n\nUser Question: ${userPrompt}`;
        }

        console.log(`⏳ AI (${selectedModel}) is thinking...`);

        try {
            const response = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    prompt: fullPrompt,
                    stream: false
                })
            });

            const data = await response.json();
            console.log(`\nAI > ${data.response}\n`);
            console.log("--------------------------------------------------");

        } catch (error) {
            console.error("❌ Ollama connection error:", error.message);
        }
    }
}

main();