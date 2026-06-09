import chai from 'chai';
import sinon from 'sinon';
import express from 'express';
import { PostController } from '../controllers/post.controller';

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
  const postTagDao = {} as any;
  const tagDao = {} as any;
  const fileSystem = {
    upload: sinon.stub()
  };

  before(() => {
    (global as any).fetch = fetchStub;
  });

  beforeEach(() => {
    postDao.getById.reset();
    postDao.toDTO.reset();
    postFileDao.create.reset();
    fileSystem.upload.reset();
    fetchStub.reset();
  });

  after(() => {
    delete (global as any).fetch;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should download url content and add file to post', async () => {
    const controller = new PostController(
      postDao as any,
      postFileDao as any,
      postTagDao,
      tagDao,
      fileSystem as any
    );
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
});
