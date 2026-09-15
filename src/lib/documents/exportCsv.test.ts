import assert from 'node:assert/strict'
import test from 'node:test'


import {
  buildInvoiceCsvRows,
  buildInvoiceCsvRowsWithHeader,
  buildPurchaseOrderCsvRows,
  buildPurchaseOrderCsvRowsWithHeader,
  buildReceiptExpenseCsvRows,
  buildReceiptExpenseCsvRowsWithHeader,
  buildReceiptQualifiedCsvRows,
  buildReceiptQualifiedCsvRowsWithHeader,
  encodeCsvWithBom,
  INVOICE_CSV_HEADERS,
  PURCHASE_ORDER_CSV_HEADERS,
  RECEIPT_EXPENSE_CSV_HEADERS,
  RECEIPT_QUALIFIED_CSV_HEADERS,
} from '@/lib/documents/exportCsv'

// exportCsv
test('outputs header-only row when no line items', () => {
    const rows = buildInvoiceCsvRows([
      {
        id: "doc-1",
        title: "INV-001",
        counterparty: "Acme",
        contextDate: "2024-01-31",
        amountYen: 1000,
        notes: "",
        tags: [],
        extracted: { issue_date: "2024-01-31", recipient_name: "Client" },
        lineItems: [],
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0][1], "INV-001");
    assert.equal(rows[0][17], ""); // 明細行番号 empty
  })

test('prefixes UTF-8 BOM', () => {
    const buf = encodeCsvWithBom([["a", "b"]]);
    assert.equal(buf[0], 0xef);
    assert.equal(buf[1], 0xbb);
    assert.equal(buf[2], 0xbf);
  })

test('outputs one row per invoice in summary mode even with line items', () => {
    const rows = buildInvoiceCsvRows(
      [
        {
          id: "doc-1",
          title: "INV-001",
          counterparty: "Acme",
          contextDate: "2024-01-31",
          amountYen: 3000,
          notes: "",
          tags: [],
          extracted: {},
          lineItems: [
            {
              line_no: 1,
              transaction_date: null,
              description: "A",
              quantity: "1",
              unit: "",
              unit_price: "1000",
              amount: "1000",
              tax_rate: "10",
            },
            {
              line_no: 2,
              transaction_date: null,
              description: "B",
              quantity: "1",
              unit: "",
              unit_price: "2000",
              amount: "2000",
              tax_rate: "10",
            },
          ],
        },
      ],
      "summary"
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0][17], "");
    assert.equal(rows[0][19], "");
  })

test('outputs one row per line item sorted by line_no in with_line_items mode', () => {
    const rows = buildInvoiceCsvRows(
      [
      {
        id: "doc-1",
        title: "INV-001",
        counterparty: "Acme",
        contextDate: "2024-01-31",
        amountYen: 3000,
        notes: "memo",
        tags: ["tag1", "tag2"],
        extracted: {
          issue_date: "2024-01-31",
          recipient_name: "Client",
        },
        lineItems: [
          {
            line_no: 2,
            transaction_date: "2024-01-20",
            description: "B",
            quantity: "1",
            unit: "式",
            unit_price: "1000",
            amount: "1000",
            tax_rate: "10",
          },
          {
            line_no: 1,
            transaction_date: "2024-01-15",
            description: "A",
            quantity: "2",
            unit: "個",
            unit_price: "1000",
            amount: "2000",
            tax_rate: "8",
          },
        ],
      },
    ],
      "with_line_items"
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0][17], "1");
    assert.equal(rows[0][19], "A");
    assert.equal(rows[1][17], "2");
    assert.equal(rows[1][19], "B");
    assert.equal(rows[0][15], "tag1|tag2");
    assert.equal(rows[0][14], "memo");
  })

test('escapes commas, quotes, and newlines in CSV fields', () => {
    const csv = encodeCsvWithBom([
      ["a", "b, c", 'd"e', "f\ng"],
    ]).toString("utf-8");
    assert.ok(csv.includes('"b, c"'));
    assert.ok(csv.includes('"d""e"'));
    assert.ok(csv.includes('"f\ng"'));
  })

test('guards formula-injection-prone leading characters with a leading quote', () => {
    const csv = encodeCsvWithBom([
      ["=CMD('/C calc')", "+1+1", "-1+1", "@SUM(A1)", "normal"],
    ]).toString("utf-8");
    assert.ok(csv.includes("'=CMD('/C calc')"));
    assert.ok(csv.includes("'+1+1"));
    assert.ok(csv.includes("'-1+1"));
    assert.ok(csv.includes("'@SUM(A1)"));
    assert.ok(csv.includes(",normal"));
    assert.doesNotMatch(csv, /(?<!')=CMD/);
  })

test('outputs column header row as first line', () => {
    const rows = buildInvoiceCsvRowsWithHeader([
      {
        id: "doc-1",
        title: "INV-001",
        counterparty: "Acme",
        contextDate: null,
        amountYen: null,
        notes: "",
        tags: [],
        extracted: {},
        lineItems: [],
      },
    ]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], [...INVOICE_CSV_HEADERS]);
    assert.equal(rows[1][1], "INV-001");
  })

test('produces 25 columns per row', () => {
    const rows = buildInvoiceCsvRows([
      {
        id: "doc-1",
        title: "INV-001",
        counterparty: "Acme",
        contextDate: null,
        amountYen: null,
        notes: "",
        tags: [],
        extracted: {},
        lineItems: [
          {
            line_no: 1,
            transaction_date: null,
            description: "Item",
            quantity: "1",
            unit: "",
            unit_price: "100",
            amount: "100",
            tax_rate: "",
          },
        ],
      },
    ]);
    assert.equal(rows[0].length, 25);
  })

// purchase order exportCsv
test('outputs header-only row when no line items', () => {
    const rows = buildPurchaseOrderCsvRows([
      {
        id: "doc-1",
        title: "PO-001",
        counterparty: "サンプル株式会社",
        contextDate: "2024-01-31",
        amountYen: 1000,
        notes: "",
        tags: [],
        extracted: { issue_date: "2024-01-31", issuer_name: "自社株式会社" },
        lineItems: [],
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0][1], "PO-001");
    assert.equal(rows[0][18], ""); // 明細行番号 empty
  })

test('maps recipient to 発注先 column and issuer to 発注元 column (reversed from invoice)', () => {
    const rows = buildPurchaseOrderCsvRows([
      {
        id: "doc-1",
        title: "PO-001",
        counterparty: "取引先株式会社",
        contextDate: "2024-01-31",
        amountYen: 1000,
        notes: "",
        tags: [],
        extracted: {
          issuer_name: "自社株式会社",
          delivery_date: "2024-02-15",
          delivery_place: "本社倉庫",
          payment_terms: "月末締め翌月末払い",
        },
        lineItems: [],
      },
    ]);
    assert.equal(rows[0][4], "取引先株式会社"); // 発注先 = counterparty
    assert.equal(rows[0][5], "自社株式会社"); // 発注元 = extracted.issuer_name
    assert.equal(rows[0][3], "2024-02-15"); // 納期
    assert.equal(rows[0][7], "本社倉庫"); // 納品場所
    assert.equal(rows[0][8], "月末締め翌月末払い"); // 支払条件
  })

test('outputs one row per line item sorted by line_no in with_line_items mode', () => {
    const rows = buildPurchaseOrderCsvRows(
      [
        {
          id: "doc-1",
          title: "PO-001",
          counterparty: "取引先株式会社",
          contextDate: "2024-01-31",
          amountYen: 3000,
          notes: "memo",
          tags: ["tag1", "tag2"],
          extracted: {},
          lineItems: [
            {
              line_no: 2,
              transaction_date: "2024-01-20",
              description: "B",
              quantity: "1",
              unit: "式",
              unit_price: "1000",
              amount: "1000",
              tax_rate: "10",
            },
            {
              line_no: 1,
              transaction_date: "2024-01-15",
              description: "A",
              quantity: "2",
              unit: "個",
              unit_price: "1000",
              amount: "2000",
              tax_rate: "8",
            },
          ],
        },
      ],
      "with_line_items"
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0][18], "1");
    assert.equal(rows[0][20], "A");
    assert.equal(rows[1][18], "2");
    assert.equal(rows[1][20], "B");
  })

test('outputs column header row as first line', () => {
    const rows = buildPurchaseOrderCsvRowsWithHeader([
      {
        id: "doc-1",
        title: "PO-001",
        counterparty: "取引先株式会社",
        contextDate: null,
        amountYen: null,
        notes: "",
        tags: [],
        extracted: {},
        lineItems: [],
      },
    ]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], [...PURCHASE_ORDER_CSV_HEADERS]);
    assert.equal(rows[1][1], "PO-001");
  })

test('produces 26 columns per row', () => {
    const rows = buildPurchaseOrderCsvRows([
      {
        id: "doc-1",
        title: "PO-001",
        counterparty: "取引先株式会社",
        contextDate: null,
        amountYen: null,
        notes: "",
        tags: [],
        extracted: {},
        lineItems: [
          {
            line_no: 1,
            transaction_date: null,
            description: "Item",
            quantity: "1",
            unit: "",
            unit_price: "100",
            amount: "100",
            tax_rate: "",
          },
        ],
      },
    ]);
    assert.equal(rows[0].length, 26);
  })

// receipt expense exportCsv
test('outputs exactly one row per document', () => {
    const rows = buildReceiptExpenseCsvRows([
      {
        id: "doc-1",
        title: "打合せ",
        counterparty: "サンプル商店",
        contextDate: "2026-08-01",
        amountYen: 1200,
        notes: "memo",
        tags: ["tag1"],
        extracted: {
          transaction_date: "2026-08-01",
          amount: "1200",
          payment_method: "現金",
          expense_category: "会議費",
          issuer_name: "サンプル商店",
          purpose: "打合せ",
          participants: "山田,佐藤",
          participant_count: "2",
          department_code: "PJ-001",
          applicant: "山田",
          approver: "佐藤",
        },
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0][0], "doc-1");
  })

test('outputs the RECEIPT_EXPENSE_CSV_HEADERS as the first row', () => {
    const rows = buildReceiptExpenseCsvRowsWithHeader([
      {
        id: "doc-1",
        title: "打合せ",
        counterparty: "サンプル商店",
        contextDate: null,
        amountYen: null,
        notes: "",
        tags: [],
        extracted: {},
      },
    ]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], [...RECEIPT_EXPENSE_CSV_HEADERS]);
  })

test('escapes formula-injection-prone leading characters', () => {
    const rows = buildReceiptExpenseCsvRows([
      {
        id: "doc-1",
        title: "打合せ",
        counterparty: "",
        contextDate: null,
        amountYen: null,
        notes: "",
        tags: [],
        extracted: { issuer_name: "=CMD()" },
      },
    ]);
    const csv = encodeCsvWithBom(rows).toString("utf-8");
    assert.ok(csv.includes("'=CMD()"));
  })

// receipt qualified_invoice exportCsv
test('outputs the 8%/10% breakdown as individual columns', () => {
    const rows = buildReceiptQualifiedCsvRows([
      {
        id: "doc-1",
        title: "T1234567890123",
        counterparty: "サンプル株式会社",
        contextDate: "2026-08-01",
        amountYen: 56080,
        notes: "",
        tags: [],
        extracted: {
          issuer_name: "サンプル株式会社",
          registration_number: "T1234567890123",
          transaction_date: "2026-08-01",
          transaction_details: "雑貨代",
          subtotal_10: "50000",
          tax_10: "5000",
          subtotal_8: "1000",
          tax_8: "80",
          total: "56080",
          recipient_name: "〇〇 〇〇",
        },
      },
    ]);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], [
      "doc-1",
      "サンプル株式会社",
      "T1234567890123",
      "2026-08-01",
      "雑貨代",
      "50000",
      "5000",
      "1000",
      "80",
      "56080",
      "〇〇 〇〇",
      "",
      "",
    ]);
  })

test('outputs the RECEIPT_QUALIFIED_CSV_HEADERS as the first row', () => {
    const rows = buildReceiptQualifiedCsvRowsWithHeader([
      {
        id: "doc-1",
        title: "T1234567890123",
        counterparty: "サンプル株式会社",
        contextDate: null,
        amountYen: null,
        notes: "",
        tags: [],
        extracted: {},
      },
    ]);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], [...RECEIPT_QUALIFIED_CSV_HEADERS]);
  })
