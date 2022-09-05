import { Cause, Effect, Promise, Queue } from '@effect-ts/core';
import { pipe } from '@effect-ts/core/Function';
import * as Runtime from '@effect-ts/node/Runtime';

/**
 * The context of a request
 */
type RequestContext<I, O, E> = {
  readonly event: I;
  readonly res: Promise.Promise<E, O>;
};

/**
 * Create a lambda environment
 */
export function lambda<R, I, E, O>(f: (a: I) => Effect.Effect<R, E, O>) {
  /**
   * Given the lambda handler is global we need to store the queue in a global variable
   */
  const requestQueue = Queue.unsafeMakeUnbounded<RequestContext<I, O, E>>();

  /**
   * Returns an effect that will poll indefinately the request queue
   * forking each process in a new child fiber
   */
  const main = Effect.accessM((env: R) =>
    pipe(
      requestQueue,
      // poll from the request queue waiting in case no requests are present
      Queue.take,
      // fork each request in it's own fiber and start processing
      // here we are forking inside the parent scope so in case the
      // parent is interrupted each of the child will also trigger
      // interruption
      Effect.chain((r) =>
        Effect.fork(
          Promise.complete(Effect.provideAll(env)(f(r.event)))(r.res),
        ),
      ),
      // loop forever
      Effect.forever,
      // handle teardown
      Effect.ensuring(
        pipe(
          requestQueue,
          Queue.takeAll,
          Effect.tap(() => pipe(requestQueue, Queue.shutdown)),
          Effect.chain(
            Effect.forEach(({ res }) => Effect.to(res)(Effect.interrupt)),
          ),
        ),
      ),
    ),
  );

  /**
   * The main exposed handler
   */
  function handler(event: I): Promise<O> {
    return pipe(
      Promise.make<E, O>(),
      Effect.tap((res) => pipe(requestQueue, Queue.offer({ event, res }))),
      Effect.chain(Promise.await),
      Effect.sandbox,
      Effect.mapError((cause) => Cause.pretty(cause)),
      Runtime.runPromise,
    );
  }

  return {
    handler,
    main,
  };
}
