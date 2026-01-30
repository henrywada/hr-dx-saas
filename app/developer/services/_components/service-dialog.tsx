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
        title: string | null;
        description: string | null;
        service_category_id: string;
        sort_order?: number;
        route_path?: string | null;
        release_status?: "released" | "unreleased" | null;
        target_audience?: "all_users" | "admins_only" | "saas_adm" | null;
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
    const [selectedReleaseStatus, setSelectedReleaseStatus] = useState<string>(service?.release_status || "unreleased");
    const [selectedTargetAudience, setSelectedTargetAudience] = useState<string>(service?.target_audience || "all_users");


    useEffect(() => {
        if (isOpen !== undefined) {
            setOpen(isOpen);
        }
        if(isOpen && service) {
             setSelectedCategory(service.service_category_id);
             setSelectedReleaseStatus(service.release_status || "unreleased");
             setSelectedTargetAudience(service.target_audience || "all_users");

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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                    
                    <div className="grid grid-cols-2 gap-4">
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
                            <Label htmlFor="sort_order">ソート順</Label>
                            <Input
                                id="sort_order"
                                name="sort_order"
                                type="number"
                                defaultValue={service?.sort_order || 0}
                                placeholder="0"
                            />
                        </div>
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
                        <Label htmlFor="title">タイトル</Label>
                        <Input
                            id="title"
                            name="title"
                            defaultValue={service?.title || ""}
                            placeholder="表示用タイトル"
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
                    
                    <div className="space-y-2">
                        <Label htmlFor="route_path">遷移先パス</Label>
                        <Input
                            id="route_path"
                            name="route_path"
                            defaultValue={service?.route_path || ""}
                            placeholder="例: /dashboard/settings"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="release_status">リリース状況</Label>
                            <Select 
                                name="release_status" 
                                value={selectedReleaseStatus} 
                                onValueChange={setSelectedReleaseStatus}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="released">リリース済み</SelectItem>
                                    <SelectItem value="unreleased">未リリース</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target_audience">利用対象</Label>
                            <Select 
                                name="target_audience" 
                                value={selectedTargetAudience} 
                                onValueChange={setSelectedTargetAudience}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all_users">全ユーザー</SelectItem>
                                    <SelectItem value="admins_only">管理者のみ</SelectItem>
                                    <SelectItem value="saas_adm">SaaS管理者</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
