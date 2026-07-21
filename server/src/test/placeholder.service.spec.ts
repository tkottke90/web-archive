import chai from 'chai';
import sinon from 'sinon';
import { PlaceholderService } from '../services/placeholder.service';
import type { PostFileDao } from '../dao/post-file.dao';
import type { FileSystemFactory } from '../services/file.service';
import type { JobScheduler } from '../jobs';
import type { LoggerService } from '../services/logger.service';
import { BaseError } from '../utilities/errors.util';

chai.should();

describe('PlaceholderService', () => {
  const postFileDao = {
    setPlaceholder: sinon.stub(),
    findMissingPlaceholders: sinon.stub(),
    getPlaceholderStatus: sinon.stub()
  };
  const fileSystem = {
    createUploadPath: sinon.stub(),
    remove: sinon.stub()
  };
  const jobs = {
    register: sinon.stub()
  };
  const log = sinon.stub();
  const logger = {
    createLogger: () => ({ log })
  };

  const makeService = () =>
    new PlaceholderService(
      postFileDao as unknown as PostFileDao,
      fileSystem as unknown as FileSystemFactory,
      jobs as unknown as JobScheduler,
      logger as unknown as LoggerService
    );

  const cmdResult = (
    overrides: Partial<{
      success: boolean;
      code: number;
      stdOut: string[];
    }> = {}
  ) => ({
    label: 'test',
    command: 'test',
    success: true,
    code: 0,
    stdOut: [],
    stdErr: [],
    ...overrides
  });

  beforeEach(() => {
    postFileDao.setPlaceholder.reset();
    postFileDao.setPlaceholder.resolves();
    postFileDao.findMissingPlaceholders.reset();
    postFileDao.getPlaceholderStatus.reset();
    postFileDao.getPlaceholderStatus.resolves({
      total: 10,
      pending: 4,
      failed: 1,
      complete: 5
    });
    fileSystem.createUploadPath.reset();
    fileSystem.createUploadPath.returns('/tmp/uploads/temp.placeholder.jpg');
    fileSystem.remove.reset();
    fileSystem.remove.resolves();
    jobs.register.reset();
    log.reset();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should register the backfill cron job on construction', () => {
    makeService();

    jobs.register.calledOnce.should.equal(true);
    const [name, , options] = jobs.register.firstCall.args;
    name.should.equal('Placeholder Backfill');
    options.timing.should.equal('*/5 * * * *');
    options.start.should.equal(true);
  });

  describe('generateForFile', () => {
    it('should persist dimensions and a data URI on success', async () => {
      const service = makeService();
      const runCommand = sinon.stub(service as any, 'runCommand');
      runCommand
        .onFirstCall()
        .resolves(cmdResult({ stdOut: ['640x480\n'] }))
        .onSecondCall()
        .resolves(cmdResult());
      sinon.stub(service as any, 'readFile').resolves(Buffer.from('tiny-jpeg'));

      await service.generateForFile({
        id: 42,
        mime: 'image/jpeg',
        filename: '/uploads/photo.jpg'
      });

      postFileDao.setPlaceholder.calledOnce.should.equal(true);
      const [fileId, data] = postFileDao.setPlaceholder.firstCall.args;
      fileId.should.equal(42);
      data.width.should.equal(640);
      data.height.should.equal(480);
      data.placeholder.should.match(/^data:image\/jpeg;base64,/);
      fileSystem.remove.calledOnce.should.equal(true);
    });

    it('should no-op for unsupported mime types', async () => {
      const service = makeService();
      const runCommand = sinon.stub(service as any, 'runCommand');

      await service.generateForFile({
        id: 42,
        mime: 'application/pdf',
        filename: '/uploads/doc.pdf'
      });

      runCommand.called.should.equal(false);
      postFileDao.setPlaceholder.called.should.equal(false);
    });

    it('should generate a poster frame for video mime types by seeking ahead', async () => {
      const service = makeService();
      const runCommand = sinon.stub(service as any, 'runCommand');
      runCommand
        .onFirstCall()
        .resolves(cmdResult({ stdOut: ['1920x1080\n'] }))
        .onSecondCall()
        .resolves(cmdResult());
      sinon.stub(service as any, 'readFile').resolves(Buffer.from('tiny-jpeg'));

      await service.generateForFile({
        id: 43,
        mime: 'video/mp4',
        filename: '/uploads/clip.mp4'
      });

      runCommand.calledTwice.should.equal(true);
      const generateArgs = runCommand.secondCall.args[2];
      generateArgs.should.include('-ss');
      generateArgs.should.include('-vframes');

      const [fileId, data] = postFileDao.setPlaceholder.firstCall.args;
      fileId.should.equal(43);
      data.width.should.equal(1920);
      data.height.should.equal(1080);
      data.placeholder.should.match(/^data:image\/jpeg;base64,/);
    });

    it('should retry from the first frame when the seek offset is past a short clip', async () => {
      const service = makeService();
      const runCommand = sinon.stub(service as any, 'runCommand');
      runCommand
        .onFirstCall()
        .resolves(cmdResult({ stdOut: ['640x360\n'] }))
        .onSecondCall()
        .resolves(cmdResult({ success: false, code: 1 }))
        .onThirdCall()
        .resolves(cmdResult());
      sinon.stub(service as any, 'readFile').resolves(Buffer.from('tiny-jpeg'));

      await service.generateForFile({
        id: 44,
        mime: 'video/mp4',
        filename: '/uploads/short.mp4'
      });

      runCommand.calledThrice.should.equal(true);
      const retryArgs = runCommand.thirdCall.args[2];
      retryArgs.should.not.include('-ss');

      postFileDao.setPlaceholder.calledOnce.should.equal(true);
      postFileDao.setPlaceholder.firstCall.args[1].placeholder.should.match(
        /^data:image\/jpeg;base64,/
      );
    });

    it('should persist the sentinel when ffprobe fails', async () => {
      const service = makeService();
      sinon
        .stub(service as any, 'runCommand')
        .resolves(cmdResult({ success: false, code: 1 }));

      await service.generateForFile({
        id: 42,
        mime: 'image/png',
        filename: '/uploads/broken.png'
      });

      postFileDao.setPlaceholder.calledOnce.should.equal(true);
      const [fileId, data] = postFileDao.setPlaceholder.firstCall.args;
      fileId.should.equal(42);
      chai.expect(data.width).to.equal(null);
      chai.expect(data.height).to.equal(null);
      data.placeholder.should.equal('');
    });

    it('should persist the sentinel when dimensions are unparsable', async () => {
      const service = makeService();
      sinon
        .stub(service as any, 'runCommand')
        .resolves(cmdResult({ stdOut: ['not-dimensions'] }));

      await service.generateForFile({
        id: 42,
        mime: 'image/png',
        filename: '/uploads/odd.png'
      });

      postFileDao.setPlaceholder.calledOnce.should.equal(true);
      postFileDao.setPlaceholder.firstCall.args[1].placeholder.should.equal('');
    });

    it('should persist the sentinel and not throw when spawn rejects', async () => {
      const service = makeService();
      sinon
        .stub(service as any, 'runCommand')
        .rejects(
          new BaseError('DOWNLOAD_SCRIPT_ERROR: spawn ffprobe ENOENT', {})
        );

      await service.generateForFile({
        id: 42,
        mime: 'image/jpeg',
        filename: '/uploads/photo.jpg'
      });

      postFileDao.setPlaceholder.calledOnce.should.equal(true);
      postFileDao.setPlaceholder.firstCall.args[1].placeholder.should.equal('');
    });
  });

  describe('runBackfill', () => {
    it('should do nothing when no files are missing placeholders', async () => {
      const service = makeService();
      const generate = sinon.stub(service, 'generateForFile').resolves();
      postFileDao.findMissingPlaceholders.resolves([]);

      await service.runBackfill();

      generate.called.should.equal(false);
    });

    it('should generate a placeholder for each file in the batch', async () => {
      const service = makeService();
      const generate = sinon.stub(service, 'generateForFile').resolves();
      const batch = [
        { id: 1, mime: 'image/png', filename: '/uploads/a.png' },
        { id: 2, mime: 'image/jpeg', filename: '/uploads/b.jpg' },
        { id: 3, mime: 'image/gif', filename: '/uploads/c.gif' }
      ];
      postFileDao.findMissingPlaceholders.resolves(batch);

      await service.runBackfill();

      generate.callCount.should.equal(3);
      generate.firstCall.args[0].should.deep.equal(batch[0]);
    });

    it('should log the remaining count after a batch', async () => {
      const service = makeService();
      sinon.stub(service, 'generateForFile').resolves();
      postFileDao.findMissingPlaceholders.resolves([
        { id: 1, mime: 'image/png', filename: '/uploads/a.png' }
      ]);

      await service.runBackfill();

      const completeLog = log
        .getCalls()
        .find((c) => c.args[1] === 'Placeholder backfill batch complete');

      chai.expect(completeLog).to.not.equal(undefined);
      completeLog?.args[2].remaining.should.equal(4);
      completeLog?.args[2].failed.should.equal(1);
      completeLog?.args[2].total.should.equal(10);
    });
  });
});
