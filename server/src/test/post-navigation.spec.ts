import 'reflect-metadata';
import chai from 'chai';
import sinon from 'sinon';
import { PostDao } from '../dao/post.dao';
import { PostWithAssociations } from '../interfaces';

chai.should();

function makePost(id: number): PostWithAssociations {
  return {
    id,
    author: 'test-author',
    label: `Post ${id}`,
    source: `http://example.com/${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    metadata: [],
    files: [],
    postTags: []
  } as unknown as PostWithAssociations;
}

function makeDao(findFirstStub: sinon.SinonStub): PostDao {
  const mockClient = {
    post: { findFirst: findFirstStub }
  };
  return new PostDao(
    mockClient as any,
    {} as any,
    {} as any,
    {} as any
  );
}

describe('PostDao.findByIdWithBeforeAndAfter', () => {
  let findFirstStub: sinon.SinonStub;

  beforeEach(() => {
    findFirstStub = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('returns [prev, current, next] URLs for sequential IDs', async () => {
    findFirstStub.onCall(0).resolves(makePost(5));
    findFirstStub.onCall(1).resolves(makePost(4));
    findFirstStub.onCall(2).resolves(makePost(6));

    const [prev, curr, next] = await makeDao(findFirstStub).findByIdWithBeforeAndAfter(5);

    prev!.should.equal('/post/4');
    curr!.should.equal('/post/5');
    next!.should.equal('/post/6');
  });

  it('returns the correct adjacent posts when IDs have gaps (non-sequential indexing)', async () => {
    // Posts exist at IDs 1, 5, 10, 20 — current is 5
    findFirstStub.onCall(0).resolves(makePost(5));
    findFirstStub.onCall(1).resolves(makePost(1));  // prev skips 2, 3, 4
    findFirstStub.onCall(2).resolves(makePost(10)); // next skips 6, 7, 8, 9

    const [prev, curr, next] = await makeDao(findFirstStub).findByIdWithBeforeAndAfter(5);

    prev!.should.equal('/post/1');
    curr!.should.equal('/post/5');
    next!.should.equal('/post/10'); // NOT /post/6 which does not exist
  });

  it('returns undefined for previous when at the first post', async () => {
    findFirstStub.onCall(0).resolves(makePost(1));
    findFirstStub.onCall(1).resolves(null);         // no post before first
    findFirstStub.onCall(2).resolves(makePost(5));

    const [prev, curr, next] = await makeDao(findFirstStub).findByIdWithBeforeAndAfter(1);

    (prev === undefined).should.equal(true);
    curr!.should.equal('/post/1');
    next!.should.equal('/post/5');
  });

  it('returns undefined for next when at the last post', async () => {
    findFirstStub.onCall(0).resolves(makePost(20));
    findFirstStub.onCall(1).resolves(makePost(10));
    findFirstStub.onCall(2).resolves(null);         // no post after last

    const [prev, curr, next] = await makeDao(findFirstStub).findByIdWithBeforeAndAfter(20);

    prev!.should.equal('/post/10');
    curr!.should.equal('/post/20');
    (next === undefined).should.equal(true);
  });

  it('returns [undefined, current, undefined] when the post is the only one', async () => {
    findFirstStub.onCall(0).resolves(makePost(7));
    findFirstStub.onCall(1).resolves(null);
    findFirstStub.onCall(2).resolves(null);

    const [prev, curr, next] = await makeDao(findFirstStub).findByIdWithBeforeAndAfter(7);

    (prev === undefined).should.equal(true);
    curr!.should.equal('/post/7');
    (next === undefined).should.equal(true);
  });

  it('throws NotFoundError when the requested post does not exist', async () => {
    findFirstStub.onCall(0).resolves(null);

    try {
      await makeDao(findFirstStub).findByIdWithBeforeAndAfter(999);
      throw new Error('Should have thrown');
    } catch (err: any) {
      err.message.should.include('Post Not Found with ID [999]');
    }
  });

  it('applies active query filters when finding adjacent posts', async () => {
    findFirstStub.onCall(0).resolves(makePost(5));
    findFirstStub.onCall(1).resolves(makePost(2));
    findFirstStub.onCall(2).resolves(makePost(9));

    const [prev, curr, next] = await makeDao(findFirstStub).findByIdWithBeforeAndAfter(5, {
      author: 'author-a'
    } as any);

    prev!.should.equal('/post/2');
    curr!.should.equal('/post/5');
    next!.should.equal('/post/9');

    // All three findFirst calls must include the author filter in the where clause
    findFirstStub.args.forEach((args: any[]) => {
      args[0].where.author.should.deep.equal({
        contains: 'author-a',
        mode: 'insensitive'
      });
    });
  });

  it('uses id:gt with id:asc ordering for the next post query', async () => {
    findFirstStub.onCall(0).resolves(makePost(5));
    findFirstStub.onCall(1).resolves(makePost(4));
    findFirstStub.onCall(2).resolves(makePost(6));

    await makeDao(findFirstStub).findByIdWithBeforeAndAfter(5);

    const afterCall = findFirstStub.args[2][0];
    afterCall.where.id.should.deep.equal({ gt: 5 });
    afterCall.orderBy.should.deep.equal({ id: 'asc' });
  });

  it('uses id:lt with id:desc ordering for the previous post query', async () => {
    findFirstStub.onCall(0).resolves(makePost(5));
    findFirstStub.onCall(1).resolves(makePost(4));
    findFirstStub.onCall(2).resolves(makePost(6));

    await makeDao(findFirstStub).findByIdWithBeforeAndAfter(5);

    const beforeCall = findFirstStub.args[1][0];
    beforeCall.where.id.should.deep.equal({ lt: 5 });
    beforeCall.orderBy.should.deep.equal({ id: 'desc' });
  });
});
