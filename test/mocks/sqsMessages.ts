import { Message } from '@aws-sdk/client-sqs';

export const fakeTextMessages: Array<Message> = [
  {
    MessageId: '123',
    ReceiptHandle: 'abc1',
    Body: 'first message'
  },
  {
    MessageId: '124',
    ReceiptHandle: 'abc2',
    Body: 'second message'
  },
  {
    MessageId: '125',
    ReceiptHandle: 'abc3',
    Body: 'third message'
  }
];

export const fakeJsonMessages: Array<Message> = [
  {
    MessageId: '123',
    ReceiptHandle: 'abc1',
    Body: JSON.stringify({
      user: {
        name: 'Olivier',
        country: 'BE'
      }
    }),
    Attributes: {
      MessageDeduplicationId: 'd1',
      MessageGroupId: 'g1'
    },
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
  },
  {
    MessageId: '124',
    ReceiptHandle: 'abc2',
    Body: JSON.stringify({
      user: {
        name: 'Marine',
        country: 'BE'
      }
    }),
    Attributes: {
      MessageDeduplicationId: 'd2',
      MessageGroupId: 'g1'
    },
    MessageAttributes: {
      traceId: {
        DataType: 'String',
        StringValue: 't2'
      }
    }
  },
  {
    MessageId: '125',
    ReceiptHandle: 'abc3',
    Body: JSON.stringify({
      user: {
        name: 'Nicolas',
        country: 'CH'
      }
    }),
    Attributes: {
      MessageDeduplicationId: 'd3',
      MessageGroupId: 'g1'
    },
    MessageAttributes: {
      traceId: {
        DataType: 'String',
        StringValue: 't3'
      }
    }
  }
];
