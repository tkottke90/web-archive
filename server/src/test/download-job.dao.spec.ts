import chai from 'chai';
import sinon from 'sinon';
import { DownloadJobDao } from '../dao/download-job.dao';
import { UI_POSTS } from '../routes';
import type { DBClient } from '../db';
import type { DownloadJob } from '@prisma/client';

chai.should();

const makeJob = (overrides: Partial<DownloadJob> = {}): DownloadJob => ({
  id: 42,
  parser: 'Reddit',
  data: {},
  status: 'COMPLETE',
  done: true,
  jobNotes: '',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-02T00:00:00Z'),
  ...overrides
});

describe('DownloadJobDao - serializers', () => {
  const makeDao = (client: unknown = {}) =>
    new DownloadJobDao(client as DBClient);

  describe('toJobListItem', () => {
    it('should include post_id and a post link when data contains postId', () => {
      const job = makeJob({ data: { url: 'https://example.com', postId: 7 } });

      const result = makeDao().toJobListItem(job);

      result.should.have.property('post_id', 7);
      result.should.have.nested.property(
        'links.post',
        UI_POSTS.url({ postId: 7 })
      );
    });

    it('should omit post_id and links when data has no postId', () => {
      const job = makeJob({ data: { url: 'https://example.com' } });

      const result = makeDao().toJobListItem(job);

      result.should.not.have.property('post_id');
      result.should.not.have.property('links');
    });

    it('should omit post_id when data is not an object', () => {
      const job = makeJob({ data: 'not-an-object' });

      const result = makeDao().toJobListItem(job);

      result.should.not.have.property('post_id');
    });

    it('should omit post_id when postId is not a number', () => {
      const job = makeJob({ data: { postId: '7' } });

      const result = makeDao().toJobListItem(job);

      result.should.not.have.property('post_id');
    });
  });

  describe('toJobDetail', () => {
    it('should include post_id and a post link when data contains postId', () => {
      const job = makeJob({ data: { postId: 7 } });

      const result = makeDao().toJobDetail(job);

      result.should.have.property('post_id', 7);
      result.should.have.nested.property(
        'links.post',
        UI_POSTS.url({ postId: 7 })
      );
      result.should.have.nested.property('links.self');
    });

    it('should omit post_id and the post link when data has no postId', () => {
      const job = makeJob({ data: { url: 'https://example.com' } });

      const result = makeDao().toJobDetail(job);

      result.should.not.have.property('post_id');
      result.should.not.have.nested.property('links.post');
      result.should.have.nested.property('links.self');
    });

    it('should keep the retry link alongside the post link for errored jobs', () => {
      const job = makeJob({ data: { postId: 7 }, status: 'ERROR' });

      const result = makeDao().toJobDetail(job);

      result.should.have.nested.property('links.post');
      result.should.have.nested.property('links.retry');
    });
  });

  describe('updateJobData', () => {
    it('should update the job data by id', async () => {
      const update = sinon.stub().resolves(makeJob());
      const dao = makeDao({ downloadJob: { update } });

      await dao.updateJobData(42, { url: 'https://example.com', postId: 7 });

      update.calledOnce.should.equal(true);
      update.firstCall.args[0].should.deep.equal({
        data: { data: { url: 'https://example.com', postId: 7 } },
        where: { id: 42 }
      });
    });
  });

  afterEach(() => sinon.restore());
});
