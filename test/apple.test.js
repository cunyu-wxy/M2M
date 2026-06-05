import assert from "node:assert/strict";
import test from "node:test";

import { AppleError, createAppleDeveloperToken, hasAppleCredentials } from "../src/apple.js";

test("detects missing Apple credentials", async () => {
  assert.equal(hasAppleCredentials({}), false);

  await assert.rejects(
    () => createAppleDeveloperToken({}),
    (error) => {
      assert.equal(error instanceof AppleError, true);
      assert.equal(error.code, "apple_credentials_missing");
      assert.equal(error.status, 503);
      return true;
    }
  );
});

test("detects configured Apple credentials", () => {
  assert.equal(
    hasAppleCredentials({
      APPLE_TEAM_ID: "team",
      APPLE_KEY_ID: "key",
      APPLE_PRIVATE_KEY: "private"
    }),
    true
  );
});
