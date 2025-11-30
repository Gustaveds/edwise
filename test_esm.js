
import path from 'path';
import { fileURLToPath } from 'url';

try {
    console.log("Trying __dirname...");
    console.log(__dirname);
} catch (e) {
    console.log("Error accessing __dirname:", e.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename);
console.log("ESM __dirname:", __dirname_esm);
