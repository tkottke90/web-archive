import { Container, Inject, Injectable } from '@decorators/di';
import { PostFile } from '@prisma/client';
import { randomUUID } from 'crypto';
import { readFile } from 'fs/promises';
import { PostFileDao } from '../dao/post-file.dao';
import { JobScheduler } from '../jobs';
import { spawnCommand } from '../utilities/shell.utils';
import { FileSystemFactory } from './file.service';
import { LoggerService } from './logger.service';

const BACKFILL_JOB = 'Placeholder Backfill';
const BACKFILL_CADENCE = '*/5 * * * *';
const BACKFILL_BATCH_SIZE = 25;

// Width (px) of the generated placeholder. Small enough to stay under
// ~1kB as a base64 data URI while still hinting at the image contents.
const PLACEHOLDER_WIDTH = 20;

const PROBE_TIMEOUT_MS = 10_000;
const GENERATE_TIMEOUT_MS = 15_000;

type PlaceholderSource = Pick<PostFile, 'id' | 'mime' | 'filename'>;

@Injectable()
export class PlaceholderService {
  private serviceLogger: LoggerService;

  // Instance indirection so specs can stub the shell/fs calls
  protected runCommand = spawnCommand;
  protected readFile = readFile;

  constructor(
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao,
    @Inject('FileSystemFactory') private readonly fileSystem: FileSystemFactory,
    @Inject('JobScheduler') private readonly jobs: JobScheduler,
    @Inject('LoggerService') readonly logger: LoggerService
  ) {
    this.serviceLogger = logger.createLogger({
      location: 'PlaceholderService'
    });

    this.registerBackfillCronJob();
  }

  /**
   * Generates a blurred placeholder (tiny base64 data URI) and captures the
   * image dimensions for a PostFile record. Never throws: failures are logged
   * and persisted as an empty-string placeholder so the backfill job does not
   * retry the file forever.
   */
  async generateForFile(file: PlaceholderSource): Promise<void> {
    if (!file.mime.startsWith('image')) {
      return;
    }

    const tempPath = this.fileSystem.createUploadPath(
      `${randomUUID()}.placeholder.jpg`
    );

    try {
      const probe = await this.runCommand(
        'Placeholder Probe',
        'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height',
          '-of',
          'csv=s=x:p=0',
          file.filename
        ],
        { timeout: PROBE_TIMEOUT_MS }
      );

      if (!probe.success) {
        throw new Error(`ffprobe exited with code ${probe.code}`);
      }

      const [width, height] = probe.stdOut
        .join('')
        .trim()
        .split('x')
        .map(Number);

      if (!width || !height || isNaN(width) || isNaN(height)) {
        throw new Error(
          `Unable to parse dimensions from ffprobe output: [${probe.stdOut
            .join('')
            .trim()}]`
        );
      }

      const generate = await this.runCommand(
        'Placeholder Generate',
        'ffmpeg',
        [
          '-y',
          '-i',
          file.filename,
          '-vf',
          `scale=${PLACEHOLDER_WIDTH}:-1`,
          tempPath
        ],
        { timeout: GENERATE_TIMEOUT_MS }
      );

      if (!generate.success) {
        throw new Error(`ffmpeg exited with code ${generate.code}`);
      }

      const data = await this.readFile(tempPath);
      const placeholder = `data:image/jpeg;base64,${data.toString('base64')}`;

      await this.postFileDao.setPlaceholder(file.id, {
        width,
        height,
        placeholder
      });
    } catch (error) {
      this.serviceLogger.log('warn', 'Placeholder generation failed', {
        fileId: file.id,
        filename: file.filename,
        error: error instanceof Error ? error.message : String(error)
      });

      // Empty string marks the file as "attempted, do not retry" so the
      // backfill job (which queries placeholder IS NULL) skips it
      await this.postFileDao
        .setPlaceholder(file.id, {
          width: null,
          height: null,
          placeholder: ''
        })
        .catch((daoError) => {
          this.serviceLogger.log(
            'error',
            'Failed to persist placeholder sentinel',
            {
              fileId: file.id,
              error:
                daoError instanceof Error ? daoError.message : String(daoError)
            }
          );
        });
    } finally {
      await this.fileSystem.remove(tempPath);
    }
  }

  /**
   * Processes a batch of image files that are missing placeholder data.
   * Runs on a cron as a backfill for pre-existing files and as a safety
   * net for uploads where inline generation failed transiently.
   */
  async runBackfill() {
    const files = await this.postFileDao.findMissingPlaceholders(
      BACKFILL_BATCH_SIZE
    );

    if (files.length === 0) {
      return;
    }

    this.serviceLogger.log('info', 'Placeholder backfill batch starting', {
      count: files.length
    });

    for (const file of files) {
      await this.generateForFile(file);
    }

    this.serviceLogger.log('info', 'Placeholder backfill batch complete', {
      count: files.length
    });
  }

  private registerBackfillCronJob() {
    this.jobs.register(BACKFILL_JOB, () => this.runBackfill(), {
      timing: BACKFILL_CADENCE,
      start: true
    });
  }
}

Container.provide([
  { provide: 'PlaceholderService', useClass: PlaceholderService }
]);
