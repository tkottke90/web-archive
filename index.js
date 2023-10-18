import fetch from 'node-fetch';
import mime from 'mime-types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, resolve } from 'path';
import _ from 'lodash';
import { URL } from 'url';
import { database, saveDatabase } from './lib/database.js';

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
      cookie: 'reddit_session=36557870%2C2023-06-12T01%3A19%3A03%2C3abe43446e4ae5fa7690aaa0d743d053329a9853; edgebucket=TyDdMSTT3scGd9EcP2; token_v2=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJleUpoYkdjaU9pSlNVekkxTmlJc0ltdHBaQ0k2SWxOSVFUSTFOanB6UzNkc01ubHNWMFZ0TWpWbWNYaHdUVTQwY1dZNE1YRTJPV0ZGZFdGeU1ucExNVWRoVkd4amRXTlpJaXdpZEhsd0lqb2lTbGRVSW4wLmV5SnpkV0lpT2lKMWMyVnlJaXdpWlhod0lqb3hOamcyTmpFNU16Y3lMamM1TkRreU5Td2lhV0YwSWpveE5qZzJOVE15T1RjeUxqYzVORGt5TkN3aWFuUnBJam9pVEZrMFUyWXhTR05FU2xOSWNsWkRlbGh0TTNCdGNYWldUV3hzYkhaUklpd2lZMmxrSWpvaU9YUk1iMFl3YzI5d05WSktaMEVpTENKc2FXUWlPaUowTWw5c2NtczRaU0lzSW1GcFpDSTZJblF5WDJ4eWF6aGxJaXdpYkdOaElqb3hOREkxTWpJM016WTRNalV5TENKelkzQWlPaUpsU25ocmEyUkhUemxEUVVsb1pDMUdZVFZmWjJZMVZWOXROREZXVDJ0T1YzQlJTSE5hVGpVdFdYbDFaRXB1ZGxaQkxXUlVOR1pSWDFsSk1WVkpUVUpIUWtGR2FWTjBlV0pSV1VGcmJVUlBXbEZuUkUxT1JIQnlhVk5SVVRSRmJIRk1SemhKVVVKdFltdFJNVnBoVFdOaFZ6TjNaMEpMYVdORk4yVldTSEJqTW05aFZXSnBOVFJrZGpad2VVeHFlWEJQVldac00wNXFiVXhYZUZBNVJFMWljVEF5Y0ZkT1dsUnRZMUl4Y0ZoUlYweGZiMXBQT1ZNek9YVlZlbDlUWVRCU09FOUxjWFpIUW05NVRWazRYMGhhVjAxYWFVZDJabmh1Y0hJd1drWXdkM0UzTTB4UlYzQm1ObkpITnpsclYxUXdSRXMwWDFKNGRuWkVZVlJIV0VwbGJYQTNVbDkwTXpGVExXcEJVR05mVERsT2NVSkhZWFkzV0hKeWRGZGlkRjh4VVRWVmVtbHFVbGRLZWpST1FuazFZM1pyWlhaM1ZHSk9aV3htTkROYWEweE1ORnBqWkUxaVptMXpOazl1U25nMGRFTnVPR1pWWWtGQlJGOWZNVGhUTWtaRklpd2ljbU5wWkNJNkltOXZkR1ZqWlVGRUxYcEZPR2hmUm5sR1luSm1VMnBzYmpGMGNVUTFhMlF6YkMxUFNFeGFkRjlLYkc4aUxDSm1iRzhpT2pKOS5WeVF6YjZUWGlkaGFXckxmZUdsQkx3UzNQNzNLV0JXa3piTG9GMW5JN3lZMG51Smphb3djaDdDUzJ0VHRJVTRXMjBlSXM5V2MtMDRSZEtZNW9SMHpkTm9nLWNwU0hqQ19SODRYNG84WWx2aFlldW9YV3h1LXBWYTViZ0wtSGFxUDJKdnlTbFlZUmdOLUx0UTlxSlZ3ZkZKbm1sVHdlcEcwb1JVOXZlenpaU2lnVXlJdjhjdEVqRnYzV0kwNkczZk5LQWpvaWtXeG4welBYX3c5REM0VTMzQmZqV3Y4azhzNkFNNkZ3UWRQRk0zNDlGWGhkQWZtd3h6cTNrV3lMd1UtSXRhdVZ2SlJlQ2h4QWthdzFBTU5sNkl3U3NGaHlaZDAxd2YwS291UHdieXFOUFh2blZpTzJBN0RlVW92YzlTclVicm5Ia0pUYUtjYVJBblgzNVZ6RWciLCJleHAiOjE2ODY2MTkyNTIsImxvZ2dlZEluIjp0cnVlLCJzY29wZXMiOlsiKiIsImVtYWlsIiwicGlpIl0sImNpZCI6Ijl0TG9GMHNvcDVSSmdBIn0.l-f1h0gmJSc8Ye1WcWUVii4RYN-wUapBZCMYheHYH88; loid=0000000000000lrk8e.2.1425227368252.Z0FBQUFBQmtobktIbG5XRjk5N05zdVVZVXJqQy0tYTdUOU50eGsxd1lHdW1wSGY4aGktTkFZbG9Ud1NzNWZnbWUwSE1lUWFzVXJpVXp1d0hXME9RSjhlckQ2MFZ4UDVBZG1PeUhxcFVzeGE0amRRNG9nUjNMRG5tRFp6T1hLa1pzOENLeW8tNHllVGs; csv=2'
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

const baseUrl = new URL('/user/altotom90/upvoted.json', `https://www.reddit.com`);

let reqCount = 0
for await (let posts of fetchRedditData(baseUrl)) {
  reqCount++;
  console.log(`> Page: ${reqCount}`)
  await Promise.all(posts.map(async (post, index) => {
    const parsed = parsePost(post);
    console.log(`>> Loading: ${index}`)
    
    if (SKIP_EXISTING && database.get(parsed.id)) {
      return;
    }

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

writeFileSync('./output/_database.json', JSON.stringify(Array.from(database), null, 2), 'utf-8');