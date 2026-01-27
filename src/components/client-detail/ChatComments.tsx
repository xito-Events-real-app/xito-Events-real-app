import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { parseComments, getRelativeTime } from "@/lib/client-card-utils";

interface ChatCommentsProps {
  comments: string;
  onAddComment: (comment: string) => Promise<void>;
  isAddingComment?: boolean;
}

const ChatComments = ({ comments, onAddComment, isAddingComment = false }: ChatCommentsProps) => {
  const [newComment, setNewComment] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const parsedComments = parseComments(comments || '');
  
  // Auto-focus input when shown
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);
  
  // Scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || isAddingComment) return;
    
    await onAddComment(newComment.trim());
    setNewComment('');
    setShowInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowInput(false);
      setNewComment('');
    }
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">
            Comments {parsedComments.length > 0 && `(${parsedComments.length})`}
          </span>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-emerald-400 hover:text-emerald-300"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      {/* Comments List - Chat Style */}
      <div 
        ref={scrollRef}
        className="max-h-48 overflow-y-auto p-3 space-y-2"
      >
        {parsedComments.length === 0 ? (
          <div className="text-center text-white/30 py-4 text-sm">
            No comments yet. Tap + to add one.
          </div>
        ) : (
          [...parsedComments].reverse().map((comment, i) => (
            <div 
              key={i} 
              className="bg-white/5 rounded-lg px-3 py-2 animate-fade-in"
            >
              <div className="text-white/90 text-sm leading-relaxed">
                {comment.text}
              </div>
              {comment.timestamp && (
                <div className="text-[10px] text-white/40 mt-1 text-right">
                  {getRelativeTime(comment.timestamp)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Inline Input - Chat Style */}
      {showInput && (
        <form 
          onSubmit={handleSubmit}
          className="p-3 pt-0 border-t border-white/5 bg-white/5 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a comment..."
              className="flex-1 h-9 bg-transparent border-white/20 text-white placeholder:text-white/30 text-sm"
              disabled={isAddingComment}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isAddingComment}
              className="p-2 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingComment ? (
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChatComments;
