import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import ExpenseCategory from "./expense_category.js";

const Expense = db.define(
  "expenses",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    expense_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    expense_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM("TRANSFER", "CASH"),
      allowNull: false,
    },
    receipt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "expenses",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Relasi: ExpenseCategory hasMany Expense, Expense belongsTo ExpenseCategory
ExpenseCategory.hasMany(Expense, { foreignKey: "category_id", as: "expenses" });
Expense.belongsTo(ExpenseCategory, { foreignKey: "category_id", as: "category" });

export default Expense;