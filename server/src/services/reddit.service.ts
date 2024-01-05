import { Container, Inject, Injectable } from '@decorators/di';
import { PostDao } from '../dao/post.dao';
import {
  MediaMetadataValue,
  RedditListing,
  RedditPost,
  RedditPostMetadataKeys,
  RedditResponse
} from '../interfaces/reddit.interface';
import { PostCreateDTO } from '../dto/post.dto';
import { FileSystemFactory } from './file.service';
import mime from 'mime-types';
import { randomUUID } from 'crypto';
import { JSDOM } from 'jsdom';
import { NotFoundError } from '../utilities/errors.util';
import { basename } from 'path';
import { LoggerService } from './logger.service';
import { PostTagDao } from '../dao/post-tag.dao';
import { NS_PER_SEC, NS_TO_MS, SYSTEM_TAGS } from '../constants';

@Injectable()
export class RedditScraper {
  constructor(
    @Inject('PostDao') private readonly postDao: PostDao,
    @Inject('PostTagDao') private readonly postTagDao: PostTagDao,
    @Inject('FileSystemFactory') private readonly fileSystem: FileSystemFactory,
    @Inject('LoggerService') private readonly logger: LoggerService
  ) {}

  // TODO - This gets rate limited with a 410 after a while
  // Need to look at doing this slightly differently, possibly with CRON
  async batchPosts(url: string, authorization: string) {
    const headers = new Headers();
    headers.append('user-agent', 'insomnia/2023.1.0');

    if (authorization) {
      headers.set('cookie', authorization);
    }

    let newRecordCount = 0;
    const start = process.hrtime();

    for await (const posts of this.getAllRedditItems(url, headers)) {
      const reqPostMap = new Map(posts.map((post) => [post.data.id, post]));

      const newKeys = await this.postDao.findWhereMissingSource(
        Array.from(reqPostMap.keys())
      );

      for (const { id } of newKeys) {
        // The id comes from the reqPostMap so we KNOW it exists
        await this.parsePost(reqPostMap.get(id) as RedditPost);
      }

      newRecordCount += newKeys.length;

      // debugger;
    }

    const diff = process.hrtime(start);

    return {
      newRecords: newRecordCount,
      duration: (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS
    };
  }

  getPostByUrl(url: string) {
    this.logger.log('debug', 'Fetching post from Reddit', { url });
    return this.getRedditJSON(new URL(url)).then((listings: RedditResponse) => {
      const parsedList = listings.filter(
        (listing) =>
          listing.data.children.filter((child) => child.kind === 't3').length
      );

      const postListing = parsedList.shift();

      if (!postListing) {
        return;
      }

      const post = this.getPostsFromListing(postListing).shift();

      if (post) {
        this.parsePost(post);
      }
    });
  }

  private async *getAllRedditItems(url: string, headers?: Headers) {
    let done = false;
    let nextPost = '';

    while (!done) {
      const _url = new URL(url);

      if (nextPost) {
        _url.searchParams.append('after', nextPost);
      }

      const data: RedditListing = await this.getRedditJSON(_url, headers);

      if (!data || !data.data.children) {
        done = true;
      }

      if (data) {
        const { after, children } = data.data;
        nextPost = after;
        yield children;
      }
    }
  }

  private getRedditJSON(url: URL, headers?: Headers) {
    const _headers = new Headers(headers);

    url.pathname = url.pathname + '.json';

    return fetch(url.toString(), { headers: _headers }).then((response) =>
      response.json()
    );
  }

  private getPostsFromListing(listing: RedditListing) {
    const posts = listing.data.children.filter((child) => child.kind === 't3');

    return posts;
  }

  private async parsePost(post: RedditPost) {
    this.logger.log('debug', 'Processing Reddit Post');

    const {
      author,
      id,
      is_video,
      over_18,
      permalink,
      selftext,
      subreddit_name_prefixed,
      title,
      url,
      media,
      media_metadata
    } = post.data;

    this.logger.log('debug', 'Check for post with matching ID', { id });
    const existingPost = await this.postDao.getByMetadataValue(
      RedditPostMetadataKeys.SOURCE_ID,
      id
    );

    if (existingPost) {
      this.logger.log('debug', 'Existing Post Found in Database', {
        id: existingPost.id,
        source_id: id
      });
      return this.postDao.toDTO(existingPost);
    } else {
      this.logger.log('debug', 'No match found', { id });
    }

    // Create the new entry record
    this.logger.log('debug', 'Creating new post', { id });
    const newEntry: PostCreateDTO = {
      author,
      label: title,
      source: `https://reddit.com${subreddit_name_prefixed}`,
      metadata: [
        {
          name: RedditPostMetadataKeys.PERMALINK,
          value: `https://reddit.com/${permalink}`
        },
        { name: RedditPostMetadataKeys.SOURCE_ID, value: id }
      ],
      files: []
    };

    let fileDetails: {
      contentType: string | null;
      data: Buffer;
      error: string;
    }[];

    // We need to check for the different types of posts
    //
    // Text apps will have a selftext property
    if (selftext) {
      // The post is a text post
      fileDetails = [this.textToMarkdown(title, selftext)];
    } else if (is_video && media?.reddit_video) {
      // The post is a video
      this.logger.log('debug', 'Downloading video from post', {
        url: media.reddit_video.fallback_url,
        id
      });
      fileDetails = [await this.mediaDownload(media.reddit_video.fallback_url)];
    } else if (url.match(/http[s]?:\/\/(www.|v3.)?redgifs.com/)) {
      // The post is a redgifs post

      const videoElem = await this.htmlParser(url, '[property="og:video"]');

      const contentStr = videoElem?.getAttribute('content') ?? '';
      if (videoElem && contentStr) {
        this.logger.log('debug', 'Downloading video from redgif', { url, id });
        fileDetails = [await this.mediaDownload(contentStr)];
      } else {
        throw new NotFoundError('Could not get RedGif content: ' + url);
      }
    } else if (
      url.startsWith('https://www.reddit.com/gallery') &&
      media_metadata
    ) {
      fileDetails = await this.getRedditGalleryImg(media_metadata);
    } else {
      // Assume it is a picture for now
      this.logger.log('debug', 'Downloading image from post', { url, id });
      fileDetails = [await this.mediaDownload(url)];
    }

    if (fileDetails.length > 0) {
      await Promise.all(
        fileDetails.map(async (detail) => {
          const extension = mime.extension(
            detail.contentType ?? 'application/json'
          );
          const newFilename = `${randomUUID()}.${extension}`;

          this.logger.log('debug', 'Saving files locally', {
            id,
            filename: newFilename
          });
          const filename = await this.fileSystem.upload(
            detail.data,
            newFilename
          );

          newEntry.files = [
            ...(newEntry.files ?? []),
            {
              filename,
              mime: detail.contentType ?? '',
              size: detail.data.length,
              encoding: '',
              original_filename: basename(url)
            }
          ];
        })
      );
    }

    this.logger.log('debug', 'Saving post data');
    const newPost = await this.postDao.create(newEntry);

    if (over_18) {
      await this.postTagDao.addOrCreateTag(newPost.id, SYSTEM_TAGS.NSFW);
    }

    const postDetails = await this.postDao.getById(newPost.id);

    return this.postDao.toDTO(postDetails);
  }

  private textToMarkdown(title: string, text: string) {
    const file = `# ${title}

${text}`;

    return { data: Buffer.from(file), contentType: 'text/markdown', error: '' };
  }

  private async getRedditGalleryImg(media: Record<string, MediaMetadataValue>) {
    return await Promise.all(
      Object.values(media).map((node) => {
        const url = node.s.u ?? node.p.pop()?.u ?? node.o.pop()?.u ?? '';

        const parsedUrl = JSDOM.fragment(url);

        if (!parsedUrl.textContent) {
          return {
            contentType: '',
            data: Buffer.from(''),
            error: `Could Not Parse Escaped URL [url: ${url}]`
          };
        }

        return this.mediaDownload(parsedUrl.textContent);
      })
    );
  }

  private mediaDownload(img_url: string) {
    return fetch(img_url)
      .then(async (response) => {
        const contentType = response.headers.get('Content-Type');
        const data = await response.arrayBuffer();

        if (data.byteLength === 0) {
          throw new Error(`Zero Byte File returned for: ${img_url}`);
        }

        return { contentType, data: Buffer.from(data), error: '' };
      })
      .catch((error) => ({
        contentType: '',
        data: Buffer.from(''),
        error: error.message
      }));
  }

  private async htmlParser(html_url: string, targetElement: string) {
    const html = await JSDOM.fromURL(html_url);

    return html.window.document.querySelector(targetElement);
  }
}

Container.provide([{ provide: 'RedditScraper', useClass: RedditScraper }]);
