import {
  getSummaryService,
  getSummaryByCategoryService,
  getTrendsService,
  getAdminService,
  getAdminByCategoryService,
  getAdminTrendsService,
  getUserSummaryService,
} from "../services/dashboard.service.js";

export const getSummaryController = async (req, res) => {
  try {
    const userId = req.user._id;
    const summary = await getSummaryService(userId);

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

export const getSummaryByCategoryController = async (req, res) => {
  try {
    const { income } = req.query;
    const userId = req.user._id;
    const summary = await getSummaryByCategoryService(userId, income);

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

export const getTrendsController = async (req, res) => {
  try {
    const userId = req.user._id;

    const summary = await getTrendsService(userId);

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
    const data = await getAdminService();

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
    const data = await getAdminByCategoryService();

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

export const getAdminTrendsController = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const data = await getAdminTrendsService({ page, limit });

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
