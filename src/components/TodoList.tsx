"use client";

/**
 * Phase 11.5 — Todo List Component
 *
 * Displays to-do items attached to a fact sheet.
 * Supports creating, completing, and assigning todos.
 */

import { useState } from "react";
import { CheckSquare, Square, Plus, Calendar, User } from "lucide-react";

interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName?: string;
  done: boolean;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface TodoListProps {
  todos: TodoItem[];
  onToggle: (id: string, done: boolean) => void;
  onCreate: (title: string, assigneeId?: string, dueDate?: string) => void;
  readOnly?: boolean;
}

export function TodoList({ todos, onToggle, onCreate, readOnly = false }: TodoListProps) {
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onCreate(newTitle.trim(), undefined, newDueDate || undefined);
    setNewTitle("");
    setNewDueDate("");
    setShowNew(false);
  };

  const pending = todos.filter((t) => !t.done);
  const completed = todos.filter((t) => t.done);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-rosely-night flex items-center gap-1.5">
          <CheckSquare className="size-4 text-rosely-plum" />
          To-Dos
          {todos.length > 0 && (
            <span className="text-xs text-rosely-mist">
              ({completed.length}/{todos.length} done)
            </span>
          )}
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowNew(true)}
            className="p-1.5 rounded-lg text-rosely-mist hover:text-rosely-night hover:bg-rosely-petal transition-colors"
            aria-label="Add todo"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      {/* New todo form */}
      {showNew && (
        <div className="border border-rosely-blush rounded-lg p-3 bg-card shadow-sm flex flex-col gap-2">
          <input
            type="text"
            placeholder="What needs to be done?"
            aria-label="To-do title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              aria-label="Due date"
              className="px-2 py-1 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
            />
            <div className="flex-1" />
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-sm font-medium text-white bg-rosely-plum rounded-md hover:bg-rosely-plum/90 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowNew(false);
                setNewTitle("");
                setNewDueDate("");
              }}
              className="px-3 py-1.5 text-sm font-medium text-rosely-dusk bg-rosely-petal rounded-md hover:bg-rosely-blush transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending todos */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-1">
          {pending.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-2 py-2 px-2 rounded-md hover:bg-rosely-petal/30 transition-colors group"
            >
              <button
                onClick={() => !readOnly && onToggle(todo.id, true)}
                disabled={readOnly}
                aria-label={`Mark "${todo.title}" as done`}
                className="mt-0.5 text-rosely-mist hover:text-rosely-plum transition-colors"
              >
                <Square className="size-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-rosely-night">{todo.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {todo.dueDate && (
                    <span className="inline-flex items-center gap-1 text-xs text-rosely-mist">
                      <Calendar className="size-3" />
                      {new Date(todo.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {todo.assigneeName && (
                    <span className="inline-flex items-center gap-1 text-xs text-rosely-mist">
                      <User className="size-3" />
                      {todo.assigneeName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed todos */}
      {completed.length > 0 && (
        <div className="flex flex-col gap-1 opacity-60">
          <span className="text-xs text-rosely-mist font-medium">Completed</span>
          {completed.map((todo) => (
            <div key={todo.id} className="flex items-start gap-2 py-1.5 px-2">
              <button
                onClick={() => !readOnly && onToggle(todo.id, false)}
                disabled={readOnly}
                aria-label={`Mark "${todo.title}" as not done`}
                className="mt-0.5 text-rosely-teal"
              >
                <CheckSquare className="size-4" />
              </button>
              <p className="text-sm text-rosely-dusk line-through">{todo.title}</p>
            </div>
          ))}
        </div>
      )}

      {todos.length === 0 && !showNew && (
        <p className="text-xs text-rosely-mist italic">No to-dos yet</p>
      )}
    </div>
  );
}
