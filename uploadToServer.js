#! /usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import mime from 'mime-types';
import { Blob } from 'node:buffer';
import { resolve } from 'path';
import { database } from './lib/database.js';
import { parseResponse } from './lib/http.js';

const [,,host] = process.argv;

const API_ROOT = host ?? 'http://0.0.0.0:5000'
const keys = Array.from(database.keys());

let created = 0;
const failed = [];

function createMetadataEntries(form, post) {
  const metadata = [
    JSON.stringify({ name: 'PERMALINK', value: `https://reddit.com${post.permalink}` }),
    JSON.stringify({ name: 'SOURCE_ID', value: post.id })
  ]


  metadata.forEach((item, index) => {
    form.append(`metadata[${index}]`, item);
  })
}

function createContentEntries(form, post) {
  post.content.forEach(item => {
    const path = resolve(`./output/${item.filename}`);

    const file = readFileSync(path);
    const mimeType = mime.lookup(path);
    const blob = new Blob([file], { type: mimeType });

    form.append('file', blob, post.filename);
  });
}

async function uploadToServer(post) {
  // Check if content is an HTML Document, we need to 
  // re-ingest those documents to get the content from them
  console.log(`> Uploading: ${post.title.substring(0, 10)} [${post.permalink}]`);

  const existsQuery = new URLSearchParams();
  existsQuery.append('sourceId[0]', post.id);
  const exists = await fetch(`${API_ROOT}/post?${existsQuery.toString()}`).then(parseResponse);

  if (exists.data.pagination.totalItems > 0) {
    console.log(`  > Post Already Exists. Skipping....`);
    return;
  }

  if (post.content.some(item => item.filename?.length === 0)) {
    console.log(`  > File is empty, Skipping....`);
    return;
  }

  let response;

  if (post.content.some(item => item.filename.endsWith('html'))) {
    console.log('  > Content is an HTML Document, re-downloading using Reddit service');

    const query = new URLSearchParams();
    query.append('target', `https://reddit.com${post.permalink.replace(/\/$/, "")}`);

    response = await fetch(`${API_ROOT}/parsers/reddit?${query.toString()}`)
      .then(parseResponse);
  } else { 
    const form = new FormData();
    form.append('author', post.author);
    form.append('label', post.title);
    form.append('source', `https://reddit.com${post.subreddit}`);
    
    createMetadataEntries(form, post);
    createContentEntries(form, post);

    response = await fetch(`${API_ROOT}/post`, { method: 'POST', body: form }).then(parseResponse);

    if (post.isAdultOnly) {
      console.log(`  > Adding NSFW Tag`);
      await fetch(`${API_ROOT}/post/${response.data.id}/tags/1`, { method: 'POST'})
    }
  }

  if (response.status < 400) {
    console.log(`  > Request Submitted Successfully`);
    console.log(`  | Record ID: ${response.data.id} |`)
    created++;
  } else {
    console.log(`  > Request Failed`)
    console.log(`  | Status: ${response.status}`)
    console.log(`  | Details: ${response.message}`)
    throw new Error(response.message);
  }

}

for (const key of keys) {
  const record = database.get(key);

  try {
    await uploadToServer(record);
  } catch (err) {
    failed.push({ key: record.id, desc: err.message, url: `https://reddit.com${record.permalink}` })
  }
}

const output = `
===================
Process Complete

  => Records Created: ${created}
  => Errors:

${failed.map(item => `${item.key} | ${item.desc} | ${item.url}`).join('\n')}
`

writeFileSync('uploadToServer.log', output, { encoding: 'utf-8' });