import awsMock from 'aws-sdk-mock';
import sqsMock from './mocks/sqs';
import { expect } from 'chai';
import sinon from 'sinon';
import { sqsMove } from '../src/index';
import { fakeTextMessages, fakeJsonMessages } from './mocks/sqsMessages';
import type Sinon from 'sinon';
import type { SQS } from 'aws-sdk';

const fakeFromQueueUrl =
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-dead-letter-queue';
const fakeToQueueUrl =
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-original-queue';

describe('SQS Move', () => {
  let deleteMessageSpy: Sinon.SinonSpy<
    [
      params: SQS.DeleteMessageRequest,
      callback: (error: AWS.AWSError, data: Record<string, unknown>) => void
    ],
    (
      params: SQS.DeleteMessageRequest,
      callback: (error: AWS.AWSError, data: Record<string, unknown>) => void
    ) => void
  >;
  let sendMessageSpy: Sinon.SinonSpy<
    [
      params: SQS.SendMessageRequest,
      callback: (error: AWS.AWSError, data: Record<string, unknown>) => void
    ],
    (
      params: SQS.SendMessageRequest,
      callback: (error: AWS.AWSError, data: Record<string, unknown>) => void
    ) => void
  >;

  beforeEach(() => {
    sendMessageSpy = sinon.spy((_params, callback) =>
      callback(null, { MessageId: 123 })
    );
    deleteMessageSpy = sinon.spy((_params, callback) =>
      callback(null, { MessageId: 123 })
    );
  });
  afterEach(() => {
    awsMock.restore('SQS');
  });

  it('should move message from queue to queue', async () => {
    const sqs = sqsMock(fakeTextMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    const counts = await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl);

    expect(counts).to.deep.equal({ movedCount: 3, filteredCount: 0 });
    expect(sendMessageSpy.callCount).to.equal(3);
    expect(deleteMessageSpy.callCount).to.equal(3);
  });

  it('should preserve MessageAttributes, MessageDeduplicationId & MessageGroupId', async () => {
    const sqs = sqsMock(fakeJsonMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl);

    expect(sendMessageSpy.callCount).to.equal(3);
    expect(sendMessageSpy.getCall(0).args[0]).to.deep.include({
      MessageDeduplicationId: 'd1',
      MessageGroupId: 'g1',
      MessageAttributes: {
        traceId: {
          DataType: 'String',
          StringValue: 't1'
        },
        testNumber: {
          DataType: 'Number',
          StringValue: '10'
        },
        testBuffer: {
          DataType: 'Binary',
          BinaryValue: Buffer.from('0101')
        }
      }
    });
    expect(sendMessageSpy.getCall(1).args[0]).to.deep.include({
      MessageDeduplicationId: 'd2',
      MessageGroupId: 'g1',
      MessageAttributes: {
        traceId: {
          DataType: 'String',
          StringValue: 't2'
        }
      }
    });
    expect(sendMessageSpy.getCall(2).args[0]).to.deep.include({
      MessageDeduplicationId: 'd3',
      MessageGroupId: 'g1',
      MessageAttributes: {
        traceId: {
          DataType: 'String',
          StringValue: 't3'
        }
      }
    });
  });

  it('should move messages with text includes & excludes', async () => {
    const sqs = sqsMock(fakeTextMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    const counts = await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl, {
      includes: 'message',
      excludes: 'first',
      json: false
    });

    expect(counts).to.deep.equal({ movedCount: 2, filteredCount: 1 });
    expect(sendMessageSpy.callCount).to.equal(2);
    expect(deleteMessageSpy.callCount).to.equal(2);
  });

  it('should move messages with object includes & excludes', async () => {
    const sqs = sqsMock(fakeJsonMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    const counts = await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl, {
      includes: { 'user.country': 'BE' },
      excludes: { 'user.name': 'Olivier' },
      json: true
    });

    expect(counts).to.deep.equal({ movedCount: 1, filteredCount: 2 });
    expect(sendMessageSpy.callCount).to.equal(1);
    expect(deleteMessageSpy.callCount).to.equal(1);
  });

  it('should move messages with transformBody', async () => {
    const sqs = sqsMock(fakeJsonMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl, {
      transformBody: (
        body: {
          user: Record<string, string>;
          traceId: number | string | SQS.Binary;
        },
        messageAttributes
      ) => {
        body.user.country = 'US';
        body.traceId = messageAttributes.traceId;

        return body;
      },
      json: true
    });

    expect(sendMessageSpy.callCount).to.equal(3);
    expect(sendMessageSpy.getCall(0).args[0].MessageBody).to.equal(
      '{"user":{"name":"Olivier","country":"US"},"traceId":"t1"}'
    );
    expect(sendMessageSpy.getCall(1).args[0].MessageBody).to.equal(
      '{"user":{"name":"Marine","country":"US"},"traceId":"t2"}'
    );
    expect(sendMessageSpy.getCall(2).args[0].MessageBody).to.equal(
      '{"user":{"name":"Nicolas","country":"US"},"traceId":"t3"}'
    );
    expect(deleteMessageSpy.callCount).to.equal(3);
  });

  it('should move messages with transformMessageAttributes', async () => {
    const sqs = sqsMock(fakeJsonMessages, {
      sendCallback: sendMessageSpy,
      deleteCallback: deleteMessageSpy
    });

    await sqsMove(sqs, fakeFromQueueUrl, fakeToQueueUrl, {
      transformMessageAttributes: (
        body: Record<string, Record<string, string>>,
        messageAttributes
      ) => {
        const newMessageAttributes = {
          ...messageAttributes,
          country: body.user.country
        };

        return newMessageAttributes;
      },
      json: true
    });

    expect(sendMessageSpy.callCount).to.equal(3);
    expect(sendMessageSpy.getCall(0).args[0].MessageAttributes).to.deep.equal({
      traceId: {
        DataType: 'String',
        StringValue: 't1'
      },
      country: {
        DataType: 'String',
        StringValue: 'BE'
      },
      testNumber: {
        DataType: 'Number',
        StringValue: '10'
      },
      testBuffer: {
        DataType: 'Binary',
        BinaryValue: Buffer.from('0101')
      }
    });
    expect(sendMessageSpy.getCall(1).args[0].MessageAttributes).to.deep.equal({
      traceId: {
        DataType: 'String',
        StringValue: 't2'
      },
      country: {
        DataType: 'String',
        StringValue: 'BE'
      }
    });
    expect(sendMessageSpy.getCall(2).args[0].MessageAttributes).to.deep.equal({
      traceId: {
        DataType: 'String',
        StringValue: 't3'
      },
      country: {
        DataType: 'String',
        StringValue: 'CH'
      }
    });
    expect(deleteMessageSpy.callCount).to.equal(3);
  });
});
