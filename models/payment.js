import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import Order from "./order.js";
import Rekening from "./rekening.js";

const Payment = db.define(
  "payments",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    payment_type: {
      type: DataTypes.STRING(50), // cth: 'full', 'dp', 'repayment'
      defaultValue: "full",
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM("cash", "transfer", "ipaymu"),
      allowNull: false,
    },
    payment_provider: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "manual" },
    gateway_reference_id: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    gateway_transaction_id: { type: DataTypes.STRING(100), allowNull: true },
    gateway_session_id: { type: DataTypes.STRING(100), allowNull: true },
    gateway_url: { type: DataTypes.TEXT, allowNull: true },
    gateway_channel: { type: DataTypes.STRING(50), allowNull: true },
    gateway_payment_no: { type: DataTypes.STRING(100), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
    payment_proof: {
      type: DataTypes.STRING(255), // Path file gambar bukti pembayaran
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      defaultValue: "pending",
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Relasi: Payment belongsTo Order
Payment.belongsTo(Order, { foreignKey: "order_id", onDelete: "CASCADE" });
Order.hasMany(Payment, { foreignKey: "order_id", as: "payments", onDelete: "CASCADE" });

// Relasi: Payment belongsTo Rekening (optional jika transfer)
Payment.belongsTo(Rekening, { foreignKey: "rekening_id", as: "rekening", onDelete: "SET NULL" });
Rekening.hasMany(Payment, { foreignKey: "rekening_id", as: "payments" });

export default Payment;
