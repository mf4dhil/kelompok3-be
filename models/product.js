import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const Product = db.define(
  "products",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
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

    image: {
      type: DataTypes.STRING
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    tableName: "products",
    timestamps: false
  }
);

export default Product;