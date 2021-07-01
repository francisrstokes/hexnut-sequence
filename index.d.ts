// Type definitions for Hexnut Sequence
// Project: https://github.com/francisrstokes/hexnut-sequence/
// Definitions by:
//  - Francis Stokes <https://github.com/francisrstokes/

export declare type MatchMessageCommand = {
  messageType: 'message'
  operation: 'matchMessage';
  fn: MessageCheckFn;
};

export declare type GetMessageCommand = {
  messageType: 'message';
  operation: 'getMessage';
};

export declare type AssertionCommand = {
  messageType: 'assertion';
  pred: () => boolean;
};

export declare type AwaitCommand = {
  messageType: 'message';
  fn: () => Promise<any>;
}

export declare type SequenceCommand =
  | MatchMessageCommand
  | GetMessageCommand
  | AssertionCommand
  | AwaitCommand;

export declare type MiddlewareFn<Ctx> = (ctx: Ctx, next: () => void) => void;
export declare type MessageCheckFn = (message: any) => boolean;
export declare type SequenceResult = any;
export declare type SequenceProcessorFn<Ctx, T> = (ctx: Ctx, next: () => void) =>
  Generator<SequenceCommand, void, T>;

declare function onConnect<Ctx, T = any>(connectionHandler: SequenceProcessorFn<Ctx, T>): MiddlewareFn<Ctx>;
declare function interruptible<Ctx, T = any>(connectionHandler: SequenceProcessorFn<Ctx, T>): MiddlewareFn<Ctx>;
declare function interuptable<Ctx, T = any>(connectionHandler: SequenceProcessorFn<Ctx, T>): MiddlewareFn<Ctx>;
declare function uninterruptible<Ctx, T = any>(connectionHandler: SequenceProcessorFn<Ctx, T>): MiddlewareFn<Ctx>;
declare function uninteruptable<Ctx, T = any>(connectionHandler: SequenceProcessorFn<Ctx, T>): MiddlewareFn<Ctx>;

declare function matchMessage(matchFn: MessageCheckFn): MatchMessageCommand;
declare function getMessage(): GetMessageCommand;
declare function assert(pred: () => boolean): AssertionCommand;
declare function _await(promiseReturningFn: () => Promise<any>): AwaitCommand;

export default {
  onConnect,
  interruptible,
  interuptable,
  uninterruptible,
  uninteruptable,
  matchMessage,
  getMessage,
  assert,
  await: _await
};
