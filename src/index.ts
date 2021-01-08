import "./utils/Init";

import * as T from "@effect-ts/core/Effect";
import { pipe } from "@effect-ts/core/Function";
import * as R from "@effect-ts/node/Runtime";
import { LiveAuth } from "./utils/Auth";
import { handler, main } from "./program";

/**
 * As soon as the file loads we run the main process
 */
pipe(
  main,
  // we use the LiveAuth
  T.provideSomeLayer(LiveAuth),
  // we run the main process, this will listen to process.on(exit) and interrupt correctly
  R.runMain
);

export { handler };
