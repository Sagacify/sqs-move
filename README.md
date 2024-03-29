# SQS-Move

[![npm version](https://img.shields.io/npm/v/saga-logger.svg)](https://www.npmjs.com/package/saga-logger)
[![ci](https://github.com/sagacify/logger/actions/workflows/ci.yml/badge.svg)](https://github.com/Sagacify/logger/actions/workflows/ci.yml)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

Moving SQS messages with ease.
Messages MessageAttributes, MessageDeduplicationId & MessageGroupId will be preserved.
Other Attributes will be lost.

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
async function(sqsInstance, fromQueueUrl, toQueueUrl, {
  batchSize = 1,
  includes = null,
  excludes = null,
  transformBody = null,
  transformMessageAttributes = null,
  json = true
} = {})
```

**Notes:**

- `sqsInstance` is expected to be an AWS.SQS instance
- `batchSize` maximum is 10
- `includes` & `excludes` are expected to be criteria a string or a flat key/value object (see: advanced exemple)
- `transformBody` a function that takes the message original  Body & *MessageAttributes as parameter and return a transformed body
- `transformMessageAttributes` a function that takes the message original Body & *MessageAttributes as parameter and return a MessageAttributes body
- `json` indicates if it is need to json parse message body on for includes and/or exclude

*\* MessageAttributes is a simple map, it is automatically parsed and composed for you*

### More on includes excludes

If it is a string then message is only going to be moved if the message contains (includes) or not contains (excludes) the string provided.

If it is a key/value object then message is only going to be moved if the message contains (includes) or not contains (excludes) the key/value provided.
You can includes/excludes on deep property using the flat keys.
This `{ 'user.address.country': 'BE' }` will check in body if `body.user.address.country === 'BE'`.

### Simple example

```js
import AWS from 'aws-sdk';
import sqsMove from '@sagacify/sqs-move';
// OR
const AWS = require('aws-sdk');
const sqsMove = require('@sagacify/sqs-move');

const sqsInstance = new AWS.SQS({
  accessKeyId: 'some-aws-id',
  secretAccessKey: 'some-aws-secret',
  region: 'eu-west-1'
});

const { movedCount } = await sqsMove(
  sqsInstance,
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-dead-letter-queue',
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-process-queue'
);

console.log(`${movedCount} messages are back in process queue !`);
```

### Advanced example

```js
import AWS from 'aws-sdk';
import sqsMove from '@sagacify/sqs-move';
// OR
const AWS = require('aws-sdk');
const { sqsMove } = require('@sagacify/sqs-move');

const sqsInstance = new AWS.SQS({
  accessKeyId: 'some-aws-id',
  secretAccessKey: 'some-aws-secret',
  region: 'eu-west-1'
});

const { movedCount, filteredCount } = await sqsMove(
  sqsInstance,
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-dead-letter-queue',
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-process-queue', {
    batchSize: 10,
    includes: { 'user.name': 'olivier' },
    excludes: { 'user.country': 'BE' },
    transformBody: (body, messageAttributes) => {
      body.user.country = 'US'
      body.traceId = messageAttributes.traceId

      return body;
    },
    transformMessageAttributes: (body, messageAttributes) => {
      // Removes traceId from messageAttributes
      const { traceId, ...newMessageAttributes} = messageAttributes

      return newMessageAttributes;
    },
    json: true
  }
);

console.log(`${movedCount} messages are back in process queue & ${filteredCount} stayed in the deadletter queue !`);
```
