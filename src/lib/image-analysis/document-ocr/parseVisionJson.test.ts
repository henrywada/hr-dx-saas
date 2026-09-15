import assert from "node:assert/strict";
import test from "node:test";

import { parseVisionJson } from "./parseVisionJson";

test("parses raw JSON", () => {
  assert.deepEqual(parseVisionJson('{ "front": { "full_name": "山田太郎" } }'), {
    front: { full_name: "山田太郎" },
  });
});

test("parses JSON wrapped in a json fence", () => {
  const text = [
    "```json",
    '{ "front": { "company": "例示商事" } }',
    "```",
  ].join("\n");

  assert.deepEqual(parseVisionJson(text), {
    front: { company: "例示商事" },
  });
});

test("returns null for invalid text", () => {
  assert.equal(parseVisionJson("これはJSONではありません"), null);
});
