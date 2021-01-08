import * as T from "@effect-ts/core/Effect";
import * as L from "@effect-ts/core/Effect/Layer";
import * as M from "@effect-ts/core/Effect/Managed";
import * as P from "@effect-ts/core/Effect/Promise";
import type * as Q from "@effect-ts/core/Effect/Queue";
import { literal, pipe } from "@effect-ts/core/Function";
import { tag } from "@effect-ts/core/Has";
import { Cause } from "@effect-ts/system/Cause";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

/**
 * The context of a request
 */
export type RequestContext = {
  readonly event: APIGatewayProxyEvent;
  readonly res: P.Promise<never, APIGatewayProxyResult>;
};

/**
 * Environment Service to hold the Request Queue
 */
export interface RequestQueue {
  readonly _tag: "@app/RequestQueue";
  readonly requestQueue: Q.Queue<RequestContext>;
}

/**
 * Tag to access and provide the RequestQueue
 */
export const RequestQueue = tag<RequestQueue>();

/**
 * this is supposed to be called with an already constructed queue that will be closed
 * in case the process is either interrupted or ends for any reason
 */
export const GlobalRequestQueue = (requestQueue: Q.Queue<RequestContext>) =>
  L.fromManaged(RequestQueue)(
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
export const takeRequest = T.accessServiceM(RequestQueue)(
  ({ requestQueue }) => requestQueue.take
);

/**
 * Returns an effect that will poll indefinately the request queue
 * forking each process `f` in a new child fiber
 */
export const processRequests = <R>(
  f: (a: APIGatewayProxyEvent) => T.RIO<R, APIGatewayProxyResult>
) =>
  T.accessM((env: R) =>
    pipe(
      // poll from the request queue waiting in case no requests are present
      takeRequest,
      // fork each request in it's own fiber and start processing
      // here we are forking inside the parent scope so in case the
      // parent is interrupted each of the child will also trigger
      // interruption
      T.chain((r) => T.fork(P.complete(T.provideAll(env)(f(r.event)))(r.res))),
      // loop forever
      T.forever
    )
  );
