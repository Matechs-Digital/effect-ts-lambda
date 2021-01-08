import * as T from "@effect-ts/core/Effect";
import { pipe } from "@effect-ts/core/Function";
import { login } from "../utils/Auth";
import { lambda } from "../utils/Lambda";

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
