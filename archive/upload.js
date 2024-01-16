import { readFileSync, existsSync, writeFileSync, createReadStream } from 'fs'
import { database } from './lib/database.js';
import { Blob, Buffer } from 'node:buffer';
import mime from 'mime-types';

const root = 'http://localhost:5000';
const keys = Array.from(database.keys());

function createProperties(input) {
  const output = {
    isAdultOnly: input.isAdultOnly,
    title: input.title,
    author: input.author,
    origin: input.origin,
    subreddit: {
      label: input.subredditName,
      name: input.subreddit
    }
  }

  return new Blob([JSON.stringify(output)]);
}

/**
 * 
 * @param {FormData} data 
 */
async function uploadEntry(data) {
  const headers = new Headers();

  const options = { method: 'POST', headers, body: data }

  const existing = await fetch(`${root}/data-entry?externalId=${data.get('externalId')}`)

  await fetch(`${root}/data-entry`, options)
    .then(r => {
      if (!r.ok) {
        return r.text().then(t => { console.log(t); return t });
      }
      
      return r.json()
    })
    // .then(d => console.dir(d))
    .catch(e => {
      console.error('! FATAL: ', e);
      process.exit(1);
    });
}

async function getOrCreateSource(data) {
  const source = await fetch(`${root}/data-source?name=${data.subredditName}`)
    .then(res => {
      if (res.ok) {
        return res.json();
      }

      return res.text();
    });


  let method = "GET";
  const headers = new Headers();
  headers.append('Content-Type', 'application/json; charset=utf-8')

  const body = { name: data.subredditName, domain: `https://www.reddit.com/${data.subreddit}` }
  let url = `${root}/data-source`

  if (!source.length) {
    method = "POST"
    body.nsfw = data.isAdultOnly;
    body.dataParserId = 2;
  } else {
    url += `/${source[0].id}`
    method = "PATCH"

    if (source[0].nsfw !== true && 'isAdultOnly' in data) {
      body.nsfw = data.isAdultOnly
    }
  }

  const response = await fetch(url, { method, body: JSON.stringify(body), headers }).then(r => r.json());

  return response;
}

for (let index in keys) {
  console.info(`> Loading ${Number(index) + 1} of ${keys.length}`)
  const key = keys[index];
  const record = database.get(key);

  if (record) {
    // Get Source
    const source = await getOrCreateSource(record);

    // Setup form data
    console.info('>> Creating form data')
    const formData = new FormData();
    formData.set('sourceId', source.id);
    formData.set('externalId', key);

    // Get unique filenames
    const filenames = new Set();
    const originalContent = [];
    record.content
      .filter(Boolean) // Only want actual strings
      .forEach(item => {
        filenames.add(item.filename)
      });

    // Append files to form data
    console.info('>> Loading files')
    filenames.forEach(filename => {
      const path = `./output/${filename}`;
      if (filename && existsSync(path)) {
        try {
          const file = readFileSync(path);
          const mimeType = mime.lookup(path);
          const blob = new Blob([file], { type: mimeType })
          formData.append('media', blob, filename);
        } catch (err) {
          console.error('! FATAL: ', err);
          process.exit(1);
        }
      }
    });

    // 
    formData.set('properties', createProperties({ ...record, origin: Array.from(originalContent) }));

    // Upload to application
    console.info('>> Uploading');
    await uploadEntry(formData);
    
  } else {
    console.log('! Error: No Record Found for: ', key);
  }
}

console.log('> Complete');