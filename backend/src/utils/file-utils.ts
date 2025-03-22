import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Read a file and return its contents
 * @param filePath - Path to the file
 * @returns The file contents
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return 'EMPTY_FILE';
    }
    throw error;
  }
}

/**
 * Write content to a file
 * @param filePath - Path to the file
 * @param content - Content to write
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to write file ${filePath}: ${errorMessage}`);
  }
}

/**
 * Get a list of files from the git repository
 * @param dir - Directory to start from (defaults to current directory)
 * @param ignorePatterns - Patterns to ignore
 * @returns List of file paths
 */
export async function getRepoFiles(dir = '.', ignorePatterns: string[] = []): Promise<string[]> {
  try {
    // Use git ls-files to get all tracked files
    const { stdout } = await execAsync('ls', { cwd: dir });

    // Split by newline and filter out empty lines
    let files = stdout.split('\n').filter((file) => file.trim().length > 0);

    // Filter out ignored patterns
    if (ignorePatterns.length > 0) {
      files = files.filter((file) => {
        return !ignorePatterns.some((pattern) =>
          new RegExp(pattern.replace(/\*/g, '.*')).test(file)
        );
      });
    }

    return files;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to list repository files: ${errorMessage}`);
  }
}
