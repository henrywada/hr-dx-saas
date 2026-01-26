"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { deleteServiceCategory } from "../actions";
import { CategoryDialog } from "./category-dialog";

interface Category {
    id: string;
    name: string;
    description: string | null;
}

interface CategoryManagerProps {
    categories: Category[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleEdit = (category: Category) => {
        setEditCategory(category);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`カテゴリー「${name}」を削除してもよろしいですか？\n関連するサービスのカテゴリー情報にも影響が出る可能性があります。`)) {
            await deleteServiceCategory(id);
        }
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditCategory(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>カテゴリー管理</CardTitle>
                        <CardDescription>
                            サービスの分類に使用するカテゴリーを管理します。
                        </CardDescription>
                    </div>
                    <CategoryDialog
                         category={editCategory}
                         isOpen={isDialogOpen}
                         onClose={handleDialogClose}
                         trigger={
                            <Button onClick={() => {
                                setEditCategory(null);
                                setIsDialogOpen(true);
                            }}>
                                <Plus className="mr-2 h-4 w-4" />
                                新規登録
                            </Button>
                         }
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>カテゴリー名</TableHead>
                            <TableHead>説明</TableHead>
                            <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                    カテゴリーが登録されていません
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell>{category.description || "-"}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(category)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(category.id, category.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
