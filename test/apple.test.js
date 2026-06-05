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

test("accepts a pre-signed developer token", async () => {
  const token =
    "eyJhbGciOiJFUzI1NiIsImtpZCI6IkFCQzEyM0RFRkcifQ." +
    "eyJpc3MiOiJERUYxMjNHSElKIiwiaWF0IjoxNDM3MTc5MDM2LCJleHAiOjE3ODAwMDAwMDB9." +
    "signature";

  assert.equal(hasAppleCredentials({ APPLE_DEVELOPER_TOKEN: token }), true);

  const result = await createAppleDeveloperToken({ APPLE_DEVELOPER_TOKEN: token });
  assert.equal(result.developerToken, token);
  assert.equal(result.expiresAt, 1780000000);
});
