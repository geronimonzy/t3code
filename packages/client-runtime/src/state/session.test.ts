import { AuthOrchestrationOperateScope, type AuthSessionState } from "@t3tools/contracts";
import { describe, expect, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/reactivity";

import { retainLastGrant } from "./session.ts";

const grant: AuthSessionState = {
  authenticated: true,
  auth: {
    policy: "remote-reachable",
    bootstrapMethods: [],
    sessionMethods: [],
    sessionCookieName: "test",
  },
  scopes: [AuthOrchestrationOperateScope],
  permissions: [AuthOrchestrationOperateScope],
};
const previousSuccess = Option.some(AsyncResult.success(grant));

describe("retainLastGrant", () => {
  it("keeps the last good grant through a transient fetch failure", () => {
    const failed = AsyncResult.failure(Cause.fail({ _tag: "RemoteEnvironmentAuthFetchError" }), {
      previousSuccess,
    });
    const retained = retainLastGrant(failed);
    expect(retained._tag).toBe("Success");
    expect(Option.getOrNull(AsyncResult.value(retained))).toBe(grant);
  });

  it("surfaces a transient failure when there was never a good grant", () => {
    const failed = AsyncResult.failure<AuthSessionState, { _tag: string }>(
      Cause.fail({ _tag: "RemoteEnvironmentAuthTimeoutError" }),
    );
    expect(retainLastGrant(failed)._tag).toBe("Failure");
  });

  it("revokes on a rejected credential even with a cached grant", () => {
    const rejected = AsyncResult.failure(Cause.fail({ _tag: "EnvironmentAuthInvalidError" }), {
      previousSuccess,
    });
    expect(retainLastGrant(rejected)._tag).toBe("Failure");
  });

  it("passes definitive successes through, including authenticated:false", () => {
    const signedOut = AsyncResult.success({ ...grant, authenticated: false });
    expect(retainLastGrant(signedOut)).toBe(signedOut);
  });
});
