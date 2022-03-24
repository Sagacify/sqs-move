import {
  MessageAttributeValue,
  SendMessageRequest,
  SQS
} from '@aws-sdk/client-sqs';
import { cloneDeep, get } from 'lodash';

const partialCompare = (
  body: string,
  criteria: string | Record<string, unknown>
): boolean => {
  const isString = typeof criteria === 'string';

  if (isString) {
    return RegExp(`.*${criteria}.*`).test(body);
  }

  return Object.keys(criteria).some((key) => get(body, key) === criteria[key]);
};

export type ParsedAttributeValue = number | string | Buffer | Uint8Array;

const composeMessageAttributes = (
  attributes: Record<string, ParsedAttributeValue>
) =>
  Object.keys(attributes).reduce(
    (result: Record<string, MessageAttributeValue>, key: string) => {
      const attributeValue = attributes[key];

      if (typeof attributeValue === 'string') {
        result[key] = {
          StringValue: attributeValue,
          DataType: 'String'
        };
      } else if (Number.isFinite(attributeValue)) {
        // note: could manage Infinity
        result[key] = {
          StringValue: attributeValue.toString(),
          DataType: 'Number'
        };
      } else if (
        attributeValue instanceof Buffer ||
        attributeValue instanceof Uint8Array
      ) {
        result[key] = {
          BinaryValue: attributeValue,
          DataType: 'Binary'
        };
      } else {
        throw new Error(`Unrecognized type for messageAttribute ${key}`);
      }

      return result;
    },
    {}
  );

const parseMessageAttributes = (
  attributes: Record<string, MessageAttributeValue>
) =>
  Object.keys(attributes).reduce(
    (result: Record<string, ParsedAttributeValue>, key) => {
      const attribute = attributes[key];

      switch (attribute.DataType) {
        case 'Number':
          if (typeof attribute.StringValue !== 'undefined') {
            result[key] = Number(attribute.StringValue);
          }
          break;
        case 'String':
          if (typeof attribute.StringValue !== 'undefined') {
            result[key] = attribute.StringValue;
          }
          break;
        case 'Binary':
          if (attribute.BinaryValue !== undefined) {
            result[key] = attribute.BinaryValue;
          }
          break;
      }

      return result;
    },
    {}
  );

interface SqsMoveOptions {
  batchSize: number;
  includes?: string | Record<string, unknown>;
  excludes?: string | Record<string, unknown>;
  transformBody?: (
    body: string | Record<string, unknown>,
    messageAttributes: Record<string, ParsedAttributeValue>
  ) => string | Record<string, unknown>;
  transformMessageAttributes?: (
    body: string | Record<string, unknown>,
    messageAttributes: Record<string, ParsedAttributeValue>
  ) => Record<string, ParsedAttributeValue>;
  json: boolean;
}

const SqsMoveOptionsDefaults: SqsMoveOptions = {
  batchSize: 1,
  json: true
};

export async function sqsMove(
  sqsInstance: SQS,
  fromQueueUrl: string,
  toQueueUrl: string,
  options: Partial<SqsMoveOptions> = {}
): Promise<{ movedCount: number; filteredCount: number }> {
  const finalOptions = { ...SqsMoveOptionsDefaults, ...options };
  const {
    batchSize,
    includes,
    excludes,
    transformBody,
    transformMessageAttributes,
    json
  } = finalOptions;
  const receiveOptions = {
    QueueUrl: fromQueueUrl,
    MaxNumberOfMessages: batchSize,
    VisibilityTimeout: batchSize * 5, // note: 5 sec per message to process
    WaitTimeSeconds: 0, // note: avoid infinite loop
    AttributeNames: ['MessageDeduplicationId', 'MessageGroupId'],
    MessageAttributeNames: ['All']
  };

  // todo: Need to check, undefined could work if sqsInstance has default queue
  if (!fromQueueUrl) {
    throw new Error('Parameter fromQueueUrl is required');
  }

  if (!toQueueUrl) {
    throw new Error('Parameter toQueueUrl is required');
  }

  let movedCount = 0;
  let filteredCount = 0;

  while (true) {
    const response = await sqsInstance.receiveMessage(receiveOptions);

    if (!Array.isArray(response.Messages)) {
      break;
    }

    for (const message of response.Messages) {
      if (message.ReceiptHandle === undefined) {
        throw new Error("Message doesn't contain ReceiptHandle");
      }

      let shouldMove = true;
      let messageBody = message.Body || '';
      let messageAttributes = message.MessageAttributes || {};

      if (includes || excludes || transformBody || transformMessageAttributes) {
        const parsedBody = json ? JSON.parse(message.Body ?? '') : message.Body;

        shouldMove =
          (typeof includes === 'undefined' ||
            partialCompare(cloneDeep(parsedBody), includes)) &&
          (typeof excludes === 'undefined' ||
            !partialCompare(cloneDeep(parsedBody), excludes));

        if (transformBody || transformMessageAttributes) {
          const parsedMessageAttributes =
            parseMessageAttributes(messageAttributes);

          const transformedBody = transformBody
            ? transformBody(
                cloneDeep(parsedBody),
                cloneDeep(parsedMessageAttributes)
              )
            : parsedBody;

          const transformedMessageAttributes = transformMessageAttributes
            ? transformMessageAttributes(
                cloneDeep(parsedBody),
                cloneDeep(parsedMessageAttributes)
              )
            : parsedMessageAttributes;

          messageAttributes = composeMessageAttributes(
            transformedMessageAttributes
          );
          messageBody = json
            ? JSON.stringify(transformedBody)
            : transformedBody;
        }
      }

      if (shouldMove) {
        const sendOptions: SendMessageRequest = {
          QueueUrl: toQueueUrl,
          MessageBody: messageBody
        };

        if (Object.keys(messageAttributes).length > 0) {
          sendOptions.MessageAttributes = messageAttributes;
        }

        if (message.Attributes && message.Attributes.MessageDeduplicationId) {
          sendOptions.MessageDeduplicationId =
            message.Attributes.MessageDeduplicationId;
        }

        if (message.Attributes && message.Attributes.MessageGroupId) {
          sendOptions.MessageGroupId = message.Attributes.MessageGroupId;
        }

        const deleteOptions = {
          QueueUrl: fromQueueUrl,
          ReceiptHandle: message.ReceiptHandle
        };

        await sqsInstance.sendMessage(sendOptions);
        await sqsInstance.deleteMessage(deleteOptions);

        movedCount++;
      } else {
        filteredCount++;
      }
    }
  }

  return {
    movedCount,
    filteredCount
  };
}
