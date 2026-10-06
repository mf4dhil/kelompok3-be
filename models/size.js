import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const Size = db.define(
  "size",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

     value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    tableName: "size",
    timestamps: false
  }
);

export default Size;