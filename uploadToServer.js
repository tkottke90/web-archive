import { readFileSync, existsSync, writeFileSync, createReadStream } from 'fs'
import { database } from './lib/database.js';
import { Blob, Buffer } from 'node:buffer';
import mime from 'mime-types';
import { up } from 'inquirer/lib/utils/readline.js';
import { parseResponse } from './lib/http.js';
import { resolve } from 'path';

// const form = new FormData();
// form.append("author", "Overall-Donut-7393");
// form.append("label", "Enemy (jay nayler) pt. 2");
// form.append("source", "https://reddit.comr/FurryOnHuman");
// form.append("metadata[0]", "{\n\t\"name\": \"PERMALINK\",\n\t\"value\": \"https://reddit.com//r/FurryOnHuman/comments/zaemxm/enemy_jay_nayler_pt_2/\"\n}");
// form.append("file", "/Users/thomaskottke/Downloads/Temp/enemy-jay-nayler-pt-2-v0-34c3rmlrpf3a1.webp");
// form.append("file", "/Users/thomaskottke/Downloads/Temp/enemy-jay-nayler-pt-2-v0-uyl0g9jrpf3a1.webp");
// form.append("file", "/Users/thomaskottke/Downloads/Temp/enemy-jay-nayler-pt-2-v0-pwqm8rfrpf3a1.webp");
// form.append("file", "/Users/thomaskottke/Downloads/Temp/enemy-jay-nayler-pt-2-v0-fqkwi6drpf3a1.webp");
// form.append("file", "/Users/thomaskottke/Downloads/Temp/enemy-jay-nayler-pt-2-v0-7tp1g09rpf3a1.webp");
// form.append("metadata[1]", "{\n\t\"name\": \"SOURCE_ID\",\n\t\"value\": \"zaemxm\"\n}");

// const options = {
//   method: 'POST',
//   headers: {'Content-Type': 'multipart/form-data; boundary=---011000010111000001101001'}
// };

// options.body = form;

// fetch('http://10.0.0.7:15100/post/', options)
//   .then(response => response.json())
//   .then(response => console.log(response))
//   .catch(err => console.error(err));


// const API_ROOT = 'http://10.0.0.7:15100'
const API_ROOT = 'http://0.0.0.0:5000'
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