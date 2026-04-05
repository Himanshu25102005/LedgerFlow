
export function buildDateRangeFilter(range, startDate, endDate) {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      return { $gte: start, $lte: end };
    }
  }

  const r = String(range || "").toLowerCase();
  if (!r || r === "all" || r === "alltime") return null;

  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (r) {
    case "last7days":
      start.setDate(start.getDate() - 7);
      break;
    case "last30days":
      start.setDate(start.getDate() - 30);
      break;
    case "last6months":
      start.setMonth(start.getMonth() - 6);
      break;
    default:
      return null;
  }

  return { $gte: start, $lte: end };
}

export function normalizeCategory(category) {
  if (category == null) return null;
  const s = String(category).trim();
  if (!s) return null;
  if (s.toLowerCase() === "all") return null;
  return s;
}

export function parseRecordFiltersFromQuery(query) {
  const category = normalizeCategory(query.category);
  const dateFilter = buildDateRangeFilter(query.range, query.startDate, query.endDate);
  return { category, dateFilter };
}

export function buildRecordMatch({ userId, isAdmin, category, dateFilter }) {
  const m = { isDeleted: false };
  if (!isAdmin && userId) m.user = userId;
  if (category) m.category = category;
  if (dateFilter) m.date = dateFilter;
  return m;
}
