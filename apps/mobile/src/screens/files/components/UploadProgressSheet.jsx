import React, { useState, useEffect } from "react";
import { View, Pressable } from "react-native";

// DB
import transfersRepository from "@db/repositories/transfersRepository";

// Components
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import Text from "@components/ui/text/Text";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";
import nativeTransfer from "@lib/nativeTransfer";

function ProgressBar({ value = 0 }) {
  return (
    <View className="h-1.5 bg-neutral-subtle rounded-full overflow-hidden mt-1">
      <View className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
    </View>
  );
}

function RowAction({ label, onPress }) {
  return (
    <Pressable onPress={onPress} className="px-2 py-1">
      <Text size="xs" className="text-primary">
        {label}
      </Text>
    </Pressable>
  );
}

function UploadRow({ row }) {
  const pct = row.progress ?? 0;

  const handlePause = () => nativeTransfer.pause(row.id);
  const handleResume = () => backgroundTransfer.upload(row.id, row.dest, row.name, row.mimeType).catch(() => {});
  const handleStop = () => nativeTransfer.cancel(row.id);

  return (
    <View className="py-2 gap-1">
      <View className="flex-row justify-between">
        <Text size="sm" numberOfLines={1} className="flex-1 mr-2">
          {row.name}
        </Text>
        <Text size="xs" className="text-secondary">
          {pct}%
        </Text>
      </View>
      <ProgressBar value={pct} />
      {nativeTransfer.isNativeAvailable && (
        <View className="flex-row justify-end">
          {row.status === "active" && <RowAction label="Pause" onPress={handlePause} />}
          {row.status === "paused" && <RowAction label="Resume" onPress={handleResume} />}
          <RowAction label="Stop" onPress={handleStop} />
        </View>
      )}
    </View>
  );
}

export default function UploadProgressSheet() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      const all = await transfersRepository.getByStatus(["active", "pending", "paused"]);
      if (mounted) setRows(all.filter((r) => r.type === "upload"));
    }

    refresh();

    // Native engine emits an event on every state change on both platforms, so refresh
    // reactively instead of polling. The interval fallback below is unreachable dead code,
    // kept only pending Phase 7's formal removal of the legacy path (see backgroundTransfer.js).
    if (nativeTransfer.isNativeAvailable) {
      const unsubscribe = nativeTransfer.addTransferListener(refresh);
      return () => {
        mounted = false;
        unsubscribe();
      };
    }

    const interval = setInterval(refresh, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (rows.length === 0) return null;

  return (
    <GlassBottomSheet visible>
      <View className="p-4">
        <Text size="sm" bold className="text-secondary mb-2">
          Uploading
        </Text>
        {rows.map((row) => (
          <UploadRow key={row.id} row={row} />
        ))}
      </View>
    </GlassBottomSheet>
  );
}
