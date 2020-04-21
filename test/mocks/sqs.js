const awsMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');

module.exports = (messages, {
  sendCallback,
  deleteCallback
}) => {
  let receiveCount = 0;

  awsMock.mock('SQS', 'receiveMessage', (_params, callback) => {
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

  awsMock.mock('SQS', 'sendMessage', sendCallback);
  awsMock.mock('SQS', 'deleteMessage', deleteCallback);

  return new AWS.SQS();
};
