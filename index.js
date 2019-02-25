const SEQUENCE_SYMBOL = Symbol('@@HEXNUT_SEQUENCE_SYMBOL');
const uuid = require('uuid/v4');

function getNext(sequence, name, ctx) {
  const {value, done} = sequence.iterator.next(ctx.message);
  if (done) {
    delete ctx[SEQUENCE_SYMBOL][name];
    return true;
  }
  sequence.waitingFor = value;
  return false;
};

function initSequence(ctx, next, generator, name, explicitConnection) {
  ctx[SEQUENCE_SYMBOL][name] = {
    generator,
    iterator: generator(ctx, next),
    waitingFor: explicitConnection
      ? { messageType: 'connection' }
      : null
  };
}

async function process(explicitConnection, isInteruptable, name, sequence, ctx, next, wait = false) {
  if (sequence.waitingFor === null && getNext(sequence, name, ctx)) return await next();

  if (sequence.waitingFor.messageType === 'assertion') {
    if (!sequence.waitingFor.pred()) {
      if (!isInteruptable) {
        delete ctx[SEQUENCE_SYMBOL][name];
      }
      return await next();
    }
    getNext(sequence, name, ctx);
  }

  if (sequence.waitingFor.messageType === 'await') {
    const promiseValue = await sequence.waitingFor.fn();
    const {value, done} = sequence.iterator.next(promiseValue);
    sequence.waitingFor = value;
    if (done) initSequence(ctx, next, sequence.generator, name, explicitConnection);
    return await process(explicitConnection, isInteruptable, name, sequence, ctx, next);
  }

  if (wait) return;

  if (ctx.type === sequence.waitingFor.messageType) {
    if (sequence.waitingFor.operation) {
      if (sequence.waitingFor.operation === 'matchMessage' && !sequence.waitingFor.fn(ctx.message)) {
        if (!isInteruptable) {
          delete ctx[SEQUENCE_SYMBOL][name];
        }
        return await next();
      }
    }

    if (getNext(sequence, name, ctx)) {
      initSequence(ctx, next, sequence.generator, name, explicitConnection);
    }
    return await process(explicitConnection, isInteruptable, name, sequence, ctx, next, true);
  }

  return await next();
}

const sequenceProcessor = explicitConnection => isInteruptable => generator => {
  const name = uuid();
  return async (ctx, next) => {
    if (!ctx[SEQUENCE_SYMBOL]) ctx[SEQUENCE_SYMBOL] = {};
    if (!ctx[SEQUENCE_SYMBOL][name]) initSequence(ctx, next, generator, name, explicitConnection);
    return await process(explicitConnection, isInteruptable, name, ctx[SEQUENCE_SYMBOL][name], ctx, next);
  };
};

module.exports = {
  onConnect: sequenceProcessor(true)(true),

  interruptible:sequenceProcessor(false)(true),
  interuptable: sequenceProcessor(false)(true),

  uninterruptible:sequenceProcessor(false)(false),
  uninteruptable: sequenceProcessor(false)(false),
  matchMessage: matchFn => ({
    messageType: 'message',
    operation: 'matchMessage',
    fn: matchFn
  }),
  getMessage: () => ({
    messageType: 'message',
    operation: 'matchMessage',
    fn: () => true
  }),
  assert: pred => ({ messageType: 'assertion', pred }),
  await: promiseReturningFn => ({ messageType: 'await', fn: promiseReturningFn })
};
