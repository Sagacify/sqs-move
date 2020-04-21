const { get } = require('lodash');

const partialCompare = (body, criteria) => {
  const isString = typeof criteria === 'string';

  if (isString) {
    return RegExp(`.*${criteria}.*`).test(body);
  }

  return Object.keys(criteria).find(key => get(body, key) === criteria[key]);
};

const move = async (sqsInstance, fromQueueUrl, toQueueUrl, options = {
  batchSize: 1,
  includes: null,
  excludes: null,
  json: true
}) => {
  const { batchSize, includes, excludes, json } = options;
  const receiveOptions = {
    QueueUrl: fromQueueUrl,
    MaxNumberOfMessages: batchSize,
    VisibilityTimeout: batchSize * 5, // 5 sec per message to process
    WaitTimeSeconds: 0 // Avoid infinite loop
  };

  // Need to check, undefined could work if sqsInstance has default queue
  if (!fromQueueUrl) {
    throw new Error('Parameter fromQueueUrl is required');
  }

  if (!toQueueUrl) {
    throw new Error('Parameter toQueueUrl is required');
  }

  const response = await sqsInstance.receiveMessage(receiveOptions)
    .promise();
  if (!response.Messages) {
    return null;
  }

  for (const message of response.Messages) {
    let isOk = true;

    if (includes || excludes) {
      const parsedBody = json
        ? JSON.parse(message.Body)
        : message.Body;

      isOk = (
        !includes ||
        partialCompare(parsedBody, includes)
      ) && (
        !excludes ||
        !partialCompare(parsedBody, excludes)
      );
    }

    if (isOk) {
      const sendOptions = {
        QueueUrl: toQueueUrl,
        MessageBody: message.Body
      };
      const deleteOptions = {
        QueueUrl: fromQueueUrl,
        ReceiptHandle: message.ReceiptHandle
      };

      await sqsInstance.sendMessage(sendOptions).promise();
      await sqsInstance.deleteMessage(deleteOptions).promise();
    }
  }

  return move(sqsInstance, fromQueueUrl, toQueueUrl, options);
};

module.exports = move;
