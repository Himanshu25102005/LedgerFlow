import {
  getSummaryService,
  getSummaryByCategoryService,
  getTrendsService,
  getAdminService,
  getAdminByCategoryService,
  getAdminTrendsService,
  getUserSummaryService,
} from "../services/dashboard.service.js";
import { parseRecordFiltersFromQuery } from "../utils/recordFilters.js";

const useGlobalAggregates = (role) => role === "admin" || role === "analyst";

export const getSummaryController = async (req, res) => {
  try {
    const global = useGlobalAggregates(req.user.role);
    const filters = parseRecordFiltersFromQuery(req.query);
    const summary = global
      ? await getAdminService(filters)
      : await getSummaryService(req.user._id, filters, false);

    const payload = global
      ? {
          income: summary.income,
          expense: summary.expense,
          balance: summary.balance,
        }
      : summary;

    return res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getSummaryByCategoryController = async (req, res) => {
  try {
    const { income } = req.query;
    const global = useGlobalAggregates(req.user.role);
    const filters = parseRecordFiltersFromQuery(req.query);
    const summary = global
      ? await getAdminByCategoryService(filters)
      : await getSummaryByCategoryService(req.user._id, income, filters, false);

    const data = global
      ? (Array.isArray(summary) ? summary : []).map((row) => ({
          categoryName: row.categoryName ?? row.category,
          total: row.total,
          percentage: row.percentage,
        }))
      : summary;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getTrendsController = async (req, res) => {
  try {
    const global = useGlobalAggregates(req.user.role);
    const filters = parseRecordFiltersFromQuery(req.query);

    const summary = await getTrendsService(
      global ? null : req.user._id,
      filters,
      global,
    );

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

/* Admin Ones */
export const getAdminController = async (req, res) => {
  try {
    const filters = parseRecordFiltersFromQuery(req.query);
    const data = await getAdminService(filters);

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getAdminByCategoryController = async (req, res) => {
  try {
    const filters = parseRecordFiltersFromQuery(req.query);
    const raw = await getAdminByCategoryService(filters);
    const data = (Array.isArray(raw) ? raw : []).map((row) => ({
      categoryName: row.categoryName ?? row.category,
      total: row.total,
      percentage: row.percentage,
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getAdminTrendsController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const filters = parseRecordFiltersFromQuery(req.query);

    const data = await getAdminTrendsService({
      page,
      limit,
      category: filters.category,
      dateFilter: filters.dateFilter,
    });

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getUserSummaryController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const result = await getUserSummaryService({ page, limit });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};
