import { readFileSync, writeFileSync, existsSync } from 'fs';

console.log('> Loading Database')

let fileDB = '[]';
if (existsSync('./output/_database.json')) {
  fileDB = readFileSync('./output/_database.json', 'utf-8');
}

/**
 * @type {Map<string, Record<string, any>>}
 */
const database = new Map(JSON.parse(fileDB));

console.log('> Database Loaded')

function saveDatabase() {
  console.log('> ')
  writeFileSync('./output/_database.json', JSON.stringify(Array.from(database), null, 2), 'utf-8');
}

export {
  database,
  saveDatabase
};
