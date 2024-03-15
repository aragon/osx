const fs = require('fs');
const glob = require('glob');
const path = require('path');

const regex = /(\/\*[ ]*MARKDOWN)(.|\n)*?(\*\/\n)/gi;
const START_REGEX = /^\/\*[ ]*MARKDOWN/i;
const END_REGEX = /\*\/\n$/;

generateMarkdown().catch(err => {
  console.error(err);
  process.exit(1);
});

async function generateMarkdown() {
  const workingDirectory = process.argv[2];
  if (!workingDirectory) {
    console.error('Usage:  node generate-markdown.js <working-directory>');
    process.exit(1);
  }
  const fileList = await getFileList(workingDirectory);

  for (const file of fileList) {
    const basename = path.basename(file, path.extname(file));
    const mdFile = path.join(path.dirname(file), basename + '.md');

    const blocks = parseFile(file);
    const strMarkdown = compileBlocks(blocks);
    fs.writeFileSync(mdFile, strMarkdown);
  }
}

function getFileList(workingDirectory) {
  return glob.sync(workingDirectory + '/**/*.ts');
}

function parseFile(path) {
  const str = fs.readFileSync(path).toString();
  const matches = str.matchAll(regex);

  let lastCursor = 0;
  const blocks = [];

  for (const match of matches) {
    if (typeof match.index === 'undefined') continue;

    // TS not catched up yet
    if (lastCursor < match.index) {
      blocks.push({
        type: 'code',
        content: str.substring(lastCursor, match.index),
      });
      lastCursor += match[0].length;
    }
    // the markdown block itself
    blocks.push({type: 'markdown', content: match[0]});
    lastCursor = match.index + match[0].length;
  }
  // remainder
  if (lastCursor < str.length) {
    blocks.push({
      type: 'code',
      content: str.substring(lastCursor, str.length),
    });
  }
  return blocks;
}

function compileBlocks(blocks) {
  let content = '';
  for (const block of blocks) {
    switch (block.type) {
      case 'code':
        content += `\n\n\`\`\`ts\n` + block.content.trim() + `\n\`\`\`\n\n\n`;
        break;
      case 'markdown':
        content += trimMarkdownContent(block.content);
        break;
      default:
        throw new Error('Invalid block type');
    }
  }
  return content;
}

function trimMarkdownContent(content) {
  content = content.replace(START_REGEX, '');
  content = content.replace(END_REGEX, '');
  return content.trim();
}
