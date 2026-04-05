import recordSchema from "../models/record.js";

export const createRecordService = async ({
  amount,
  type,
  notes,
  category,
  userId,
}) => {
  if (!amount || !type || !notes || !category || !userId) {
    throw new Error("Missing fields");
  }

  const record = await recordSchema.create({
    amount: amount,
    type: type,
    notes: notes,
    category: category,
    user: userId,
  });

  return record;
};

export const getRecordService = async ({
  type,
  page,
  limit,
  category,
  date,
  userId,
}) => {
  const filter = {};

  if (type) filter.type = type;
  if (category) filter.category = category;
  if (date) filter.date = date;
  if (userId) filter.user = userId;

  const skip = (page - 1) * limit;

  const [records, totalRecords] = await Promise.all([
    recordSchema.find({ filter, isDeleted: false }).skip(skip).limit(limit),
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

export const updateRecordService = async ({ id, updatedData, userId }) => {
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

  const updatedRecord = await recordSchema.findOneAndUpdate(
    { _id: id, userId },
    { $set: sanitizedData },
    { new: true },
  );

  if (!updatedRecord) {
    throw new Error("Record not found or unauthorized");
  }

  return updatedRecord;
};

export const softDeleteRecordService = async ({ recordId, userId }) => {
  if (!recordId) {
    throw new Error("Record ID is required");
  }

  const deletedRecord = await recordSchema.findOneAndUpdate(
    {
      _id: recordId,
      user: userId,
      isDeleted: false,
    },
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

export const getRecordByIdService = async (recordId, userId) => {
  if (!recordId) {
    throw new Error("Record ID is required");
  }

  const record = await recordSchema.findOne({
    _id: recordId,
    user: userId,
    isDeleted: false,
  });

  if (!record) {
    throw new Error(
      "No such record Exists or you dont have proper authoriaztion",
    );
  }
  return record;
};
