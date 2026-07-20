import chai from 'chai';
import sinon from 'sinon';
import { Request, Response, NextFunction } from 'express';
import { ZodIdValidator } from '../middleware/zod.middleware';
import { BadRequestError } from '../utilities/errors.util';

chai.should();

describe('ZodIdValidator', () => {
  const makeReq = (paramValue: string, field = 'id'): Request =>
    ({ params: { [field]: paramValue } } as unknown as Request);
  const res = {} as Response;

  afterEach(() => sinon.restore());

  it('should parse a valid integer string and store it as a number', () => {
    const next = sinon.spy();
    const req = makeReq('16144');

    ZodIdValidator('id')(req, res, next as unknown as NextFunction);

    next.calledOnce.should.equal(true);
    next.firstCall.args.should.be.empty;
    ((req.params as Record<string, unknown>)['id'] as number).should.equal(
      16144
    );
  });

  it('should support a custom field name', () => {
    const next = sinon.spy();
    const req = makeReq('42', 'jobId');

    ZodIdValidator('jobId')(req, res, next as unknown as NextFunction);

    next.calledOnce.should.equal(true);
    ((req.params as Record<string, unknown>)['jobId'] as number).should.equal(
      42
    );
  });

  it('should call next with BadRequestError for a non-numeric string', () => {
    const next = sinon.spy();
    const req = makeReq('abc');

    ZodIdValidator('id')(req, res, next as unknown as NextFunction);

    next.calledOnce.should.equal(true);
    next.firstCall.args[0].should.be.instanceOf(BadRequestError);
  });

  it('should call next with BadRequestError for a decimal string', () => {
    const next = sinon.spy();
    const req = makeReq('3.14');

    ZodIdValidator('id')(req, res, next as unknown as NextFunction);

    next.calledOnce.should.equal(true);
    next.firstCall.args[0].should.be.instanceOf(BadRequestError);
  });
});
