module.exports.fakeTextMessages = [
  {
    MessageId: 123,
    ReceiptHandle: 'abc1',
    Body: 'first message'
  }, {
    MessageId: 124,
    ReceiptHandle: 'abc2',
    Body: 'second message'
  }, {
    MessageId: 125,
    ReceiptHandle: 'abc3',
    Body: 'third message'
  }
];

module.exports.fakeJsonMessages = [
  {
    MessageId: 123,
    ReceiptHandle: 'abc1',
    Body: JSON.stringify({
      user: {
        name: 'Olivier',
        country: 'BE'
      }
    })
  }, {
    MessageId: 124,
    ReceiptHandle: 'abc2',
    Body: JSON.stringify({
      user: {
        name: 'Marine',
        country: 'BE'
      }
    })
  }, {
    MessageId: 125,
    ReceiptHandle: 'abc3',
    Body: JSON.stringify({
      user: {
        name: 'Nicolas',
        country: 'CH'
      }
    })
  }
];
