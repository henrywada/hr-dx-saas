"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileUp, AlertCircle, CheckCircle, Download } from "lucide-react";
import { importEmployeesAction } from "../import-actions";
import { ImportResult } from "@/types/employee-import";

export function EmployeeImportDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await importEmployeesAction(formData);
      setResult(res);
      if (res.success && res.failureCount === 0) {
        // Success fully
      }
    } catch (error) {
      console.error(error);
      setResult({
        success: false,
        total: 0,
        successCount: 0,
        failureCount: 1,
        errors: [{ row: 0, email: "", reason: "予期せぬエラーが発生しました" }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    // 簡易的なテンプレートCSV生成
    const header = "name,email,role,division_code\n";
    const example = "山田太郎,taro@example.com,employee,SALES_01\n鈴木一郎,ichiro@example.com,boss,DEV_01";
    const blob = new Blob([header + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          CSVインポート
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>従業員一括インポート</DialogTitle>
          <DialogDescription>
            CSVファイルをアップロードして従業員を一括登録します。
            <br />
            <span 
              className="text-primary cursor-pointer hover:underline flex items-center gap-1 mt-1" 
              onClick={downloadTemplate}
            >
              <Download className="h-3 w-3" /> テンプレートをダウンロード
            </span>
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleImport} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="file">CSVファイル</Label>
              <Input
                ref={fileInputRef}
                id="file"
                name="file"
                type="file"
                accept=".csv"
                required
                disabled={isLoading}
              />
            </div>
            
            <DialogFooter>
               <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                 キャンセル
               </Button>
               <Button type="submit" disabled={isLoading}>
                 {isLoading ? (
                   <>
                     <span className="animate-spin mr-2">⏳</span> インポート中...
                   </>
                 ) : (
                   <>
                     <FileUp className="mr-2 h-4 w-4" /> インポート実行
                   </>
                 )}
               </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              {result.failureCount === 0 ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              )}
              <h3 className="font-semibold text-lg">
                処理完了: {result.successCount} / {result.total} 件 成功
              </h3>
            </div>

            {result.failureCount > 0 && (
              <Alert variant="destructive" className="max-h-[200px] overflow-y-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー ({result.failureCount}件)</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 text-xs mt-2 space-y-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>
                        {err.row > 0 ? `${err.row}行目 (${err.email}): ` : ""}
                        {err.reason}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button onClick={() => { setOpen(false); setResult(null); }}>
                閉じる
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
