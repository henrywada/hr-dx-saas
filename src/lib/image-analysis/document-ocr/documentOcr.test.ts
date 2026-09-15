import assert from "node:assert/strict";
import test from "node:test";

import { businessCardPlugin } from "@/features/documents/plugins/business_card/plugin";
import { invoicePlugin } from "@/features/documents/plugins/invoice/plugin";
import { ocrDocument } from "./documentOcr";

function makeFetchMock(responseText: string) {
  const calls: Array<[string, RequestInit | undefined]> = [];
  const fetchMock = async (url: string, init?: RequestInit) => {
    calls.push([url, init]);
    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: responseText }],
            },
          },
        ],
      }),
    } as Response;
  };
  return { fetchMock, calls };
}

test("posts prompt, front, then back to Gemini and returns merged extracted fields", async () => {
  const { fetchMock, calls } = makeFetchMock(
    JSON.stringify({
      front: {
        full_name: "山田太郎",
        company: "",
        title: "",
        department: "",
        address: "",
        phone: "",
        fax: "",
        email: "",
        website: "",
      },
      back: {
        full_name: "Yamada Taro",
        company: "例示商事",
        title: "",
        department: "",
        address: "",
        phone: "",
        fax: "",
        email: "taro@example.com",
        website: "",
      },
    })
  );

  const result = await ocrDocument({
    front: { imageBuffer: Buffer.from("front"), mimeType: "image/jpeg" },
    back: { imageBuffer: Buffer.from("back"), mimeType: "image/png" },
    plugin: businessCardPlugin,
    apiKey: "gemini-test",
    model: "gemini-2.5-flash",
    fetchImpl: fetchMock,
  });

  const body = JSON.parse(String(calls[0][1]?.body));
  const parts = body.contents[0].parts;

  assert.ok(
    calls[0][0].includes(
      "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    )
  );
  assert.equal(parts.length, 3);
  assert.deepEqual(parts[0], { text: businessCardPlugin.analyzePrompt });
  assert.deepEqual(parts[1], {
    inline_data: {
      mime_type: "image/jpeg",
      data: Buffer.from("front").toString("base64"),
    },
  });
  assert.deepEqual(parts[2], {
    inline_data: {
      mime_type: "image/png",
      data: Buffer.from("back").toString("base64"),
    },
  });
  assert.equal(result.extracted.full_name, "山田太郎");
  assert.equal(result.extracted.company, "例示商事");
  assert.equal(result.extracted.email, "taro@example.com");
  assert.ok(result.rawText.includes("front"));
  assert.ok("candidates" in (result.raw as Record<string, unknown>));
});

test("sends only the front image and treats a top-level object as front", async () => {
  const { fetchMock, calls } = makeFetchMock(
    JSON.stringify({
      full_name: "佐藤花子",
      company: "サンプル株式会社",
      email: "hanako@example.com",
    })
  );

  const result = await ocrDocument({
    front: { imageBuffer: Buffer.from("front-only"), mimeType: "image/webp" },
    plugin: businessCardPlugin,
    apiKey: "gemini-test",
    fetchImpl: fetchMock,
  });

  const body = JSON.parse(String(calls[0][1]?.body));
  const parts = body.contents[0].parts;

  assert.equal(parts.length, 2);
  assert.deepEqual(parts[1], {
    inline_data: {
      mime_type: "image/webp",
      data: Buffer.from("front-only").toString("base64"),
    },
  });
  assert.equal(result.extracted.full_name, "佐藤花子");
  assert.equal(result.extracted.company, "サンプル株式会社");
  assert.equal(result.extracted.email, "hanako@example.com");
});

test("parses structured invoice JSON with line items", async () => {
  const { fetchMock } = makeFetchMock(
    JSON.stringify({
      header: {
        invoice_number: "001",
        issuer_name: "Co",
        total: "1000",
      },
      line_items: [{ line_no: 1, description: "Item", amount: "1000" }],
    })
  );

  const result = await ocrDocument({
    pages: [{ imageBuffer: Buffer.from("x"), mimeType: "image/jpeg" }],
    plugin: invoicePlugin,
    apiKey: "test-key",
    fetchImpl: fetchMock,
  });

  assert.equal(result.extracted.invoice_number, "001");
  assert.equal(result.lineItems?.length, 1);
});

test("throws when Gemini returns invalid JSON", async () => {
  const { fetchMock } = makeFetchMock("読み取り失敗");

  await assert.rejects(
    () =>
      ocrDocument({
        front: { imageBuffer: Buffer.from("front"), mimeType: "image/jpeg" },
        plugin: businessCardPlugin,
        apiKey: "gemini-test",
        fetchImpl: fetchMock,
      }),
    /Gemini OCR response was not valid JSON/
  );
});
