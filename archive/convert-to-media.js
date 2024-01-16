import { TerminalUtils } from '@tkottke/node-utils';
import { database } from './lib/database.js';



console.log('\n\n');
TerminalUtils.drawScriptHeader('ConvertToMedia');

const nonImageItems = [];
database.forEach(item => {
  if (item.content) {
    item.content.forEach(c => {
      if (c.type === 'media' && c.filename.includes('html')) {
        nonImageItems.push([item.id, c.filename])
      }
    })
  }
});

console.dir(nonImageItems);