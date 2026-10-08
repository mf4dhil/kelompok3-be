import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import Material from "./material.js";

const MaterialTransaction = db.define(
  "material_transactions",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    material_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("PURCHASE", "USAGE", "ADJUSTMENT", "RETURN"),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    reference_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    reference_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "material_transactions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

// Relasi: Material hasMany MaterialTransaction, MaterialTransaction belongsTo Material
Material.hasMany(MaterialTransaction, { foreignKey: "material_id", as: "transactions", onDelete: "CASCADE" });
MaterialTransaction.belongsTo(Material, { foreignKey: "material_id", as: "material" });

export default MaterialTransaction;