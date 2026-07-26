import React, { useState, useEffect } from "react";
import { View, SectionList, Pressable } from "react-native";
import { useSelector } from "react-redux";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react-native";

// Rtk
import { useGetFolderContentsQuery, useMoveFolderMutation } from "@api/folderApi";
import { useDeleteFileMutation, useMoveFileMutation, useCopyFileMutation } from "@api/fileApi";
import { useBulkMoveMutation, useBulkCopyMutation } from "@api/bulkApi";

// Lib
import haptics from "@lib/haptics";

// Constants
import { AppScreens } from "@constants/appScreens";

// Db
import itemsRepository from "@db/repositories/itemsRepository";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import OfflineBanner from "@components/offline/OfflineBanner";
import Text from "@components/ui/text/Text";
import FileListItem from "./FileListItem";
import FolderListItem from "./FolderListItem";
import FileActionSheet from "./FileActionSheet";
import FolderActionSheet from "./FolderActionSheet";
import FileToolbar from "./FileToolbar";
import { sortItems } from "./fileSort";
import FileGridCell from "./FileGridCell";
import FolderGridCell from "./FolderGridCell";
import BulkActionsBar from "./BulkActionsBar";
import UploadFab from "./UploadFab";
import UploadProgressSheet from "./UploadProgressSheet";
import CreateFolderDialog from "./CreateFolderDialog";
import FolderPickerSheet from "./FolderPickerSheet";

function chunkIntoRows(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function SectionHeader({ title }) {
  return (
    <Text size="xs" className="text-secondary uppercase tracking-widest px-4 pt-4 pb-1 font-semibold">
      {title}
    </Text>
  );
}

function Breadcrumb({ path = [], onNavigateTo = () => {} }) {
  const { colors } = useTheme();
  // Collapse >3 levels to "… › parent › current" (design shows 3 segments).
  const visible = path.length > 3 ? path.slice(-2) : path;
  const collapsed = path.length > 3;

  return (
    <View className="flex-row items-center gap-1 px-4 py-2 flex-wrap">
      <Pressable onPress={() => onNavigateTo(-1)}>
        <Text size="xs" bold className="text-secondary">
          My Files
        </Text>
      </Pressable>
      {collapsed ? (
        <>
          <ChevronRight size={12} color={colors.neutral.light} />
          <Text size="xs" className="text-secondary">
            …
          </Text>
        </>
      ) : null}
      {visible.map((segment, i) => {
        const realIndex = collapsed ? path.length - 2 + i : i;
        const isLast = realIndex === path.length - 1;
        return (
          <React.Fragment key={segment.id}>
            <ChevronRight size={12} color={colors.neutral.light} />
            <Pressable onPress={() => (isLast ? null : onNavigateTo(realIndex))} disabled={isLast}>
              <Text size="xs" bold={isLast} className={isLast ? undefined : "text-secondary"}>
                {segment.name}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}

/**
 * Shared folders/files browser used by MyFilesScreen (folderId null → root)
 * and FolderScreen (route folderId). Owns toolbar state, selection mode,
 * action sheets, the single move/copy destination picker, upload FAB, and
 * the offline fallback.
 *
 * @param {string|null} folderId
 * @param {{id: string, name: string}[]} path - breadcrumb segments (root screens pass [])
 * @param {object} navigation
 */
export default function FilesBrowserContent({ folderId = null, path = [], navigation = {} }) {
  const { colors } = useTheme();
  const isOnline = useSelector((s) => s.offline.isOnline);
  const { data, isLoading, isFetching, refetch } = useGetFolderContentsQuery({ id: folderId ?? "root" });

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [offlineItems, setOfflineItems] = useState([]);
  const [sortKey, setSortKey] = useState("date-desc");
  const [view, setView] = useState("list");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  // Selection mode is explicit (toolbar "Select" toggle or long-press),
  // independent of how many items are currently selected.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState({});
  // Swipe-action delete confirmation.
  const [fileToDelete, setFileToDelete] = useState(null);
  const [deleteFile] = useDeleteFileMutation();
  // Single move/copy destination picker, shared by file actions, folder
  // actions, and bulk actions — never more than one sheet open at a time.
  const [moveRequest, setMoveRequest] = useState(null); // { mode: 'move'|'copy', items: [{id,type}] } | null
  const [moveFile, { isLoading: isMovingFile }] = useMoveFileMutation();
  const [copyFile, { isLoading: isCopyingFile }] = useCopyFileMutation();
  const [moveFolder, { isLoading: isMovingFolder }] = useMoveFolderMutation();
  const [bulkMove, { isLoading: isBulkMoving }] = useBulkMoveMutation();
  const [bulkCopy, { isLoading: isBulkCopying }] = useBulkCopyMutation();

  const isMovingOrCopying = isMovingFile || isCopyingFile || isMovingFolder || isBulkMoving || isBulkCopying;

  useEffect(() => {
    if (!isOnline) {
      itemsRepository.queryItems(folderId ?? "root").then(setOfflineItems);
    }
  }, [isOnline, folderId]);

  const displayItems = isOnline ? (data?.items ?? []) : offlineItems;
  const folders = sortItems(
    displayItems.filter((i) => i.type === "folder"),
    sortKey
  );
  const files = sortItems(
    displayItems.filter((i) => i.type !== "folder"),
    sortKey
  );

  function toggleSelect(item) {
    haptics.selection();
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = { id: item.id, type: item.type === "folder" ? "folder" : "file" };
      }
      // Deselecting the last item exits selection mode automatically;
      // selecting anything (including the first item) enters/stays in it.
      setSelectionMode(Object.keys(next).length > 0);
      return next;
    });
  }

  function handleToggleSelectionMode() {
    setSelectionMode((prev) => {
      if (prev) setSelected({});
      return !prev;
    });
  }

  function handleFilePress(item) {
    if (selectionMode) {
      toggleSelect(item);
    } else {
      navigation.navigate(AppScreens.FILE_DETAIL, {
        files,
        index: files.findIndex((f) => f.id === item.id),
      });
    }
  }

  function handleFolderPress(item) {
    if (selectionMode) {
      toggleSelect(item);
      return;
    }
    const nextPath = [...path, { id: item.id, name: item.name }];
    navigation.push(AppScreens.FOLDER, { folderId: item.id, folderName: item.name, path: nextPath });
  }

  function handleBreadcrumbNavigate(index) {
    // index -1 = root; otherwise pop back to that depth.
    const popCount = path.length - 1 - index;
    if (popCount > 0) {
      navigation.pop(popCount);
    }
  }

  function openMovePicker(items, mode) {
    setSelectedFile(null);
    setSelectedFolder(null);
    setMoveRequest({ mode, items });
  }

  async function handleMoveConfirm(destinationId) {
    if (!moveRequest) return;
    const { mode, items } = moveRequest;
    try {
      if (items.length === 1 && items[0].type === "folder") {
        if (mode === "move") {
          await moveFolder({ id: items[0].id, parentId: destinationId }).unwrap();
        } else {
          await bulkCopy({ items, targetFolderId: destinationId }).unwrap();
        }
      } else if (items.length === 1) {
        const mutate = mode === "move" ? moveFile : copyFile;
        await mutate({ id: items[0].id, folderId: destinationId }).unwrap();
      } else {
        const mutate = mode === "move" ? bulkMove : bulkCopy;
        await mutate({ items, targetFolderId: destinationId }).unwrap();
      }
    } finally {
      setMoveRequest(null);
      setSelected({});
      setSelectionMode(false);
    }
  }

  function renderSelectableRow(item, RowComponent, onPress, extraProps = {}) {
    const isSelected = Boolean(selected[item.id]);
    return (
      <View className="flex-row items-center px-4">
        {selectionMode ? (
          <Pressable onPress={() => toggleSelect(item)} className="pl-2 mr-2">
            {isSelected ? (
              <CheckCircle2 size={20} color={colors.primary.DEFAULT} />
            ) : (
              <Circle size={20} color={colors.neutral.light} />
            )}
          </Pressable>
        ) : null}
        <View className="flex-1">
          <RowComponent
            item={item}
            onPress={onPress}
            onLongPress={() => toggleSelect(item)}
            onOpenMenu={
              selectionMode ? null : () => (item.type === "folder" ? setSelectedFolder(item) : setSelectedFile(item))
            }
            {...extraProps}
          />
        </View>
      </View>
    );
  }

  async function handleConfirmSwipeDelete() {
    const target = fileToDelete;
    setFileToDelete(null);
    if (target) {
      await deleteFile({ id: target.id });
    }
  }

  const folderData = view === "grid" ? chunkIntoRows(folders, 3) : folders;
  const fileData = view === "grid" ? chunkIntoRows(files, 3) : files;
  const sections = [
    ...(folders.length > 0 ? [{ key: "folders", title: "Folders", data: folderData }] : []),
    ...(files.length > 0 ? [{ key: "files", title: "Files", data: fileData }] : []),
  ];

  const selectedItems = Object.values(selected);
  const excludedFolderIds = moveRequest?.items.filter((i) => i.type === "folder").map((i) => i.id) ?? [];

  return (
    <View className="flex-1">
      <OfflineBanner />
      {path.length > 0 ? <Breadcrumb path={path} onNavigateTo={handleBreadcrumbNavigate} /> : null}
      <FileToolbar
        sortKey={sortKey}
        onSortChange={setSortKey}
        view={view}
        onViewChange={setView}
        selectionMode={selectionMode}
        onToggleSelectionMode={handleToggleSelectionMode}
      />

      <Skeleton loading={isOnline && isLoading}>
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => (Array.isArray(item) ? (item[0]?.id ?? `row-${index}`) : item.id)}
          renderItem={({ item, section }) => {
            if (section.key === "folders") {
              if (view === "grid") {
                return (
                  <View className="flex-row px-2">
                    {item.map((folder) => (
                      <FolderGridCell
                        key={folder.id}
                        folder={folder}
                        selected={Boolean(selected[folder.id])}
                        selectionMode={selectionMode}
                        onPress={() => handleFolderPress(folder)}
                        onLongPress={() => toggleSelect(folder)}
                        onOpenMenu={selectionMode ? null : () => setSelectedFolder(folder)}
                      />
                    ))}
                  </View>
                );
              }
              return renderSelectableRow(item, FolderListItem, () => handleFolderPress(item));
            }
            if (view === "grid") {
              return (
                <View className="flex-row px-2">
                  {item.map((file) => (
                    <FileGridCell
                      key={file.id}
                      file={file}
                      selected={Boolean(selected[file.id])}
                      selectionMode={selectionMode}
                      onPress={() => handleFilePress(file)}
                      onLongPress={() => toggleSelect(file)}
                      onOpenMenu={selectionMode ? null : () => setSelectedFile(file)}
                    />
                  ))}
                </View>
              );
            }
            return renderSelectableRow(item, FileListItem, () => handleFilePress(item), {
              onRequestDelete: setFileToDelete,
              swipeDisabled: selectionMode,
            });
          }}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshing={isOnline && isFetching && !isLoading}
          onRefresh={isOnline ? refetch : undefined}
          stickySectionHeadersEnabled={false}
          contentContainerClassName="pb-24"
          ListEmptyComponent={
            !isLoading ? <EmptyState message={folderId ? "This folder is empty" : "No files yet"} /> : null
          }
        />
      </Skeleton>

      {selectionMode && selectedItems.length > 0 ? (
        <BulkActionsBar
          selectedItems={selectedItems}
          onRequestMove={(items) => openMovePicker(items, "move")}
          onRequestCopy={(items) => openMovePicker(items, "copy")}
          onDone={() => {
            setSelected({});
            setSelectionMode(false);
          }}
          onCancel={() => {
            setSelected({});
            setSelectionMode(false);
          }}
        />
      ) : !selectionMode ? (
        <UploadFab folderId={folderId} onCreateFolder={() => setShowCreateFolder(true)} />
      ) : null}
      <UploadProgressSheet />

      <CreateFolderDialog visible={showCreateFolder} parentId={folderId} onClose={() => setShowCreateFolder(false)} />

      <GlassBottomSheet visible={!!selectedFile} onClose={() => setSelectedFile(null)}>
        <FileActionSheet
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onRequestMove={(file) => openMovePicker([{ id: file.id, type: "file" }], "move")}
          onRequestCopy={(file) => openMovePicker([{ id: file.id, type: "file" }], "copy")}
        />
      </GlassBottomSheet>

      <GlassBottomSheet visible={!!selectedFolder} onClose={() => setSelectedFolder(null)}>
        <FolderActionSheet
          folder={selectedFolder}
          onClose={() => setSelectedFolder(null)}
          onRequestMove={(folder) => openMovePicker([{ id: folder.id, type: "folder" }], "move")}
        />
      </GlassBottomSheet>

      <GlassBottomSheet visible={!!moveRequest} onClose={() => setMoveRequest(null)}>
        {moveRequest ? (
          <FolderPickerSheet
            confirmLabel={moveRequest.mode === "move" ? "Move here" : "Copy here"}
            excludedIds={excludedFolderIds}
            onConfirm={handleMoveConfirm}
            onClose={() => setMoveRequest(null)}
            isLoading={isMovingOrCopying}
          />
        ) : null}
      </GlassBottomSheet>

      <Dialog
        isOpen={!!fileToDelete}
        onClose={() => setFileToDelete(null)}
        size="md"
        title="Delete file"
        contentClassName="bg-surface rounded-2xl p-2"
        footerClassName="gap-3 mt-2"
        onCancel={() => setFileToDelete(null)}
        onConfirm={handleConfirmSwipeDelete}
        confirmLabel="Delete"
        confirmVariant="destructive"
      >
        <Text size="sm" className="text-secondary">
          {`Delete "${fileToDelete?.name ?? ""}"? This moves it to trash.`}
        </Text>
      </Dialog>
    </View>
  );
}
