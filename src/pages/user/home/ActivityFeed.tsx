import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MoreHorizontal, MessageSquare } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ActivityItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'notification' | 'message';
  href?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

export const ActivityFeed = React.memo(function ActivityFeed({ items }: ActivityFeedProps) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="zeni-spec-label flex items-center gap-2">
          Activity
        </h2>
        <button
          type="button"
          onClick={() => navigate('/app/messages')}
          className="text-zinc-400 hover:text-zeni-foreground transition-colors"
          aria-label="View all activity"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-zeni-surface p-4 rounded-md border border-zinc-200 text-sm font-mono text-zinc-500">
            No recent activity. Start exploring or messaging agents.
          </div>
        ) : (
          items.map((item, idx) => (
            <motion.button
              key={item.id}
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25 }}
              onClick={() => item.href && navigate(item.href)}
              className={cn(
                'zeni-card w-full bg-zeni-surface p-4 rounded-md border border-zinc-200 hover:border-zeni-foreground cursor-pointer flex gap-4 text-left',
                item.type === 'message' && 'border-l-4 border-l-zeni-foreground'
              )}
            >
              {item.type === 'message' ? (
                <div className="w-10 h-10 bg-zinc-100 text-zeni-foreground rounded-sm flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-24 h-20 bg-zinc-200 rounded-md flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm mb-0.5 truncate">{item.title}</h3>
                  <span className="text-[10px] font-mono text-zinc-400 flex-shrink-0">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 line-clamp-2">{item.desc}</p>
                {item.type === 'notification' && (
                  <span className="zeni-spec-label bg-zinc-100 px-2 py-0.5 rounded-sm text-zinc-600 inline-block mt-2">
                    Update
                  </span>
                )}
              </div>
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
});
