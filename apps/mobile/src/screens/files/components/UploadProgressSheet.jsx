import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Pressable, Alert } from "react-native";

// DB
import transfersRepository from "@db/repositories/transfersRepository";

// Components
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import Text from "@components/ui/text/Text";

// Hooks
import { useAppStateActive } from "@hooks/useAppStateActive";

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
  const handleResume = () =>
    backgroundTransfer.upload(row.id, row.dest, row.name, row.mimeType).catch((ex) => {
      // Was previously a silent no-op catch — a failed resume looked identical to a working one
      // with no visible progress yet, with no way to tell them apart. Logging the real error
      // (and the axios response body when present) is what made the uploadStatus 404 underneath
      // this bug visible in the first place.
      console.error(
        "[UploadProgressSheet] #handleResume :: resume failed -",
        row.id,
        ex?.response?.data ?? ex?.message ?? ex
      );
      Alert.alert("Resume failed", "Could not resume this upload. Try again, or stop and re-upload the file.");
    });
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

function StatusBar({ rows, onPress }) {
  const summary =
    rows.length === 1
      ? `Uploading ${rows[0].name} · ${Math.round(rows[0].progress ?? 0)}%`
      : `Uploading ${rows.length} files`;

  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-0 inset-x-0 bg-surface px-4 py-3 border-t border-neutral-subtle"
    >
      <Text size="sm" className="text-primary text-center">
        {summary} — tap to view
      </Text>
    </Pressable>
  );
}

export default function UploadProgressSheet() {
  const [rows, setRows] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const hadRows = useRef(false);

  // A fresh batch of uploads (rows going from none to some) always pops the sheet again,
  // overriding a dismissal left over from an earlier, already-finished batch.
  useEffect(() => {
    const hasRows = rows.length > 0;
    if (hasRows && !hadRows.current) {
      setDismissed(false);
    }
    hadRows.current = hasRows;
  }, [rows.length]);

  const refreshNow = useCallback(async () => {
    const all = await transfersRepository.getByStatus(["active", "pending", "paused"]);
    setRows(all.filter((r) => r.type === "upload"));
  }, []);

  useEffect(() => {
    refreshNow();

    // Native engine emits an event on every state change on both platforms, so refresh
    // reactively instead of polling. The interval fallback below is unreachable dead code,
    // kept only pending Phase 7's formal removal of the legacy path (see backgroundTransfer.js).
    if (nativeTransfer.isNativeAvailable) {
      return nativeTransfer.addTransferListener(refreshNow);
    }

    const interval = setInterval(refreshNow, 1000);
    return () => clearInterval(interval);
  }, [refreshNow]);

  // Native events fired while the app was backgrounded are missed (JS is suspended), so re-query
  // on foreground — otherwise the sheet shows the pre-background % until the next event lands.
  useAppStateActive(refreshNow);

  const hasRows = rows.length > 0;

  return (
    <>
      {dismissed && hasRows ? <StatusBar rows={rows} onPress={() => setDismissed(false)} /> : null}
      <GlassBottomSheet presentation="inline" visible={hasRows && !dismissed} onClose={() => setDismissed(true)}>
        <View className="p-4">
          <Text size="sm" bold className="text-secondary mb-2">
            Uploading
          </Text>
          {rows.map((row) => (
            <UploadRow key={row.id} row={row} />
          ))}
        </View>
      </GlassBottomSheet>
    </>
  );
}
