import User from "../models/user";
import recordSchema from "../models/record";

export const getSummaryService = async (userId) => {
  const summary = await recordSchema.aggregate([
    {
      $match: {
        user: userId,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, $amount, 0],
          },
        },
        totalExpense: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, $amount, 0] },
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

export const getSummaryByCategoryService = async (userId, income) => {
  if (income) {
    const incomeSummary = await recordSchema.aggregate([
      {
        $match: {
          user: userId,
          type: "income",
          isDeleted: false,
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
        user: userId,
        type: "expense",
        isDeleted: false,
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

export const getTrendsService = async (userId) => {
  const summary = await recordSchema.aggregate([
    {
      $match: {
        userId: userId,
        isDeleted: false,
      },
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

export const getAdminService = async () => {
  const data = recordSchema.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, $amount, 0],
          },
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, $amount, 0],
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

export const getAdminByCategoryService = async () => {
  const data = await recordSchema.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$category",
        total: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
          },
        },
      },
    },
    {
      $project: {
        category: "$_id",
      },
    },
    {
      $addFields: {
        percentage: {
          $multiply: [{ $divide: ["$total", totalExpense] }, 100],
        },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);

  return data;
};

export const getAdminTrendsService = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const result = await recordSchema.aggregate([
    {
      $match: {
        isDeleted: false,
        date: { $exists: true },
      },
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

export const getUsersSummaryService = async ({ page, limit }) => {
  const skip = (page - 1) * limit;

  const result = await recordSchema.aggregate([
    {
      $match: {
        isDeleted: false,
      },
    },

    {
      $group: {
        _id: "$userId",
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
        userId: "$_id",
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
