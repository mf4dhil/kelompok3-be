import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const ProductVariant = db.define(
  "productvariants",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    shape_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    size_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    flavor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    tableName: "product_variants",
    timestamps: false
  }
);

export default ProductVariant;