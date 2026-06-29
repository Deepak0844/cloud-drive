import React, { useState, useEffect } from "react";
import { View } from "react-native";

// DB
import transfersRepository from "@db/repositories/transfersRepository";

// Components
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import Text from "@components/ui/text/Text";

function ProgressBar({ value = 0 }) {
  return (
    <View className="h-1.5 bg-neutral-subtle rounded-full overflow-hidden mt-1">
      <View className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
    </View>
  );
}

function UploadRow({ row }) {
  const pct = row.progress ?? 0;
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
    </View>
  );
}

export default function UploadProgressSheet() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      const all = await transfersRepository.getByStatus(["active", "pending", "paused"]);
      if (mounted) setRows(all.filter((r) => r.type === "upload"));
    }

    poll();
    const interval = setInterval(poll, 1000);
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
