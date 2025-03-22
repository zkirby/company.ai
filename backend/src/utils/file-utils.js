import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Read a file and return its contents
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} The file contents
 */
export async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 'EMPTY_FILE';
    }
    throw error;
  }
}

/**
 * Write content to a file
 * @param {string} filePath - Path to the file
 * @param {string} content - Content to write
 * @returns {Promise<void>}
 */
export async function writeFile(filePath, content) {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${error.message}`);
  }
}

/**
 * Get a list of files from the git repository
 * @param {string} dir - Directory to start from (defaults to current directory)
 * @param {Array<string>} ignorePatterns - Patterns to ignore
 * @returns {Promise<Array<string>>} List of file paths
 */
export async function getRepoFiles(dir = '.', ignorePatterns = []) {
  try {
    // Use git ls-files to get all tracked files
    const { stdout } = await execAsync('git ls-files', { cwd: dir });
    
    // Split by newline and filter out empty lines
    let files = stdout.split('\n').filter(file => file.trim().length > 0);
    
    // Filter out ignored patterns
    if (ignorePatterns.length > 0) {
      files = files.filter(file => {
        return !ignorePatterns.some(pattern => 
          new RegExp(pattern.replace(/\*/g, '.*')).test(file)
        );
      });
    }
    
    return files;
  } catch (error) {
    throw new Error(`Failed to list repository files: ${error.message}`);
  }
}