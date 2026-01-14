"use client";

import { Division } from "../types";
import { deleteDivision } from "../actions";
import { DivisionDialog } from "./division-dialog";
import { OrgTree } from "./org-tree";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DivisionManagerProps {
    flatDivisions: Division[];
    treeDivisions: Division[];
}

export function DivisionManager({ flatDivisions, treeDivisions }: DivisionManagerProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <DivisionDialog
                    parentCandidates={flatDivisions}
                    trigger={
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Division
                        </Button>
                    }
                />
            </div>

            <div className="border rounded-md p-4 bg-white min-h-[400px]">
                <OrgTree
                    divisions={flatDivisions}
                />
            </div>
        </div>
    );
}
