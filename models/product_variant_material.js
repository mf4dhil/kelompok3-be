import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import ProductVariant from "./productvariants.js";
import Material from "./material.js";

const ProductVariantMaterial = db.define(
  "product_variant_materials",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_variant_id: { type: DataTypes.INTEGER, allowNull: false },
    material_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  },
  {
    tableName: "product_variant_materials",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ unique: true, fields: ["product_variant_id", "material_id"] }],
  },
);

ProductVariant.hasMany(ProductVariantMaterial, {
  foreignKey: "product_variant_id",
  as: "recipe_items",
  onDelete: "CASCADE",
});
ProductVariantMaterial.belongsTo(ProductVariant, { foreignKey: "product_variant_id", as: "variant" });
Material.hasMany(ProductVariantMaterial, { foreignKey: "material_id", as: "recipe_usages" });
ProductVariantMaterial.belongsTo(Material, { foreignKey: "material_id", as: "material" });

export default ProductVariantMaterial;
