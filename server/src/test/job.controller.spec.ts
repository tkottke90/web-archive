import chai from 'chai';
import sinon from 'sinon';
import express from 'express';
import { JobController } from '../controllers/job.controller';
import { NotFoundError } from '../utilities/errors.util';
import type { DownloadJobDao } from '../dao/download-job.dao';

chai.should();

describe('JobController - getJob', () => {
  const downloadJobsDao = {
    getById: sinon.stub(),
    toJobDetail: sinon.stub()
  };

  beforeEach(() => {
    downloadJobsDao.getById.reset();
    downloadJobsDao.toJobDetail.reset();
  });

  afterEach(() => sinon.restore());

  const makeController = () =>
    new JobController(downloadJobsDao as unknown as DownloadJobDao);

  it('should return job detail JSON when job exists', async () => {
    const job = { id: 16144, parser: 'Reddit', status: 'COMPLETE' };
    const detail = { job_id: 16144, type: 'Reddit', status: 'COMPLETE' };
    downloadJobsDao.getById.resolves(job);
    downloadJobsDao.toJobDetail.returns(detail);

    const json = sinon.spy();
    const next = sinon.spy();
    const res = { json } as unknown as express.Response;

    await makeController().getJob(16144, res, next);

    downloadJobsDao.getById.calledOnce.should.equal(true);
    const [idArg] = downloadJobsDao.getById.firstCall.args;
    idArg.should.equal(16144);
    (typeof idArg).should.equal('number');

    json.calledOnce.should.equal(true);
    next.called.should.equal(false);
  });

  it('should call next with NotFoundError when job does not exist', async () => {
    downloadJobsDao.getById.resolves(null);

    const next = sinon.spy();
    const res = { json: sinon.spy() } as unknown as express.Response;

    await makeController().getJob(99999, res, next);

    next.calledOnce.should.equal(true);
    next.firstCall.args[0].should.be.instanceOf(NotFoundError);
  });
});
