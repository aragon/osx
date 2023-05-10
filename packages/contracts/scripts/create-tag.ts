import * as fs from 'fs';
import {execSync} from 'child_process';

function checkTagExists(tag: string): boolean {
  try {
    execSync(`git rev-parse "${tag}"`, {stdio: 'ignore'});
    return true;
  } catch (error) {
    // git rev-parse will fail with non-zero status code if the tag does not exist
    return false;
  }
}

function createAndPushTag(tag: string) {
  try {
    execSync(`git tag "${tag}"`);
    execSync(`git push origin "${tag}"`);
  } catch (error) {
    throw new Error(`Failed to create or push tag. Error: ${error}`);
  }
}

function main() {
  const packageJson = JSON.parse(fs.readFileSync('src/package.json', 'utf-8'));
  const version = packageJson.version;
  const tag = `v${version}`;

  if (checkTagExists(tag)) {
    throw new Error(`Tag "${tag}" already exists.`);
  } else {
    createAndPushTag(tag);
  }
}

main();
