const awsMock = require('aws-sdk-mock');
const sqsMock = require('./mocks/sqs');
const { expect } = require('chai');
const sinon = require('sinon');
const sqsMove = require('../src');

const { fakeTextMessages, fakeJsonMessages } = require('./mocks/sqsMessages');
const fakeFromQueueUrl = 'https://sqs.eu-west-1.amazonaws.com/123456789012/some-dead-letter-queue';
const fakeToQueueUrl = 'https://sqs.eu-west-1.amazonaws.com/123456789012/some-original-queue';

describe('SQS Move', () => {
  afterEach(() => {
    awsMock.restore('SQS');
  });

  it('should move message from queue to queue', async () => {
    const sendMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));
    const deleteMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));

    const sqs = sqsMock(fakeTextMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl);

    expect(sendMessageSpy.callCount).to.equal(3);
    expect(deleteMessageSpy.callCount).to.equal(3);
  });

  it('should move messages with text includes & excludes', async () => {
    const sendMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));
    const deleteMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));

    const sqs = sqsMock(fakeTextMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl, {
      includes: 'message',
      excludes: 'first',
      json: false
    });

    expect(sendMessageSpy.callCount).to.equal(2);
    expect(deleteMessageSpy.callCount).to.equal(2);
  });

  it('should move messages with object includes & excludes', async () => {
    const sendMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));
    const deleteMessageSpy = sinon.spy((params, callback) =>
      callback(null, { MessageId: 123 }));

    const sqs = sqsMock(fakeJsonMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl, {
      includes: { 'user.country': 'BE' },
      excludes: { 'user.name': 'Olivier' },
      json: true
    });

    expect(sendMessageSpy.callCount).to.equal(1);
    expect(deleteMessageSpy.callCount).to.equal(1);
  });
});
