import {
  createRecordService,
  getRecordService,
  updateRecordService,
  softDeleteRecordService,
  getRecordByIdService,
} from "../services/record.service.js";

export const createRecordController = async (req, res) => {
  try {
    const { amount, type, notes, category } = req.body;

    const record = await createRecordService({
      amount,
      type,
      notes,
      category,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getRecordController = async (req, res) => {
  try {
    const { type, category, date, page, limit } = req.query;

    const records = await getRecordService({
      type,
      category,
      date,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      ...records,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const updateRecordController = async (req, res) => {
  try {
    const { recordId } = req.params;

    const { type, date, notes, category } = req.body;

    const updatedData = {};

    if (type) updatedData.type = type;
    if (category) updatedData.category = category;
    if (notes) updatedData.notes = notes;
    if (date) updatedData.date = date;

    const record = await updateRecordService({
      id,
      updatedData,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const softDeleteRecordController = async (req, res) => {
  try {
    const recordId = req.params.id;

    const record = await softDeleteRecordService({
      recordId,
      userId: req.user._id,
    });

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};

export const getRecordByIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const record = await getRecordByIdService(id, userId);

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
    });
  }
};
