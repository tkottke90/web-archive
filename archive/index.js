import fetch from 'node-fetch';
import mime from 'mime-types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, resolve } from 'path';
import _ from 'lodash';
import { URL } from 'url';
import { database, saveDatabase } from './lib/database.js';
import secrets from './secrets.json' assert { type: 'json' };

console.dir(secrets);

/**
 * @typedef RedditT3
 * @property {'t3'} kind
 * @property {object} data
 * @property {string} name Post Identifier
 * @property {string} subreddit Name of the subreddit where the post is
 * @property {string} author Username of the author
 * @property {string} title Title of the post
 * @property {subreddit} subreddit_name_prefixed Community subreddit label - starts with 'r/'
 * @property {subreddit} url_overridden_by_dest **Not 100% Sure but does link to some media**
 * @property {boolean} over_18 Is NSFW marked
 * @property {subreddit} url URL to the post
 * @property {subreddit} selftext_html Inner HTML of the post if it is a text post
 * @property {subreddit} is_video Is the post flagged as a video
 * @property {number} created_utc Created timestamp in seconds
 * @property {string} permalink Subreddit Reference Link
 * 
*/

/**
 * @typedef RedditListing
 * @property {'Listing'} kind
 * @property {object} data Data for the listing
 * @property {string} data.after ID of the next post in the list
 * @property {number} data.dist Children size
 * @property {RedditT3[]} data.children
*/


const SKIP_EXISTING = true;
const targetFile = './upvoted.json';

function stupidGifVParser(url) {
  if (!url.endsWith('gifv')) {
    return url;
  }

  const parsedUrl = new Url(url)
}

/**
 * 
 * @param {RedditT3} post 
 */
function parsePost(post) {
  const { kind, data } = post;
  const { name, subreddit, author, title, subreddit_name_prefixed, url_overridden_by_dest, over_18, url, is_video, selftext_html, permalink, gallery_data } = data;

  const content = []

  if (url) {
    content.push({ type: 'media', key: 'url', path: url, filename: '' });
  }

  if (url_overridden_by_dest) {
    content.push({ type: 'media', key: 'url_override', path: url, filename: '' });
  }

  if (selftext_html) {
    content.push({ type: 'html', key: 'selftext_html', value: selftext_html });
  }

  // if (gallery_data) {
  //   content.push({ type: 'media', key: 'gallery', value: })
  // }

  if (is_video) {
    content.push({ type: 'media', key: 'secure_media.reddit_video.fallback_url', path: _.get(data, 'secure_media.reddit_video.fallback_url'), filename: '' })
  }

  return ({ id: name, subredditName: subreddit, author, title, subreddit: subreddit_name_prefixed, isAdultOnly: over_18, content, errors: [], sourceList: '', permalink });
}

async function getContent(url) {
  return fetch(url)
    .then(async response => {
      const contentType = response.headers.get('Content-Type');
      const data = await response.arrayBuffer()

      if (data.byteLength === 0) {
        throw new Error(`Zero Byte File returned for: ${url}`);
      }

      return { contentType, data, error: '' };
    })
    .catch(error => ({ contentType: '', data: new ArrayBuffer(), error: error.message }));
}


/**
 * @returns {RedditListing | null}
 */
function getData(url) {
  const options = {
    headers: {
      'user-agent': 'insomnia/2023.1.0',
      cookie: secrets.token
    }
  }

  return fetch(url, options)
    .then(async response => {
      if (response.status >= 400) {
        console.error('============================================');
        console.error(`Error Fetching Data: ${response.statusText}`);
        console.error(`  URL: ${url}`);
        console.error(`  Data: ${await response.text()}`);
        console.error('============================================');
        
        process.exit(response.status);
      }

      return response;
    })
    .then(response => response.json())
    .catch(error => {
      console.error(error);
      return null
    });
}

/**
 * 
 * @param {Url} url URL to to the reddit resource you wish to aquire
 */
async function* fetchRedditData(url) {
  let done = false;
  let nextPost = '';

  while (!done) {
    const _url = new URL(url);
    if (nextPost) {
      _url.searchParams.append('after', nextPost);
    }

    const result = await getData(_url.toString());

    if (!result || !result.data.after) {
      done = true;
    }

    if (result) {
      const { after, children } = result.data;
      nextPost = after;
      yield children;
    }
  }
}

const baseUrl = new URL(secrets.upVotesPath, `https://www.reddit.com`);

let reqCount = 0;
let newCount = 0;
for await (let posts of fetchRedditData(baseUrl)) {
  reqCount++;
  console.log(`> Page: ${reqCount}`)
  await Promise.all(posts.map(async (post, index) => {
    const parsed = parsePost(post);
    
    if (SKIP_EXISTING && database.get(parsed.id)) {
      console.log(`>> Skipped: ${parsed.permalink} [Index: ${index}]`);
      return;
    }

    console.log(`>> Loading: ${parsed.permalink} [Index: ${index}]`)

    newCount++;
    database.set(parsed.id, parsed);
    const record = database.get(parsed.id);
    
    

    const media = record.content.filter(r => r.type === 'media');

    for (let item of media) {
      const { data: arrayBufferResponse, error, contentType }  = await getContent(item.path);
      const extension = mime.extension(contentType)
      const imgBuffer = Buffer.from(arrayBufferResponse);
      
      if (!error) {
        const filename = basename(item.path)
        item.filename = filename.endsWith(extension) ? filename : `${filename}.${extension}` ;
        writeFileSync(`./output/${item.filename}`, imgBuffer);
      } else {
        record.errors.push(error);
      }
    }
  }));
}

console.log(`
=== Update Complete ==
======================
Summary:
  Database Size:   ${database.size}
  New Items Added: ${newCount}
======================
`);

writeFileSync('./output/_database.json', JSON.stringify(Array.from(database), null, 2), 'utf-8');