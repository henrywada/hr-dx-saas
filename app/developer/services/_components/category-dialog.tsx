"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { createServiceCategory, updateServiceCategory } from "../actions";
import { Loader2 } from "lucide-react";

interface CategoryDialogProps {
    category?: {
        id: string;
        name: string;
        description: string | null;
    } | null;
    trigger?: React.ReactNode;
    isOpen?: boolean;
    onClose?: () => void;
}

export function CategoryDialog({ category, trigger, isOpen, onClose }: CategoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen !== undefined) {
            setOpen(isOpen);
        }
    }, [isOpen]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen && onClose) {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        
        try {
            let result;
            if (category) {
                result = await updateServiceCategory(category.id, formData);
            } else {
                result = await createServiceCategory(formData);
            }

            if (result.error) {
                setError(result.error);
            } else {
                handleOpenChange(false);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{category ? "カテゴリー編集" : "カテゴリー登録"}</DialogTitle>
                    <DialogDescription>
                        サービスカテゴリーの情報を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="name">カテゴリー名 <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={category?.name}
                            placeholder="例: 人事・採用支援"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">説明</Label>
                        <Textarea
                            id="description"
                            name="description"
                            defaultValue={category?.description || ""}
                            placeholder="カテゴリーの説明を入力"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {category ? "更新" : "登録"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
