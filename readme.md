# hexnut-sequence

`hexnut-sequence` is a <a href="https://github.com/francisrstokes/hexnut">hexnut</a> middleware for creating synchronised, sequenced conversations between server and client. It can also be used with `hexnut-client`.

`hexnut-sequence` uses generators to structure code that sends and receives specific messages over time in a synchronous way, much like `async/await` does for promises.

There are currently 3 kinds of sequences:

1. <a href="#connection-sequence">connection sequences</a>: These run on when a client first connects
2. <a href="#interruptible-sequence">interruptible sequences</a>: These sequences can be interrupted and continued later on
3. <a href="#uninterruptible-sequence">uninterruptible sequences</a>: These sequences cannot be interrupted, and will lose state is a message is not matched correctly

## Installing

```bash
npm i hexnut-sequence
```

## Usage

### Connection Sequence

*sequence.onConnect(generatorFunction)*

**Note: The generatorFunction receives the same arguments as a regular middleware (ctx, next)**

```javascript
const sequence = require('hexnut-sequence');

app.use(sequence.onConnect(function* (ctx) {
  // Client connected, perhaps send them an initial message
  ctx.send('handshake part 1');

  // Wait for the corresponding handshake message
  // Should be in the form: "handshake part 2:<the users name>"
  const handshakePart2 = yield sequence.matchMessage(msg => {
    return msg.startsWith('handshake part 2:');
  });

  const namePart = handshakePart2.split(':')[1];

  // Sequence should fail if the name is not provided
  yield sequence.assert(restOfMessage.length > 0);

  // Set the name on the ctx object
  ctx.usersName = namePart;

  // Send a final message
  ctx.send(`Welcome ${ctx.usersName}`);
}));
```

### Interruptible Sequence

*sequence.interruptible(generatorFunction)*

**Note: The generatorFunction receives the same arguments as a regular middleware (ctx, next)**

```javascript
const sequence = require('hexnut-sequence');
const bodyparser = require('hexnut-bodyparser');

app.use(bodyparser.json());

app.use(sequence.interruptible(function* (ctx) {
  // A sequence where the user starts a fitness session and
  // records data, and then finalises their session.
  // During that time, they might send other kinds of data,
  // So an interruptible sequence makes sense.

  yield sequence.matchMessage(msg => msg.type === 'startFitnessSession');

  ctx.send('Starting fitness session');

  while (true) {
    const message = yield sequence.matchMessage(msg => {
      return msg.type === 'logExercise'
          || msg.type === 'logHeartRate'
          || msg.type === 'endFitnessSession';
    });

    if (msg.type === 'logExercise') {
      yield sequence.await(() => saveExerciseLogToDb(msg.value));
    } else if (msg.type === 'logHeartRate') {
      yield sequence.await(() => saveHeartRateMeasurementToDb(msg.value));
    } else {
      // End the session
      break;
    }
  }

  ctx.send('Ending fitness session');
}));
```

### Uninterruptible Sequence

*sequence.uninterruptible(generatorFunction)*

**Note: The generatorFunction receives the same arguments as a regular middleware (ctx, next)**

```javascript
const sequence = require('hexnut-sequence');

app.use(sequence.uninterruptible(function* (ctx) {
  // A sequence where the user sends the konami code
  // If at any point the sequence is broken it must restart from the beginning

  yield sequence.matchMessage(msg => msg === 'up');
  yield sequence.matchMessage(msg => msg === 'up');
  yield sequence.matchMessage(msg => msg === 'down');
  yield sequence.matchMessage(msg => msg === 'down');
  yield sequence.matchMessage(msg => msg === 'left');
  yield sequence.matchMessage(msg => msg === 'right');
  yield sequence.matchMessage(msg => msg === 'left');
  yield sequence.matchMessage(msg => msg === 'right');
  yield sequence.matchMessage(msg => msg === 'b');
  yield sequence.matchMessage(msg => msg === 'a');

  ctx.send('Code Accepted');
}));
```