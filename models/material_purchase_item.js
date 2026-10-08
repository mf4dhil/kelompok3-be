import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import MaterialPurchase from "./material_purchase.js";
import Material from "./material.js";

const MaterialPurchaseItem = db.define(
  "material_purchase_items",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    purchase_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    material_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    tableName: "material_purchase_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

// Relasi: MaterialPurchase hasMany MaterialPurchaseItem
MaterialPurchase.hasMany(MaterialPurchaseItem, {
  foreignKey: "purchase_id",
  as: "items",
  onDelete: "CASCADE",
});
MaterialPurchaseItem.belongsTo(MaterialPurchase, { foreignKey: "purchase_id", as: "purchase" });

// Relasi: Material hasMany MaterialPurchaseItem
Material.hasMany(MaterialPurchaseItem, { foreignKey: "material_id", as: "purchase_items" });
MaterialPurchaseItem.belongsTo(Material, { foreignKey: "material_id", as: "material" });

export default MaterialPurchaseItem;