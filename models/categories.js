import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const Categories = db.define(
  "categories",
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
    tableName: "categories",
    timestamps: false
  }
);

export default Categories;