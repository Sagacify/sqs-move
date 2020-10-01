const { cloneDeep, get } = require('lodash');

const partialCompare = (body, criteria) => {
  const isString = typeof criteria === 'string';

  if (isString) {
    return RegExp(`.*${criteria}.*`).test(body);
  }

  return Object.keys(criteria).find(key => get(body, key) === criteria[key]);
};

const composeMessageAttributes = attributes =>
  Object.keys(attributes).reduce((result, key) => {
    if (typeof attributes[key] === 'string') {
      result[key] = {
        StringValue: attributes[key],
        DataType: 'String'
      };
    } else if (Number.isFinite(attributes[key])) { // Could manage Infinity
      result[key] = {
        StringValue: attributes[key].toString(),
        DataType: 'Number'
      };
    } else if (attributes[key] instanceof Buffer) {
      result[key] = {
        BinaryValue: attributes[key],
        DataType: 'Binary'
      };
    } else {
      throw new Error(`Unrecognized type for messageAttribute ${key}`);
    }

    return result;
  }, {});

const parseMessageAttributes = attributes =>
  Object.keys(attributes).reduce((result, key) => {
    switch (attributes[key].DataType) {
      case 'Number':
        result[key] = Number(attributes[key].StringValue);
        break;
      case 'String':
        result[key] = attributes[key].StringValue;
        break;
      case 'Binary':
        result[key] = attributes[key].BinaryValue;
        break;
    }

    return result;
  }, {});

const move = async (sqsInstance, fromQueueUrl, toQueueUrl, options = {
  batchSize: 1,
  includes: null,
  excludes: null,
  transformBody: null,
  transformMessageAttributes: null,
  json: true
}) => {
  const {
    batchSize,
    includes,
    excludes,
    transformBody,
    transformMessageAttributes,
    json
  } = options;
  const receiveOptions = {
    QueueUrl: fromQueueUrl,
    MaxNumberOfMessages: batchSize,
    VisibilityTimeout: batchSize * 5, // 5 sec per message to process
    WaitTimeSeconds: 0, // Avoid infinite loop
    AttributeNames: [
      'MessageDeduplicationId',
      'MessageGroupId'
    ],
    MessageAttributeNames: ['All']
  };

  // Need to check, undefined could work if sqsInstance has default queue
  if (!fromQueueUrl) {
    throw new Error('Parameter fromQueueUrl is required');
  }

  if (!toQueueUrl) {
    throw new Error('Parameter toQueueUrl is required');
  }

  let isEmpty = false;
  let movedCount = 0;
  let filteredCount = 0;

  while (!isEmpty) {
    const response = await sqsInstance.receiveMessage(receiveOptions)
      .promise();

    isEmpty = !response.Messages;
    const messages = isEmpty ? [] : response.Messages;

    for (const message of messages) {
      let isOk = true;
      let messageBody = message.Body;
      let messageAttributes = message.MessageAttributes || {};

      if (includes || excludes || transformBody || transformMessageAttributes) {
        const parsedBody = json
          ? JSON.parse(message.Body)
          : message.Body;

        isOk = (
          !includes ||
          partialCompare(cloneDeep(parsedBody), includes)
        ) && (
          !excludes ||
          !partialCompare(cloneDeep(parsedBody), excludes)
        );

        if (transformBody || transformMessageAttributes) {
          const parsedMessageAttributes = parseMessageAttributes(messageAttributes);

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

          messageAttributes = composeMessageAttributes(transformedMessageAttributes);
          messageBody = json
            ? JSON.stringify(transformedBody)
            : transformedBody;
        }
      }

      if (isOk) {
        const sendOptions = {
          QueueUrl: toQueueUrl,
          MessageBody: messageBody
        };

        if (Object.keys(messageAttributes).length > 0) {
          sendOptions.MessageAttributes = messageAttributes;
        }

        if (message.Attributes && message.Attributes.MessageDeduplicationId) {
          sendOptions.MessageDeduplicationId = message.Attributes.MessageDeduplicationId;
        }

        if (message.Attributes && message.Attributes.MessageGroupId) {
          sendOptions.MessageGroupId = message.Attributes.MessageGroupId;
        }

        const deleteOptions = {
          QueueUrl: fromQueueUrl,
          ReceiptHandle: message.ReceiptHandle
        };

        await sqsInstance.sendMessage(sendOptions).promise();
        await sqsInstance.deleteMessage(deleteOptions).promise();

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
};

module.exports = move;
