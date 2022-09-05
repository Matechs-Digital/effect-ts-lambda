import { Effect } from "@effect-ts/core";
import * as Layer from "@effect-ts/core/Effect/Layer";
import { literal, pipe } from "@effect-ts/core/Function";
import { tag } from "@effect-ts/core/Has";
import type { _A } from "@effect-ts/core/Utils";

/**
 * Simulates a service that perform some sort of authentication
 */
const makeAuth = Effect.gen(function* (_) {
  const login = yield* _(
    pipe(
      Effect.succeedWith(() => "service_token"),
      // simulate load...
      Effect.delay(50),
      // cache the calls to this effect for 1 minute
      Effect.cached(60_000)
    )
  );

  return {
    // discriminate AuthService from any other service at the type level
    _tag: literal("@app/AuthService"),
    login,
  };
});

/**
 * Derives the type of AuthService from the return type of makeAuthService
 */
export interface Auth extends _A<typeof makeAuth> { }

/**
 * Tag to access and provide AuthService
 */
export const Auth = tag<Auth>();

/**
 * Live AuthService Layer
 */
export const LiveAuth = Layer.fromEffect(Auth)(makeAuth);

/**
 * Utility functions
 */
export const login = Effect.accessServiceM(Auth)(({ login }) => login);
