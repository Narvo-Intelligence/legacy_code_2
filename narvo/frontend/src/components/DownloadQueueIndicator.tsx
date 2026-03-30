import { useState } from 'react';
import { CloudArrowDown } from '@phosphor-icons/react/CloudArrowDown';
import { CheckCircle } from '@phosphor-icons/react/CheckCircle';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { WarningCircle } from '@phosphor-icons/react/WarningCircle';
import { CaretDown } from '@phosphor-icons/react/CaretDown';
import { CaretUp } from '@phosphor-icons/react/CaretUp';
import { useDownloadQueue } from '../contexts/DownloadQueueContext';
import { motion, AnimatePresence } from 'framer-motion';

const DownloadQueueIndicator = () => {
  const {
    queue,
    isProcessing,
    completedCount,
    totalCount,
    pendingCount,
    failedCount,
    overallProgress,
    clearCompleted,
    clearAll,
  } = useDownloadQueue();

  const [isExpanded, setIsExpanded] = useState(false);

  if (queue.length === 0 && !isProcessing) {
    return null;
  }

  const hasActivity = isProcessing || pendingCount > 0;
  const allComplete = completedCount === totalCount && totalCount > 0 && !hasActivity;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 md:bottom-24 right-4 z-50"
        data-testid="download-queue-indicator"
      >
        <div className="narvo-border bg-background-dark shadow-2xl">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center gap-3 p-3 hover:bg-surface/20 transition-colors"
          >
            <div
              className={`w-8 h-8 narvo-border flex items-center justify-center ${
                allComplete ? 'text-green-500' : failedCount > 0 ? 'text-red-400' : 'text-primary'
              }`}
            >
              {isProcessing ? (
                <CircleNotch className="w-5 h-5 animate-spin" />
              ) : allComplete ? (
                <CheckCircle weight="fill" className="w-5 h-5" />
              ) : failedCount > 0 ? (
                <WarningCircle weight="fill" className="w-5 h-5" />
              ) : (
                <CloudArrowDown className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 text-left">
              <div className="mono-ui text-[12px] font-bold text-content">
                {isProcessing
                  ? 'DOWNLOADING...'
                  : allComplete
                    ? 'DOWNLOADS_COMPLETE'
                    : failedCount > 0
                      ? `${failedCount} FAILED`
                      : 'DOWNLOAD_QUEUE'}
              </div>
              <div className="mono-ui text-[10px] text-forest">
                {completedCount}/{totalCount} {pendingCount > 0 && `• ${pendingCount} pending`}
              </div>
            </div>

            {hasActivity && (
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90">
                  <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface" />
                  <circle
                    cx="16"
                    cy="16"
                    r="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={75.4}
                    strokeDashoffset={75.4 - (75.4 * overallProgress) / 100}
                    className="text-primary transition-all duration-300"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center mono-ui text-[10px] text-primary font-bold">
                  {overallProgress}%
                </span>
              </div>
            )}

            {isExpanded ? <CaretDown className="w-4 h-4 text-forest" /> : <CaretUp className="w-4 h-4 text-forest" />}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="narvo-border-t max-h-64 overflow-y-auto">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 px-3 narvo-border-b border-forest/20 last:border-0"
                    >
                      <div
                        className={`w-5 h-5 flex items-center justify-center ${
                          item.status === 'complete'
                            ? 'text-green-500'
                            : item.status === 'failed'
                              ? 'text-red-400'
                              : item.status === 'downloading'
                                ? 'text-primary'
                                : 'text-forest'
                        }`}
                      >
                        {item.status === 'downloading' ? (
                          <CircleNotch className="w-4 h-4 animate-spin" />
                        ) : item.status === 'complete' ? (
                          <CheckCircle weight="fill" className="w-4 h-4" />
                        ) : item.status === 'failed' ? (
                          <WarningCircle weight="fill" className="w-4 h-4" />
                        ) : (
                          <CloudArrowDown className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="mono-ui text-[11px] text-content font-bold truncate">
                          {item.title?.slice(0, 30)}
                          {(item.title?.length ?? 0) > 30 ? '...' : ''}
                        </div>
                        {item.status === 'downloading' && (
                          <div className="w-full h-1 bg-surface/30 mt-1">
                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${item.progress}%` }} />
                          </div>
                        )}
                        {item.status === 'pending' && (
                          <span className="mono-ui text-[9px] text-forest">WAITING...</span>
                        )}
                      </div>

                      {item.status === 'downloading' && (
                        <span className="mono-ui text-[10px] text-primary font-bold">{item.progress}%</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-2 px-3 bg-surface/10">
                  <button
                    onClick={clearCompleted}
                    className="mono-ui text-[10px] text-forest hover:text-content transition-colors"
                  >
                    CLEAR_COMPLETED
                  </button>
                  <button
                    onClick={clearAll}
                    className="mono-ui text-[10px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    CLEAR_ALL
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DownloadQueueIndicator;
