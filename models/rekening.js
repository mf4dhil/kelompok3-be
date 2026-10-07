import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const Rekening = db.define(
  "rekening",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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

    is_Active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "rekenings",
    timestamps: true,
  }
);

export default Rekening;