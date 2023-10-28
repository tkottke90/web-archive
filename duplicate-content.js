import { TerminalUtils } from '@tkottke/node-utils';
import { database, saveDatabase } from './lib/database.js';

console.log('\n\n');
TerminalUtils.drawScriptHeader('Duplicate Content Remover');

const nonImageItems = [];
database.forEach(item => {
  if (item.content) {
    const files = [];

    item.content.forEach((c, i) => {
      if (files.includes(c.filename)) {
        item.content.splice(i, 1);
      } else {
        files.push(c.filename)
      }
    })

    item.content.length > 1 && console.log(item.id);
  }
});

saveDatabase();