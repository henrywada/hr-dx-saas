import assert from "node:assert/strict";
import test from "node:test";

import { analyzeWithGemini } from "./gemini";

function makeFetchMock(responseBody: unknown) {
  const calls: Array<[string, RequestInit | undefined]> = [];
  const fetchMock = async (url: string, init?: RequestInit) => {
    calls.push([url, init]);
    return {
      ok: true,
      json: async () => responseBody,
    } as Response;
  };
  return { fetchMock, calls };
}

test("posts the image and prompt to the Gemini generateContent API", async () => {
  const { fetchMock, calls } = makeFetchMock({
    candidates: [
      {
        content: {
          parts: [{ text: "通路が混雑しています。" }],
        },
      },
    ],
  });

  const result = await analyzeWithGemini(
    {
      imageBuffer: Buffer.from("hello"),
      mimeType: "image/jpeg",
      prompt: "混雑度を教えて",
    },
    { apiKey: "gemini-test", model: "gemini-2.5-flash", fetchImpl: fetchMock }
  );

  assert.equal(result.text, "通路が混雑しています。");
  assert.equal(result.model, "gemini-2.5-flash");
  assert.ok(
    calls[0][0].includes(
      "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    )
  );
  assert.ok(calls[0][0].includes("key=gemini-test"));
});

test("includes previous and current inline_data when previousImageBuffer is set", async () => {
  const { fetchMock, calls } = makeFetchMock({
    candidates: [
      {
        content: {
          parts: [{ text: "変化を検出しました。" }],
        },
      },
    ],
  });

  await analyzeWithGemini(
    {
      imageBuffer: Buffer.from("current"),
      mimeType: "image/jpeg",
      prompt: "2枚の差分を教えて",
      previousImageBuffer: Buffer.from("previous"),
      previousMimeType: "image/png",
    },
    { apiKey: "gemini-test", fetchImpl: fetchMock }
  );

  const body = JSON.parse(String(calls[0][1]?.body));
  const parts = body.contents[0].parts;

  assert.equal(parts.length, 3);
  assert.deepEqual(parts[0], { text: "2枚の差分を教えて" });
  assert.deepEqual(parts[1], {
    inline_data: {
      mime_type: "image/png",
      data: Buffer.from("previous").toString("base64"),
    },
  });
  assert.deepEqual(parts[2], {
    inline_data: {
      mime_type: "image/jpeg",
      data: Buffer.from("current").toString("base64"),
    },
  });
});

test("includes generationConfig.responseSchema when responseSchema option is set", async () => {
  const { fetchMock, calls } = makeFetchMock({
    candidates: [
      {
        content: {
          parts: [{ text: '{"severity":"notify","summary":"x"}' }],
        },
      },
    ],
  });
  const schema = { type: "OBJECT", properties: { severity: { type: "STRING" } } };

  await analyzeWithGemini(
    { imageBuffer: Buffer.from("hello"), mimeType: "image/jpeg", prompt: "test" },
    { apiKey: "gemini-test", fetchImpl: fetchMock, responseSchema: schema }
  );

  const body = JSON.parse(String(calls[0][1]?.body));
  assert.deepEqual(body.generationConfig, {
    responseMimeType: "application/json",
    responseSchema: schema,
  });
});

test("omits generationConfig when responseSchema option is not set", async () => {
  const { fetchMock, calls } = makeFetchMock({
    candidates: [{ content: { parts: [{ text: "plain text" }] } }],
  });

  await analyzeWithGemini(
    { imageBuffer: Buffer.from("hello"), mimeType: "image/jpeg", prompt: "test" },
    { apiKey: "gemini-test", fetchImpl: fetchMock }
  );

  const body = JSON.parse(String(calls[0][1]?.body));
  assert.equal(body.generationConfig, undefined);
});
