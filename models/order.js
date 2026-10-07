import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import Customer from "./customer.js";
import Rekening from "./rekening.js";

const Order = db.define(
  "orders",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_number: {
      type: DataTypes.STRING(30),
      unique: true,
      allowNull: false,
    },
    order_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    pickup_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "processing", "ready", "completed", "cancelled"),
      defaultValue: "pending",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM("unpaid", "partial", "paid"),
      defaultValue: "unpaid",
    },
    // -- Moved payment related fields to payments table --
    // payment_method: {
    //   type: DataTypes.ENUM("cash", "transfer"),
    //   allowNull: true,
    // },
    // payment_proof: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    // },
    // rekening_id masih dipertahankan di Order untuk referensi utama (optional)
    rekening_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "orders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Relation: Order belongsTo Customer
Order.belongsTo(Customer, { foreignKey: "customer_id" });
// Relation: Customer hasMany Order
Customer.hasMany(Order, { foreignKey: "customer_id" });

// Relation: Order belongsTo Rekening (optional)
Order.belongsTo(Rekening, { foreignKey: "rekening_id", as: "rekening" });
// Relation: Rekening hasMany Order
Rekening.hasMany(Order, { foreignKey: "rekening_id", as: "orders" });

export default Order;