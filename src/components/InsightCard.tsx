// src/components/InsightCard.tsx
// Step 8 UI: Display meaning + actions with feedback

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  ArrowRight, 
  TrendingUp, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { useInsight } from '@/hooks/useInsight';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  signalId: string;
  severity?: number;
  compact?: boolean;
  onActionClick?: (action: string) => void;
  className?: string;
}

export function InsightCard({ 
  signalId, 
  severity = 2,
  compact = false,
  onActionClick,
  className 
}: InsightCardProps) {
  const { insight, isLoading, error, refetch, submitFeedback } = useInsight(signalId);
  const [expanded, setExpanded] = useState(!compact);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Handle feedback
  const handleFeedback = async (positive: boolean) => {
    if (feedbackSubmitted || submittingFeedback) return;
    
    setSubmittingFeedback(true);
    const rating = positive ? 5 : 2;
    const success = await submitFeedback(rating);
    setSubmittingFeedback(false);
    
    if (success) {
      setFeedbackSubmitted(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(
        "insight-card loading",
        "bg-secondary/50 rounded-lg p-3 mt-3",
        className
      )}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Generating insight...</span>
        </div>
      </div>
    );
  }

  // Error or no insight
  if (error || !insight?.meaning) {
    return null; // Silent fail - don't break the UI
  }

  // Insight that shouldn't be generated (low priority)
  if (insight.should_generate === false) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "insight-card",
        "bg-card border border-border rounded-lg mt-3 overflow-hidden",
        severity === 0 && "border-l-[3px] border-l-red-500",
        severity === 1 && "border-l-[3px] border-l-amber-500",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Insight</span>
          
          {insight.pattern && (
            <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
              {insight.pattern}
            </span>
          )}
          
          {insight.cached && (
            <span className="text-xs text-muted-foreground">cached</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {insight.confidence}% confidence
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Meaning: "So what?" */}
              <p className="text-sm text-foreground leading-relaxed">
                {insight.meaning}
              </p>

              {/* Actions: "Now what?" */}
              {insight.actions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recommended actions
                  </div>
                  {insight.actions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => onActionClick?.(action)}
                      className={cn(
                        "flex items-center gap-2 w-full text-left text-sm p-2 rounded",
                        "hover:bg-secondary/70 transition-colors group",
                        "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ArrowRight className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      <span>{action}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Footer: Related signals + Feedback */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                {/* Related signals */}
                {insight.related_signals && insight.related_signals.length > 0 && (
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <TrendingUp className="w-3 h-3" />
                    <span>{insight.related_signals.length} connected signals</span>
                  </button>
                )}

                {/* Feedback buttons */}
                <div className="flex items-center gap-1 ml-auto">
                  {feedbackSubmitted ? (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Thanks for feedback
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleFeedback(true)}
                        disabled={submittingFeedback}
                        className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                        title="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground hover:text-green-600" />
                      </button>
                      <button
                        onClick={() => handleFeedback(false)}
                        disabled={submittingFeedback}
                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                        title="Not helpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5 text-muted-foreground hover:text-red-600" />
                      </button>
                      <button
                        onClick={refetch}
                        disabled={submittingFeedback}
                        className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                        title="Regenerate"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Compact inline version for signal lists
export function InsightBadge({ 
  signalId,
  className 
}: { 
  signalId: string;
  className?: string;
}) {
  const { insight, isLoading } = useInsight(signalId, { enabled: true });

  if (isLoading || !insight?.pattern) {
    return null;
  }

  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full",
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
        className
      )}
      title={insight.meaning || undefined}
    >
      <Lightbulb className="w-3 h-3" />
      {insight.pattern}
    </span>
  );
}
