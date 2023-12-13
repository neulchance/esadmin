import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createCompiler() {
  const projectPath = path.join(__dirname, '../../', 'src', 'tsconfig.json');
  console.log(projectPath)
}