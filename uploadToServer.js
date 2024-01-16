#! /usr/bin/env node

import { readFileSync } from 'fs';
import mime from 'mime-types';
import { Blob } from 'node:buffer';
import { resolve } from 'path';
import { database } from './lib/database.js';
import { parseResponse } from './lib/http.js';

const [,,host] = process.argv;

const API_ROOT = host ?? 'http://0.0.0.0:5000'
const keys = Array.from(database.keys());

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
  console.log(`> Uploading: ${post.title} [${post.permalink}]`);

  let response;

  if (post.content.some(item => item.filename.endsWith('html'))) {
    console.log('  > Content is an HTML Document, re-downloading using Reddit service');

    const query = new URLSearchParams();
    query.append('target', `https://reddit.com${post.permalink.replace(/\/$/, "")}`);

    response = await fetch(`${API_ROOT}?${query.toString()}`).then(parseResponse);
  } else {
    const form = new FormData();
    form.append('author', post.author);
    form.append('label', post.title);
    form.append('source', `https://reddit.com${post.subreddit}`);
    
    createMetadataEntries(form, post);
    createContentEntries(form, post);

    response = await fetch(`${API_ROOT}/post`, { method: 'POST', body: form }).then(parseResponse);;
  }

  if (response.status < 400) {
    console.log(`  > Request Submitted Successfully`);
    console.log(`  | Record ID: ${response.data.id} |`)
  } else {
    console.log(`  > Request Failed`)
    console.log(`  | Status: ${response.status}`)
    console.log(`  | Details: ${response.message}`)
  }

}

const p = database.get(keys[0]);

uploadToServer(p);