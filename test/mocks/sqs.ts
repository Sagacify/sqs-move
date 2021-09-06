import AWSMock from 'aws-sdk-mock';
import AWS, { SQS } from 'aws-sdk';

type Options = {
  sendCallback?: (
    params: AWS.SQS.SendMessageRequest,
    callback: (error: AWS.AWSError, data: Record<string, unknown>) => void
  ) => void;
  deleteCallback?: (
    params: AWS.SQS.DeleteMessageRequest,
    callback: (error: AWS.AWSError, data: Record<string, unknown>) => void
  ) => void;
};

export default (
  messages: SQS.MessageList,
  { sendCallback, deleteCallback }: Options = {}
): AWS.SQS => {
  let receiveCount = 0;

  AWSMock.mock('SQS', 'receiveMessage', (_params, callback) => {
    const RequestId = `r${receiveCount + 1}`;

    if (receiveCount >= messages.length) {
      // Simulate empty queue
      callback(null, { ResponseMetadata: { RequestId } });
    }

    callback(null, {
      ResponseMetadata: { RequestId },
      Messages: [messages[receiveCount]]
    });

    receiveCount++;
  });

  AWSMock.mock('SQS', 'sendMessage', sendCallback);
  AWSMock.mock('SQS', 'deleteMessage', deleteCallback);

  return new AWS.SQS();
};
