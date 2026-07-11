import { ArrowDownAZ, ArrowUpAZ, CalendarArrowDown, CalendarArrowUp } from "lucide-react-native";

export const SORT_MODES = [
  { key: "date-desc", label: "Newest", Icon: CalendarArrowDown },
  { key: "date-asc", label: "Oldest", Icon: CalendarArrowUp },
  { key: "name-asc", label: "A–Z", Icon: ArrowDownAZ },
  { key: "name-desc", label: "Z–A", Icon: ArrowUpAZ },
];

export function sortItems(items, sortKey) {
  const sorted = [...items];
  switch (sortKey) {
    case "date-asc":
      return sorted.sort((a, b) => new Date(a.updatedAt ?? 0) - new Date(b.updatedAt ?? 0));
    case "name-asc":
      return sorted.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    case "name-desc":
      return sorted.sort((a, b) => (b.name ?? "").localeCompare(a.name ?? ""));
    case "date-desc":
    default:
      return sorted.sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0));
  }
}
