import { Effect } from "@effect-ts/core";
import { pipe } from "@effect-ts/core/Function";
import { login } from "../utils/Auth";

export type Event = { _tag: "fail" } | { _tag: "login"; token: string };

export function program(event: Event) {
  return pipe(
    login,
    Effect.chain((token) =>
      Effect.succeedWith(() => {
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
  );
}
