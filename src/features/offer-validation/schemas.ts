import { z } from "zod";

// フロントエンドから Server Action に渡すリクエスト型
export const offerValidationRequestSchema = z.object({
  jobConditions: z.string().min(1, "求める条件を入力してください"),
  salary: z.number().min(0, "適切な金額を入力してください"),
  salaryUnit: z.enum(["万円", "千円", "円"]).default("万円"),
  location: z.string().min(1, "勤務地域を入力してください"),
});

export type OfferValidationRequest = z.infer<typeof offerValidationRequestSchema>;

// おすすめ採用サイトの型
export const recommendedSiteSchema = z.object({
  name: z.string(),
  url: z.string().optional().nullable(),
  reason: z.string(),
});

// AIからのレスポンスを固定するためのスキーマ（Zodによるパース用）
export const offerValidationResponseSchema = z.object({
  score: z.number().min(1).max(5).describe("1から5までの5段階評価。5が最も競争力が高い。"),
  comment: z.string().describe("市場平均と比較した際の、評価結果の具体的なコメント。"),
  summary: z.string().describe("全体の総評として、このオファーで採用競争力があるかどうか。短めに。"),
  recommendedSites: z.array(recommendedSiteSchema).describe("この条件であれば掲載をお勧めする採用サイト名とその理由。"),
});

export type OfferValidationResponse = z.infer<typeof offerValidationResponseSchema>;
