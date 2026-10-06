import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const Shape = db.define(
  "shapes",
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

    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    description: {
      type: DataTypes.TEXT
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    tableName: "shapes",
    timestamps: false
  }
);

export default Shape;