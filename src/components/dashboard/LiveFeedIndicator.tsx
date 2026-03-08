import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pause, Play, Radio } from "lucide-react";

interface Props {
  isConnected: boolean;
  sessionCount: number;
  isPaused: boolean;
  onTogglePause: () => void;
}

export function LiveFeedIndicator({ isConnected, sessionCount, isPaused, onTogglePause }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`flex items-center gap-1.5 px-2.5 py-1 ${
          isConnected
            ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
            : "border-destructive/50 text-destructive"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isConnected
              ? "bg-emerald-500 animate-pulse"
              : "bg-destructive"
          }`}
        />
        {isConnected ? "Live" : "Disconnected"}
      </Badge>
      {sessionCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Radio className="h-3 w-3 mr-1" />
          +{sessionCount} this session
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onTogglePause}
        className="h-7 w-7 p-0"
        title={isPaused ? "Resume live feed" : "Pause live feed"}
      >
        {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
