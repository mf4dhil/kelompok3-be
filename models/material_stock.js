import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import Material from "./material.js";

const MaterialStock = db.define(
  "material_stocks",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    material_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // menjamin relasi 1:1 dengan materials
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "material_stocks",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Relasi: Material hasOne MaterialStock, MaterialStock belongsTo Material
Material.hasOne(MaterialStock, { foreignKey: "material_id", as: "stock", onDelete: "CASCADE" });
MaterialStock.belongsTo(Material, { foreignKey: "material_id", as: "material" });

export default MaterialStock;