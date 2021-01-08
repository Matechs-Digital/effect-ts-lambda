import "./init";

import * as T from "@effect-ts/core/Effect";
import { pipe } from "@effect-ts/core/Function";
import * as R from "@effect-ts/node/Runtime";
import { LiveAuth, login } from "./program/Auth";
import { lambda } from "./program/Lambda";

export type Event = { _tag: "fail" } | { _tag: "login"; token: string };

export const { handler, main } = lambda((event: Event) =>
  pipe(
    login,
    T.chain((token) =>
      T.effectTotal(() => {
        if (event._tag === "fail") {
          throw new Error("simulate defect exception");
        }
        if (event.token !== token) {
          return {
            message: "not authorized",
          };
        }
        return {
          response: "success",
        };
      })
    )
  )
);

/**
 * As soon as the file loads we run the main process
 */
pipe(
  main,
  // we use the LiveAuth and the GlobalRequestQueue layer passing the global queue
  T.provideSomeLayer(LiveAuth),
  // we run the main process, this will listen to process.on(exit) and interrupt correctly
  R.runMain
);
