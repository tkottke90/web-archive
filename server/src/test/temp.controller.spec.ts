import chai from 'chai';
import sinon from 'sinon';
import express from 'express';
import { TempController } from '../controllers/temp.controller';
import type { PostFileDao } from '../dao/post-file.dao';

chai.should();

describe('TempController - Placeholder Status', () => {
  const postFileDao = {
    getPlaceholderStatus: sinon.stub()
  };

  beforeEach(() => {
    postFileDao.getPlaceholderStatus.reset();
  });

  afterEach(() => {
    sinon.restore();
  });

  const makeController = () =>
    new TempController(postFileDao as unknown as PostFileDao);

  it('should return the backfill status counts with a Deprecation header', async () => {
    const status = { total: 100, pending: 40, failed: 2, complete: 58 };
    postFileDao.getPlaceholderStatus.resolves(status);
    const json = sinon.spy();
    const set = sinon.spy();
    const next = sinon.spy();

    await makeController().getPlaceholderStatus(
      { json, set } as unknown as express.Response,
      next
    );

    json.calledOnce.should.equal(true);
    json.firstCall.args[0].should.deep.equal(status);
    set.calledWith('Deprecation', 'true').should.equal(true);
    next.called.should.equal(false);
  });

  it('should call next with the error when the dao fails', async () => {
    const failure = new Error('db unavailable');
    postFileDao.getPlaceholderStatus.rejects(failure);
    const next = sinon.spy();

    await makeController().getPlaceholderStatus(
      { json: sinon.spy(), set: sinon.spy() } as unknown as express.Response,
      next
    );

    next.calledOnce.should.equal(true);
    next.firstCall.args[0].should.equal(failure);
  });
});
