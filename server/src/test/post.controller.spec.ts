import chai from 'chai';
import sinon from 'sinon';
import express from 'express';
import { PostController } from '../controllers/post.controller';
import { BadRequestError, NotFoundError } from '../utilities/errors.util';
import type { PostDao } from '../dao/post.dao';
import type { PostFileDao } from '../dao/post-file.dao';
import type { PostTagDao } from '../dao/post-tag.dao';
import type { TagDao } from '../dao/tag.dao';
import type { FileSystemFactory } from '../services/file.service';
import type { DownloadJobDao } from '../dao/download-job.dao';
import type { PlaceholderService } from '../services/placeholder.service';

chai.should();

describe('PostController - URL Upload', () => {
  const fetchStub = sinon.stub();
  const postDao = {
    getById: sinon.stub(),
    toDTO: sinon.stub()
  };
  const postFileDao = {
    create: sinon.stub()
  };
  const postTagDao = {} as unknown as PostTagDao;
  const tagDao = {} as unknown as TagDao;
  const fileSystem = {
    upload: sinon.stub()
  };
  const placeholderService = {
    generateForFile: sinon.stub()
  };

  before(() => {
    (globalThis as Record<string, unknown>).fetch = fetchStub;
  });

  beforeEach(() => {
    postDao.getById.reset();
    postDao.toDTO.reset();
    postFileDao.create.reset();
    fileSystem.upload.reset();
    fetchStub.reset();
    placeholderService.generateForFile.reset();
    placeholderService.generateForFile.resolves();
  });

  after(() => {
    delete (globalThis as Record<string, unknown>).fetch;
  });

  afterEach(() => {
    // sinon.restore() handles method stubs (sinon.stub(obj, 'method')).
    // These stubs are standalone, so the .reset() calls in beforeEach are
    // what actually clear state. Kept for consistency with the rest of the suite.
    sinon.restore();
  });

  const makeController = () =>
    new PostController(
      postDao as unknown as PostDao,
      postFileDao as unknown as PostFileDao,
      postTagDao,
      tagDao,
      fileSystem as unknown as FileSystemFactory,
      {} as unknown as DownloadJobDao,
      placeholderService as unknown as PlaceholderService
    );

  it('should download url content and add file to post', async () => {
    const controller = makeController();
    const next = sinon.spy();
    const json = sinon.spy();
    const res = { json } as unknown as express.Response;

    const existingPost = { id: 123 };
    const updatedPost = { id: 123, files: [{ id: 99 }] };
    postDao.getById.onFirstCall().resolves(existingPost);
    postDao.getById.onSecondCall().resolves(updatedPost);
    postDao.toDTO.returns(updatedPost);
    fileSystem.upload.resolves('/tmp/uploaded.mp3');
    fetchStub.resolves({
      ok: true,
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer
    });

    await controller.addFileUrlToPost(
      123,
      { url: 'https://example.com/files/sample.mp3' },
      res,
      next
    );

    postFileDao.create.calledOnce.should.equal(true);
    const [postId, payload] = postFileDao.create.firstCall.args;
    postId.should.equal(123);
    payload.mime.should.equal('audio/mpeg');
    payload.original_filename.should.equal('sample.mp3');
    payload.size.should.equal(3);

    json.calledOnce.should.equal(true);
    next.called.should.equal(false);
  });

  it('should call next with NotFoundError when post does not exist', async () => {
    postDao.getById.onFirstCall().resolves(null);
    const next = sinon.spy();

    await makeController().addFileUrlToPost(
      123,
      { url: 'https://example.com/a.mp3' },
      { json: sinon.spy() } as unknown as express.Response,
      next
    );

    next.calledOnce.should.equal(true);
    next.firstCall.args[0].should.be.instanceOf(NotFoundError);
  });

  it('should call next with BadRequestError when fetch response is not ok', async () => {
    postDao.getById.onFirstCall().resolves({ id: 123 });
    fetchStub.resolves({ ok: false, headers: new Headers() });
    const next = sinon.spy();

    await makeController().addFileUrlToPost(
      123,
      { url: 'https://example.com/a.mp3' },
      { json: sinon.spy() } as unknown as express.Response,
      next
    );

    next.calledOnce.should.equal(true);
    next.firstCall.args[0].should.be.instanceOf(BadRequestError);
  });

  it('should call next with BadRequestError when downloaded file is empty', async () => {
    postDao.getById.onFirstCall().resolves({ id: 123 });
    fetchStub.resolves({
      ok: true,
      headers: new Headers({ 'content-type': 'audio/mpeg' }),
      arrayBuffer: async () => new ArrayBuffer(0)
    });
    const next = sinon.spy();

    await makeController().addFileUrlToPost(
      123,
      { url: 'https://example.com/a.mp3' },
      { json: sinon.spy() } as unknown as express.Response,
      next
    );

    next.calledOnce.should.equal(true);
    const err = next.firstCall.args[0];
    err.should.be.instanceOf(BadRequestError);
    err.message.should.include('empty');
  });

  it('should call next with BadRequestError when fetch throws a network error', async () => {
    postDao.getById.onFirstCall().resolves({ id: 123 });
    fetchStub.rejects(new Error('ENOTFOUND example.com'));
    const next = sinon.spy();

    await makeController().addFileUrlToPost(
      123,
      { url: 'https://example.com/a.mp3' },
      { json: sinon.spy() } as unknown as express.Response,
      next
    );

    next.calledOnce.should.equal(true);
    const err = next.firstCall.args[0];
    err.should.be.instanceOf(BadRequestError);
    err.message.should.include('Failed to fetch URL');
  });
});
