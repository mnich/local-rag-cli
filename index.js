#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

const OLLAMA_HOST = 'http://localhost:11434';
const OLLAMA_URL = `${OLLAMA_HOST}/api/generate`;
const OLLAMA_TAGS_URL = `${OLLAMA_HOST}/api/tags`;

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.pnpm-store', 'package-lock.json'];
const ALLOWED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.txt', '.md'];

// Funkcja pobierająca listę modeli z lokalnej Ollamy
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
        console.error("❌ Nie udało się pobrać modeli z Ollamy. Upewnij się, że Ollama działa.");
        console.error(`Szczegóły błędu: ${error.message}\n`);
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
    console.log("⏳ Łączenie z Ollama i pobieranie listy modeli...");
    const models = await getAvailableModels();

    if (models.length === 0) {
        console.log("❌ Brak dostępnych modeli w Ollamie. Pobierz jakiś model (np. `ollama pull qwen2.5-coder:14b`) i spróbuj ponownie.");
        return;
    }

    // 1. Wybór modelu AI
    const { selectedModel } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedModel',
            message: 'Wybierz model Ollama, którego chcesz użyć:',
            choices: models
        }
    ]);

    console.log(`\n🤖 Wybrany model: ${selectedModel}`);

    let currentDir = process.cwd();
    let selectedChoice = "";
    
    const ALL_PROJECT_OPTION = "📂 [CAŁY TEN FOLDER] (Analizuj everything tutaj)";
    const GO_UP_OPTION = "⬆️ .. (Przejdź katalog wyżej)";

    // 2. Pętla nawigacji po katalogach
    while (true) {
        console.log(`\n🔍 Aktualny folder: ${currentDir}`);
        
        const availableFiles = getFilesFromDirRecursive(currentDir);
        const subFolders = getDirectSubfolders(currentDir);

        const choices = [ALL_PROJECT_OPTION, GO_UP_OPTION];
        subFolders.forEach(folder => choices.push(`📁 [FOLDER] ${folder}`));
        availableFiles.forEach(file => choices.push(file));

        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'Wybierz plik, wejdź głębiej lub dodaj cały ten folder:',
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
        console.log("\n📦 Budowanie kontekstu ze wszystkich plików...");
        const filesToRead = getFilesFromDirRecursive(currentDir);
        let combinedText = "";
        
        filesToRead.forEach(file => {
            const fullPath = path.join(currentDir, file);
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                combinedText += `\n--- PLIK: ${file} ---\n${content}\n--- KONIEC PLIKU ---\n`;
            } catch (err) {
                console.error(`⚠️ Nie udało się odczytać pliku ${file}: ${err.message}`);
            }
        });

        contextContent = combinedText;
        contextDescription = `cały folder "${path.basename(currentDir)}" (${filesToRead.length} plików)`;
    } else {
        const fullSelectedPath = path.join(currentDir, selectedChoice);
        contextContent = fs.readFileSync(fullSelectedPath, 'utf-8');
        contextDescription = `plik "${selectedChoice}"`;
    }

    console.log(`\n📖 Wczytano: ${contextDescription} (${contextContent.length} znaków)`);
    console.log(`🤖 Czatujesz z: ${selectedModel}`);
    console.log("--------------------------------------------------\n");

    // 3. Pętla czatu
    while (true) {
        const { userPrompt } = await inquirer.prompt([
            {
                type: 'input',
                name: 'userPrompt',
                message: 'Ty (wpisz "exit" aby wyjść) >'
            }
        ]);

        if (!userPrompt || userPrompt.trim().toLowerCase() === 'exit') {
            console.log("👋 Do zobaczenia!");
            break;
        }

        let fullPrompt = "";
        if (selectedChoice === ALL_PROJECT_OPTION) {
            fullPrompt = `Analizujesz kod z folderu: "${currentDir}". Poniżej znajduje się zawartość plików.\n\n${contextContent}\n\nPytanie użytkownika: ${userPrompt}`;
        } else {
            fullPrompt = `Analizujesz lokalny plik: "${selectedChoice}".\n\nOto zawartość:\n---\n${contextContent}\n---\n\nPytanie użytkownika: ${userPrompt}`;
        }

        console.log(`⏳ AI (${selectedModel}) myśli...`);

        try {
            const response = await fetch(OLLAMA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel, // Przekazujemy wybrany na początku model
                    prompt: fullPrompt,
                    stream: false
                })
            });

            const data = await response.json();
            console.log(`\nAI > ${data.response}\n`);
            console.log("--------------------------------------------------");

        } catch (error) {
            console.error("❌ Błąd połączenia z Ollama:", error.message);
        }
    }
}

main();