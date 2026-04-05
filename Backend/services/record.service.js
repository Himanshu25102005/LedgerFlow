import recordSchema from "../models/record.js";
import User from "../models/user.js";
import {
  buildDateRangeFilter,
  normalizeCategory,
  buildRecordMatch,
} from "../utils/recordFilters.js";

export const createRecordService = async ({
  amount,
  type,
  notes,
  category,
  date,
  userId,
}) => {
  if (amount == null || amount === "" || !type || !category || !userId) {
    throw new Error("Missing fields");
  }

  const doc = {
    amount: Number(amount),
    type,
    notes: notes != null && String(notes).trim() !== "" ? String(notes) : "",
    category: String(category).trim(),
    user: userId,
  };

  if (date) {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) doc.date = d;
  }

  const record = await recordSchema.create(doc);

  const currentUser = await User.findById(userId);
  currentUser.transactions.push(record._id);
  await currentUser.save();

  return record;
};

export const getRecordService = async ({
  type,
  page,
  limit,
  category: categoryRaw,
  date,
  range,
  startDate,
  endDate,
  userId,
  isAdmin,
}) => {
  const category = normalizeCategory(categoryRaw);
  let dateFilter = buildDateRangeFilter(range, startDate, endDate);
  if (!dateFilter && date && !range && !startDate && !endDate) {
    const d = new Date(date);
    if (!Number.isNaN(d.getTime())) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      dateFilter = { $gte: dayStart, $lte: dayEnd };
    }
  }

  const filter = buildRecordMatch({
    userId,
    isAdmin: Boolean(isAdmin),
    category,
    dateFilter,
  });
  if (type) filter.type = type;

  const skip = (page - 1) * limit;

  let listQuery = recordSchema
    .find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

  if (isAdmin) {
    listQuery = listQuery.populate("user", "name email");
  }

  const [records, totalRecords] = await Promise.all([
    listQuery.lean(),
    recordSchema.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalRecords / limit);

  return {
    data: records,
    totalPages,
    totalRecords,
    currentPage: page,
    count: records.length,
  };
};

export const updateRecordService = async ({ id, updatedData, userId, isAdmin }) => {
  if (!id) {
    throw new Error("Record ID is required");
  }

  if (!updatedData || Object.keys(updatedData).length === 0) {
    throw new Error("Noo fields provided to update");
  }

  const allowedFields = ["type", "category", "notes", "date", "amount"];
  const sanitizedData = {};

  for (let key of allowedFields) {
    if (key in updatedData) {
      sanitizedData[key] = updatedData[key];
    }
  }

  if (Object.keys(sanitizedData).length === 0) {
    throw new Error("No valid fields to update");
  }

  const query = { _id: id, isDeleted: false };
  if (!isAdmin) {
    query.user = userId;
  }

  const updatedRecord = await recordSchema.findOneAndUpdate(
    query,
    { $set: sanitizedData },
    { new: true },
  );

  if (!updatedRecord) {
    throw new Error("Record not found or unauthorized");
  }

  return updatedRecord;
};

export const softDeleteRecordService = async ({ recordId, userId, isAdmin }) => {
  if (!recordId) {
    throw new Error("Record ID is required");
  }

  const query = {
    _id: recordId,
    isDeleted: false,
  };
  if (!isAdmin) {
    query.user = userId;
  }

  const deletedRecord = await recordSchema.findOneAndUpdate(
    query,
    {
      $set: { isDeleted: true },
    },
    {
      new: true,
    },
  );

  if (!deletedRecord) {
    throw new Error("Record not found or already deleted");
  }

  return deletedRecord;
};

export const getRecordByIdService = async (recordId, userId, isAdmin) => {
  if (!recordId) {
    throw new Error("Record ID is required");
  }

  const query = { _id: recordId, isDeleted: false };
  if (!isAdmin) {
    query.user = userId;
  }

  const base = recordSchema.findOne(query);
  const record = isAdmin
    ? await base.populate("user", "name email")
    : await base;

  if (!record) {
    throw new Error(
      "No such record Exists or you dont have proper authoriaztion",
    );
  }
  return record;
};
