const move = async (sqsInstance, fromQueueUrl, toQueueUrl, batchSize = 1) => {
  const receiveOptions = {
    QueueUrl: fromQueueUrl,
    MaxNumberOfMessages: batchSize,
    WaitTimeSeconds: batchSize * 10 // 10 sec per message to move
  };

  const response = await sqsInstance.receiveMessage(receiveOptions)
    .promise();
  if (!response.Messages) {
    return null;
  }

  for (const message of response.Messages) {
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

  return move(sqsInstance, fromQueueUrl, toQueueUrl, batchSize);
};

module.exports = move;
