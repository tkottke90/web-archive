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
import { JSDOM } from 'jsdom';
import { HTTPError, NotFoundError } from '../utilities/errors.util';
import { LoggerService } from './logger.service';
import { PostTagDao } from '../dao/post-tag.dao';
import { NS_PER_SEC, NS_TO_MS, SYSTEM_TAGS } from '../constants';
import { Post } from '@prisma/client';
import mime from 'mime-types';
import { randomUUID } from 'crypto';
import { basename } from 'path';

@Injectable()
export class RedditScraper {
  private bulkDownloads = new Map<string, Promise<void>>();

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

    const start = process.hrtime();

    const newPosts: RedditPost[] = [];
    let postPageCount = 0;

    for await (const posts of this.getAllRedditItems(url, headers)) {
      postPageCount++;
      this.logger.log(
        'debug',
        `[RedditParser] Loading Posts from page: ${postPageCount}`,
        { url, postPageCount }
      );
      const reqPostMap = new Map(posts.map((post) => [post.data.id, post]));

      const newKeys = await this.postDao.findWhereMissingSource(
        Array.from(reqPostMap.keys())
      );

      for (const { id } of newKeys) {
        // The id comes from the reqPostMap so we KNOW it exists
        // await this.parsePost(reqPostMap.get(id) as RedditPost);
        newPosts.push(reqPostMap.get(id) as RedditPost);
      }
    }

    const diff = process.hrtime(start);
    const duration = (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;

    // Load new posts into the queue
    const downloadId = randomUUID();
    this.bulkDownloads.set(randomUUID(), this.startBatchDownload(newPosts));

    return {
      message: 'Starting Bulk Download',
      newRecords: newPosts.length,
      duration: `${duration.toFixed(2)} secs`
    };
  }

  getPostByUrl(url: string) {
    this.logger.log('debug', 'Fetching post from Reddit', { url });
    return this.getRedditJSON(new URL(url)).then(
      async (listings: RedditResponse) => {
        const parsedList = listings.filter(
          (listing) =>
            listing.data.children.filter((child) => child.kind === 't3').length
        );

        const postListing = parsedList.shift();

        if (!postListing) {
          return;
        }

        // Extract the post from the listing object
        const post = this.getPostsFromListing(postListing).shift();

        if (post) {
          // Check the database for a post matching the post id
          this.logger.log('debug', 'Check for post with matching ID', {
            source_id: post?.data.id
          });

          const existingPost = await this.postDao.getByMetadataValue(
            RedditPostMetadataKeys.SOURCE_ID,
            post?.data.id
          );

          // New posts are returned by findMissingSource
          if (!existingPost) {
            this.logger.log('debug', 'Creating new post', {
              source_id: post?.data.id
            });

            // Create new post entry
            const postCreateDTO = await this.parsePost(post);
            // Save to database
            const newPost = await this.postDao.create(postCreateDTO);
            // Add default tags
            await this.addDefaultTags(newPost, post);
            // Return
            const postDetails = await this.postDao.getById(newPost.id);

            return this.postDao.toDTO(postDetails);
          } else {
            this.logger.log('debug', 'Existing Post Found in Database', {
              source_id: post?.data.id
            });

            return this.postDao.toDTO(existingPost);
          }
        }
      }
    );
  }

  private async addDefaultTags(newPost: Post, redditData: RedditPost) {
    this.logger.log('debug', 'Updating Tags');

    if (redditData.data.over_18) {
      await this.postTagDao.addOrCreateTag(newPost.id, SYSTEM_TAGS.NSFW);
    }
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

      // Not part of the RedditListing structure
      // but when an error is returned then we see this property
      if ('error' in data) {
        const { error, message } = data as any;

        throw new HTTPError(message, error);
      }

      if (!data?.data?.children || !data?.data?.after) {
        done = true;
      }

      if (data) {
        const { after, children } = data.data;
        nextPost = after;
        yield children;
      } else {
        done = true;
        yield [];
      }
    }
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

  private getRedditJSON(url: URL, headers?: Headers) {
    const _headers = new Headers(headers);

    url.pathname = url.pathname + '.json';

    return fetch(url.toString(), { headers: _headers })
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new HTTPError(data.message, data.error);
        }

        return data;
      });
  }

  private async getRedditPostContents(post: RedditPost) {
    const { id, is_video, selftext, title, url, media, media_metadata } =
      post.data;

    let fileDetails: {
      contentType: string | null;
      data: Buffer;
      error: string;
    }[];

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

    return fileDetails;
  }

  private getPostsFromListing(listing: RedditListing) {
    const posts = listing.data.children.filter((child) => child.kind === 't3');

    return posts;
  }

  private async htmlParser(html_url: string, targetElement: string) {
    const html = await JSDOM.fromURL(html_url);

    return html.window.document.querySelector(targetElement);
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

  private async parsePost(post: RedditPost) {
    this.logger.log('debug', 'Processing Reddit Post');

    const { author, id, permalink, subreddit_name_prefixed, title, url } =
      post.data;

    // Create the new entry record
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

    const fileDetails: {
      contentType: string | null;
      data: Buffer;
      error: string;
    }[] = await this.getRedditPostContents(post);

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

    return newEntry;
  }

  private async startBatchDownload(snapshot: RedditPost[]) {
    const newPosts: PostCreateDTO[] = [];
    this.logger.log('info', 'Starting Batch Download');

    // Start downloading
    for (const post of snapshot) {
      newPosts.push(await this.parsePost(post));

      // Adding a delay to avoid getting rate limited;
      await delay(10000);
    }

    this.logger.log('info', 'Bulk adding records', { count: newPosts.length });
    await this.postDao.bulkCreate(newPosts);
  }

  private textToMarkdown(title: string, text: string) {
    const file = `# ${title}

${text}`;

    return { data: Buffer.from(file), contentType: 'text/markdown', error: '' };
  }
}

function delay<V, T extends (...args: any) => V>(timeout: number) {
  return new Promise((res) => {
    setTimeout(() => {
      res(true);
    }, timeout);
  });
}

Container.provide([{ provide: 'RedditScraper', useClass: RedditScraper }]);
