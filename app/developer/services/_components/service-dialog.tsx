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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createService, updateService } from "../actions";
import { Loader2 } from "lucide-react";

interface Category {
    id: string;
    name: string;
}

interface ServiceDialogProps {
    service?: {
        id: string;
        name: string;
        description: string | null;
        service_category_id: string;
    } | null;
    categories: Category[];
    trigger?: React.ReactNode;
    isOpen?: boolean;
    onClose?: () => void;
}

export function ServiceDialog({ service, categories, trigger, isOpen, onClose }: ServiceDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>(service?.service_category_id || "");

    useEffect(() => {
        if (isOpen !== undefined) {
            setOpen(isOpen);
        }
        if(isOpen && service) {
             setSelectedCategory(service.service_category_id);
        } else if (isOpen && !service) {
            // 新規作成時はリセット、ただしカテゴリーが一つしかなければそれを選択などしても良いが、一旦空で
            setSelectedCategory("");
        }

    }, [isOpen, service]);

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
            if (service) {
                result = await updateService(service.id, formData);
            } else {
                result = await createService(formData);
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
                    <DialogTitle>{service ? "サービス編集" : "サービス登録"}</DialogTitle>
                    <DialogDescription>
                        サービスの情報を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="category">カテゴリー <span className="text-red-500">*</span></Label>
                        <Select 
                            name="service_category_id" 
                            value={selectedCategory} 
                            onValueChange={setSelectedCategory}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="カテゴリーを選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">サービス名 <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            name="name"
                            defaultValue={service?.name}
                            placeholder="例: 適性検査サービス"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">説明</Label>
                        <Textarea
                            id="description"
                            name="description"
                            defaultValue={service?.description || ""}
                            placeholder="サービスの説明を入力"
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {service ? "更新" : "登録"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
