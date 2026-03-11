import React from "react";
import { OfferValidationForm } from "@/features/offer-validation/components/OfferValidationForm";
import { ShieldCheckIcon } from "lucide-react";

export const metadata = {
  title: "オファー妥当性検証 | AI Recruiting",
  description: "市場相場とAIを活用したオファー条件の競争力検証ツール",
};

export default function OfferValidationPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-indigo-600" />
          オファー妥当性検証
        </h1>
        <p className="text-gray-500 mt-2">
          現在の採用市場のリアルタイムデータとAI推論を掛け合わせ、提示オファーの競争力・想定採用可能性を診断します。
        </p>
      </div>

      <OfferValidationForm />
    </div>
  );
}
