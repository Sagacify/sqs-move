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
async function(sqsInstance, fromQueueUrl, toQueueUrl, {
  batchSize = 1,
  includes = null,
  excludes = null,
  json = true
} = {})
```

**Notes:**

- `sqsInstance` is expected to be an AWS.SQS instance
- `batchSize` maximum is 10
- `includes` & `excludes` are expected to be criteria a string or a flat key/value object (see: advanced exemple)
- `json` indicates if it is need to json parse message body on for includes and/or exlude

### More on includes excludes

If it is a string then message is only going to be moved if the message contains (includes) or not contains (excludes) the string provided.

If it is a key/value object then message is only going to be moved if the message contains (includes) or not contains (excludes) the key/value provided.
You can includes/excludes on deep property using the flat keys.
This `{ 'user.address.country': 'BE' }` will check in body if `body.user.address.country === 'BE'`.

### Simple example

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
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-original-queue'
);

console.log('All messages are back in original queue !');
```

### Advanced example

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
  'https://sqs.eu-west-1.amazonaws.com/123456789012/some-original-queue', {
    batchSize: 10,
    includes: { 'user.name': 'olivier' },
    excludes: { 'user.country': 'BE' },
    json: true
  }
);

console.log('Some messages are back in original queue !');
```
