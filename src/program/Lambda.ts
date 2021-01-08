import * as T from "@effect-ts/core/Effect";
import * as L from "@effect-ts/core/Effect/Layer";
import * as M from "@effect-ts/core/Effect/Managed";
import * as P from "@effect-ts/core/Effect/Promise";
import * as R from "@effect-ts/node/Runtime";
import * as Q from "@effect-ts/core/Effect/Queue";
import { literal, pipe } from "@effect-ts/core/Function";
import { tag } from "@effect-ts/core/Has";
import { pretty } from "@effect-ts/system/Cause";

/**
 * Create a lambda environment
 */
export function lambda<R, I, O>(f: (a: I) => T.RIO<R, O>) {
  /**
   * The context of a request
   */
  type RequestContext<I, O> = {
    readonly event: I;
    readonly res: P.Promise<never, O>;
  };

  /**
   * Environment Service to hold the Request Queue
   */
  interface RequestQueue<I, O> {
    readonly _tag: "@app/RequestQueue";
    readonly requestQueue: Q.Queue<RequestContext<I, O>>;
  }

  /**
   * Given the lambda handler is global we need to store the queue in a global variable
   */
  const requestQueue = Q.unsafeMakeUnbounded<RequestContext<I, O>>();

  /**
   * Tag to access and provide the RequestQueue
   */
  const RequestQueue = tag<RequestQueue<I, O>>();

  /**
   * this is supposed to be called with an already constructed queue that will be closed
   * in case the process is either interrupted or ends for any reason
   */
  const GlobalRequestQueue = L.fromManaged(RequestQueue)(
    pipe(
      T.succeed({ _tag: literal("@app/RequestQueue"), requestQueue }),
      M.makeExit(({ requestQueue }) =>
        pipe(
          requestQueue.takeAll,
          T.tap(() => requestQueue.shutdown),
          T.chain(T.foreach(({ res }) => T.to(res)(T.interrupt)))
        )
      )
    )
  );

  /**
   * Access takeRequest from environment and use it
   */
  const takeRequest = T.accessServiceM(RequestQueue)(
    ({ requestQueue }) => requestQueue.take
  );

  /**
   * Returns an effect that will poll indefinately the request queue
   * forking each process in a new child fiber
   */
  const main = T.accessM((env: R) =>
    pipe(
      // poll from the request queue waiting in case no requests are present
      takeRequest,
      // fork each request in it's own fiber and start processing
      // here we are forking inside the parent scope so in case the
      // parent is interrupted each of the child will also trigger
      // interruption
      T.chain((r) => T.fork(P.complete(T.provideAll(env)(f(r.event)))(r.res))),
      // loop forever
      T.forever,
      // wrap layer to handle teardown
      T.provideSomeLayer(GlobalRequestQueue)
    )
  );

  /**
   * The main exposed handler
   */
  function handler(event: I): Promise<O> {
    return pipe(
      P.make<never, O>(),
      T.tap((res) => requestQueue.offer({ event, res })),
      T.chain(P.await),
      T.sandbox,
      T.mapError((cause) => pretty(cause, R.nodeTracer)),
      R.runPromise
    );
  }

  return {
    handler,
    main,
  };
}
