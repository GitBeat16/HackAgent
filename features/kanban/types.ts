export interface KanbanCard {
  id: string;
  title: string;
  tag: string;
  assignee: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}
