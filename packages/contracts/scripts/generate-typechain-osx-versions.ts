import {OSX_VERSION_ALIASES} from './osx-versions-aliases';
import {exec} from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

async function generateTypechain(src: string, dest: string): Promise<void> {
  const {stdout} = await execPromise(
    `find "${src}" -name '*.json' -type f ! -name '*.dbg.json'`
  );
  const jsonFiles = stdout.trim().split('\n');

  for (const file of jsonFiles) {
    const relativePath = path.relative(src, path.dirname(file));
    const outputDir = path.join(dest, relativePath);
    fs.mkdirSync(outputDir, {recursive: true});

    await execPromise(
      `typechain --target ethers-v5 --out-dir "${outputDir}" "${file}"`
    );
  }
}

for (let i = 0; i < OSX_VERSION_ALIASES.length; i++) {
  generateTypechain(
    `./artifacts/${OSX_VERSION_ALIASES[i]}`,
    `./typechain/${OSX_VERSION_ALIASES[i]}`
  );
}
