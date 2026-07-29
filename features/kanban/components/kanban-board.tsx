"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import type { KanbanColumn } from "@/features/kanban/types";

export function KanbanBoard({ columns }: { columns: KanbanColumn[] }) {
  return (
    <div className="grid gap-4 overflow-x-auto lg:grid-cols-4">
      {columns.map((column) => (
        <div key={column.id} className="min-w-[260px] space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-medium text-foreground">{column.title}</h3>
            <span className="font-mono text-xs text-muted-foreground">{column.cards.length}</span>
          </div>
          <div className="space-y-3">
            {column.cards.map((card) => (
              <Card key={card.id} interactive className="space-y-3 p-4">
                <Badge tone="muted">{card.tag}</Badge>
                <p className="text-sm font-medium leading-snug text-foreground">{card.title}</p>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarFallback className="text-[0.6rem]">{getInitials(card.assignee)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{card.assignee}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
