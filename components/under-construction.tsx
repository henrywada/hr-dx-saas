import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";
import Link from "next/link";

interface UnderConstructionProps {
    title?: string;
}

export default function UnderConstruction({ title }: UnderConstructionProps) {
    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-6 p-4 text-center">
            <div className="rounded-full bg-muted p-6">
                <Construction className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">
                    {title ? `${title}は開発中です` : "開発中です"}
                </h1>
                <p className="text-muted-foreground">
                    この機能は現在準備中です。しばらくお待ちください。
                </p>
            </div>
            <Button asChild>
                <Link href="/dashboard">ダッシュボードに戻る</Link>
            </Button>
        </div>
    );
}
