"use client";

import { useActionState } from "react";
import { updatePulseConfig } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { useEffect, useState } from "react";

// selectタグのスタイリングはTailwind CSSで行うため、Selectコンポーネントの代わりにnative selectを使用するか、
// Dashboardのデザインに合わせてカスタマイズされたSelectコンポーネントを使用します。
// ここでは、ユーザー要望の画像に近いイメージで実装するため、ネイティブのselectをスタイリングして使用します。

interface BasicSettingsFormProps {
    initialFrequency: string;
    tenantId?: string;
}

const initialState = {
    message: "",
    error: "",
};

export function BasicSettingsForm({ initialFrequency }: BasicSettingsFormProps) {
    const [state, formAction, isPending] = useActionState(updatePulseConfig, initialState);
    const [frequency, setFrequency] = useState(initialFrequency);

    // サーバー側での更新が成功した場合、ローカルのstateも更新されているはずだが、
    // initialFrequencyがpropsとして渡ってくるため、useEffectでの同期は必須ではないが念のため。
    useEffect(() => {
        setFrequency(initialFrequency);
    }, [initialFrequency]);

    return (
        <form action={formAction}>
            <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-2 mb-4">
                    <div className="text-gray-500">
                        <Activity className="h-6 w-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">パルスサーベイ頻度</h2>
                </div>

                <div className="pl-8 space-y-4">
                    <p className="text-gray-600">
                        パルスサーベイの回答が可能な頻度（毎日、毎週、毎月）
                    </p>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <select
                                name="frequency"
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                className="appearance-none bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline min-w-[200px]"
                            >
                                <option value="daily">毎日</option>
                                <option value="weekly">毎週</option>
                                <option value="monthly">毎月</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                        >
                            {isPending ? "更新中..." : "変更する"}
                        </Button>
                    </div>
                </div>

                {state?.message && (
                    <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
                        {state.message}
                    </div>
                )}
                {state?.error && (
                    <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                        {state.error}
                    </div>
                )}
            </div>
        </form>
    );
}
