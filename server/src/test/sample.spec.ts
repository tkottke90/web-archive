import chai from 'chai';
import sinon from 'sinon';

const should = chai.should();

describe('Sample Test Suite', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should validate chai assertion with should', () => {
    const value = true;
    value.should.equal(true);
  });

  it('should validate sinon spy', () => {
    const callback = sinon.spy();
    callback();
    callback.calledOnce.should.equal(true);
  });

  it('should validate sinon stub', () => {
    const stub = sinon.stub().returns(42);
    const result = stub();
    result.should.equal(42);
    stub.calledOnce.should.equal(true);
  });
});
