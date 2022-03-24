import { AwsStub, mockClient } from 'aws-sdk-client-mock';
import {
  Message,
  ReceiveMessageCommand,
  ServiceInputTypes,
  ServiceOutputTypes,
  SQSClient
} from '@aws-sdk/client-sqs';

export default (
  messages: Array<Message>,
  sqsClient: SQSClient
): AwsStub<ServiceInputTypes, ServiceOutputTypes> => {
  let receiveCount = 0;

  const sqsMock = mockClient(sqsClient);

  sqsMock.on(ReceiveMessageCommand).callsFake(() => {
    const result = {
      $metadata: { requestId: `r${receiveCount + 1}` },
      Messages:
        receiveCount >= messages.length ? undefined : [messages[receiveCount]]
    };
    receiveCount += 1;

    return result;
  });

  return sqsMock;
};
