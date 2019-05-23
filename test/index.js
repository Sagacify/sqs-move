const AWS = require('aws-sdk');
const awsMock = require('aws-sdk-mock');
const { expect } = require('chai');
const sinon = require('sinon');
const sqsMove = require('../src');

describe('SQS Move', () => {
  after(() => {
    awsMock.restore('SQS');
  });

  it('should move message from queue to queue', async () => {
    let receiveCounter = 0;
    awsMock.mock('SQS', 'receiveMessage', (_params, callback) => {
      receiveCounter++;

      if (receiveCounter > 1) {
        // Simulate empty queue
        callback(null, { ResponseMetadata: { RequestId: 'r2' } });
      }
      callback(null, {
        ResponseMetadata: { RequestId: 'r1' },
        Messages: [{
          MessageId: 123,
          ReceiptHandle: 'abc',
          Body: 'here is my message'
        }]
      });
    });

    const sendMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));
    const deleteMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));

    awsMock.mock('SQS', 'sendMessage', sendMessageSpy);
    awsMock.mock('SQS', 'deleteMessage', deleteMessageSpy);
    const sqs = new AWS.SQS();

    await sqsMove(
      sqs,
      'https://sqs.eu-west-1.amazonaws.com/123456789012/some-dead-letter-queue',
      'https://sqs.eu-west-1.amazonaws.com/123456789012/some-original-queue',
      1
    );

    expect(sendMessageSpy.calledOnce).to.equal(true);
    expect(deleteMessageSpy.calledOnce).to.equal(true);
  });
});
