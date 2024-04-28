import {exec} from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import {OSX_VERSION_ALIASES} from './osx-versions-aliases';

const execPromise = util.promisify(exec);

async function generateTypechain(): Promise<void> {
  const artifactsDir = './artifacts';
  const excludedDirs = new Set([path.join(artifactsDir, 'build-info')]);

  for (let i = 0; i < OSX_VERSION_ALIASES.length; i++) {
    excludedDirs.add(path.join(artifactsDir, OSX_VERSION_ALIASES[i]));
  }

  const jsonFiles: string[] = [];

  console.log('Searching for files...');

  findFiles(artifactsDir, filePath => {
    if (!filePath.endsWith('.json')) {
      return;
    }

    if (filePath.endsWith('.dbg.json')) {
      return;
    }

    const dirPath = path.dirname(filePath);
    if (!excludedDirs.has(dirPath)) {
      jsonFiles.push(filePath);
    }
  });

  console.log(`Found ${jsonFiles.length} files. Running typechain...`);

  const filesArg = jsonFiles.join(' ');

  if (filesArg) {
    await execPromise(
      `typechain --target ethers-v5 --out-dir ./typechain ${filesArg}`
    );
  }

  console.log('Finished processing all files.');
}

function findFiles(dir: string, callback: (filePath: string) => void): void {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findFiles(filePath, callback);
    } else if (stat.isFile()) {
      callback(filePath);
    }
  }
}

generateTypechain().catch(error => {
  console.error('An error occurred:', error);
});
