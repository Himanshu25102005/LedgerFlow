import User from "../models/user.js";
import recordSchema from "../models/record.js";
import { buildRecordMatch } from "../utils/recordFilters.js";

export const getSummaryService = async (userId, { category, dateFilter }, isAdmin) => {
  const match = buildRecordMatch({ userId, isAdmin, category, dateFilter });

  const summary = await recordSchema.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
      },
    },
  ]);

  const result = summary[0] || {
    totalIncome: 0,
    totalExpense: 0,
  };

  return {
    income: result.totalIncome,
    expense: result.totalExpense,
    balance: result.totalIncome - result.totalExpense,
  };
};

export const getSummaryByCategoryService = async (
  userId,
  income,
  { category, dateFilter },
  isAdmin,
) => {
  const baseMatch = buildRecordMatch({ userId, isAdmin, category, dateFilter });

  if (income) {
    const incomeSummary = await recordSchema.aggregate([
      {
        $match: {
          ...baseMatch,
          type: "income",
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          categoryName: "$_id",
          total: 1,
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    return incomeSummary;
  }

  const summary = await recordSchema.aggregate([
    {
      $match: {
        ...baseMatch,
        type: "expense",
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        categoryName: "$_id",
        total: 1,
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);

  return summary;
};

export const getTrendsService = async (userId, { category, dateFilter }, isAdmin) => {
  const match = buildRecordMatch({ userId, isAdmin, category, dateFilter });
  if (!dateFilter) {
    match.date = { $exists: true, $ne: null };
  }

  const summary = await recordSchema.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: {
          month: { $month: "$date" },
          year: { $year: "$date" },
        },
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        month: "$_id.month",
        year: "$_id.year",
        income: "$totalIncome",
        expense: "$totalExpense",
        balance: {
          $subtract: ["$totalIncome", "$totalExpense"],
        },
      },
    },
    {
      $sort: { year: 1, month: 1 },
    },
  ]);

  return summary;
};

/* Admin aggregate endpoints (optional filters on tsransactions) */

export const getAdminService = async ({ category, dateFilter }) => {
  const match = buildRecordMatch({
    userId: null,
    isAdmin: true,
    category,
    dateFilter,
  });

  const data = await recordSchema.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
      },
    },
  ]);

  const totalUsers = await User.countDocuments({
    status: "active",
  });

  const result = data[0] || {
    totalIncome: 0,
    totalExpense: 0,
  };

  return {
    totalUser: totalUsers,
    income: result.totalIncome,
    expense: result.totalExpense,
    balance: result.totalIncome - result.totalExpense,
  };
};

export const getAdminByCategoryService = async ({ category, dateFilter }) => {
  const baseMatch = buildRecordMatch({
    userId: null,
    isAdmin: true,
    category,
    dateFilter,
  });

  const result = await recordSchema.aggregate([
    {
      $match: {
        ...baseMatch,
        type: "expense",
      },
    },

    {
      $facet: {
        categories: [
          {
            $group: {
              _id: "$category",
              total: { $sum: "$amount" },
            },
          },
        ],

        overall: [
          {
            $group: {
              _id: null,
              totalExpense: { $sum: "$amount" },
            },
          },
        ],
      },
    },

    {
      $unwind: {
        path: "$overall",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $unwind: "$categories",
    },

    {
      $project: {
        _id: 0,
        categoryName: "$categories._id",
        total: "$categories.total",
        percentage: {
          $cond: [
            { $gt: ["$overall.totalExpense", 0] },
            {
              $multiply: [
                { $divide: ["$categories.total", "$overall.totalExpense"] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },

    {
      $sort: { total: -1 },
    },
  ]);

  return result;
};

export const getAdminTrendsService = async ({ page, limit, category, dateFilter }) => {
  const skip = (page - 1) * limit;

  const match = buildRecordMatch({
    userId: null,
    isAdmin: true,
    category,
    dateFilter,
  });
  if (!dateFilter) {
    match.date = { $exists: true, $ne: null };
  }

  const result = await recordSchema.aggregate([
    {
      $match: match,
    },

    {
      $group: {
        _id: {
          month: { $month: "$date" },
          year: { $year: "$date" },
        },
        income: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        month: "$_id.month",
        year: "$_id.year",
        income: 1,
        expense: 1,
        balance: {
          $subtract: ["$income", "$expense"],
        },
      },
    },

    {
      $sort: { year: -1, month: -1 },
    },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const data = result[0].data;
  const totalRecords = result[0].totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    data,
    totalRecords,
    totalPages,
    currentPage: page,
  };
};

export const getUserSummaryService = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const result = await recordSchema.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },

    {
      $group: {
        _id: "$user",
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: "$user",
    },

    {
      $project: {
        _id: 0,
        user: "$_id",
        name: "$user.name",
        email: "$user.email",
        totalIncome: 1,
        totalExpense: 1,
        balance: {
          $subtract: ["$totalIncome", "$totalExpense"],
        },
      },
    },

    {
      $sort: { totalExpense: -1 },
    },

    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: "count" }],
      },
    },
  ]);

  const data = result[0].data;
  const totalRecords = result[0].totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    data,
    totalRecords,
    totalPages,
    currentPage: page,
  };
};
