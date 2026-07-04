"use client";

/**
 * Phase 11.4 — Comment Thread Component
 *
 * Displays threaded comments on a fact sheet with reply capability.
 */

import { useState } from "react";
import { MessageSquare, Reply, Send } from "lucide-react";

interface Comment {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  replies?: Comment[];
}

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  onSubmitComment: (content: string, parentId?: string) => void;
}

function CommentItem({
  comment,
  currentUserId,
  onReply,
  depth = 0,
}: {
  comment: Comment;
  currentUserId: string;
  onReply: (parentId: string, content: string) => void;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleReply = () => {
    if (!replyContent.trim()) return;
    onReply(comment.id, replyContent.trim());
    setReplyContent("");
    setShowReply(false);
  };

  return (
    <div className={`${depth > 0 ? "ml-6 border-l-2 border-rosely-petal pl-4" : ""}`}>
      <div className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-rosely-night">
            {comment.authorName ?? comment.authorId.slice(0, 8)}
          </span>
          <span className="text-xs text-rosely-mist">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
          {comment.editedAt && <span className="text-xs text-rosely-mist italic">(edited)</span>}
        </div>
        <p className="text-sm text-rosely-dusk whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <button
            onClick={() => setShowReply(!showReply)}
            className="inline-flex items-center gap-1 text-xs text-rosely-plum hover:text-rosely-plum/80 transition-colors"
          >
            <Reply className="size-3" />
            Reply
          </button>
        </div>

        {showReply && (
          <div className="flex items-start gap-2 mt-2">
            <textarea
              placeholder="Write a reply..."
              aria-label="Write a reply"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac resize-none"
              rows={2}
            />
            <button
              onClick={handleReply}
              disabled={!replyContent.trim()}
              aria-label="Send reply"
              className="p-2 rounded-lg text-white bg-rosely-plum hover:bg-rosely-plum/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {(comment.replies?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-0">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ comments, currentUserId, onSubmitComment }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onSubmitComment(newComment.trim());
    setNewComment("");
  };

  const handleReply = (parentId: string, content: string) => {
    onSubmitComment(content, parentId);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-rosely-night flex items-center gap-1.5">
        <MessageSquare className="size-4 text-rosely-plum" />
        Comments
        {comments.length > 0 && (
          <span className="text-xs text-rosely-mist">({comments.length})</span>
        )}
      </h3>

      {/* New comment input */}
      <div className="flex items-start gap-2">
        <textarea
          placeholder="Add a comment..."
          aria-label="Add a comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac resize-none"
          rows={2}
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          aria-label="Send comment"
          className="p-2 rounded-lg text-white bg-rosely-plum hover:bg-rosely-plum/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="size-4" />
        </button>
      </div>

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="divide-y divide-rosely-petal">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={handleReply}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-rosely-mist italic py-2">
          No comments yet. Be the first to add one.
        </p>
      )}
    </div>
  );
}
