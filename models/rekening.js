import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const Rekening = db.define(
  "rekenings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bank_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    account_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    account_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "rekenings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Rekening;