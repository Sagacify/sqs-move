# SQS-Move

[![CircleCI](https://circleci.com/gh/Sagacify/sqs-move/tree/master.svg?style=svg)](https://circleci.com/gh/Sagacify/sqs-move/tree/master)
[![Coverage Status](https://coveralls.io/repos/github/Sagacify/sqs-move/badge.svg?branch=master)](https://coveralls.io/github/Sagacify/sqs-move?branch=master)

Moving SQS messages with ease.

## Motivation

Most of the time when you use an SQS queue you also define a deadletter queue.
This is a great idea, so when your service has a bug you can correct it and
then repush all the messages in your deadletter queue to the orignal queue.
Unfortunatly the AWS interface doeesn't provide an action to move your message.
You have to do it programmatically, this is where `sqs-move` will help you.

Of course, you can use it to move messages from any queue to any other queue.

## Installation

```sh
$ npm install @sagacify/sqs-move
```

## Usage

sqs-move is a simple function.

### Signature

```js
async function(sqsInstance, fromQueueUrl, toQueueUrl, batchSize = 1)
```

**Notes:**

- batchSize maximum is 10
- sqsInstance is expected to be an AWS.SQS instance

### Example

```js
const AWS = require('aws-sdk');
const sqsMove = require('@sagacify/sqs-move');

const sqsInstance = new AWS.SQS({
  accessKeyId: 'some-aws-id',
  secretAccessKey: 'some-aws-secret',
  region: 'eu-west-1'
});

await sqsMove(
  sqsInstance,
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-dead-letter-queue',
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-original-queue',
  10
);

console.log('All messages are back in original queue !');
```
