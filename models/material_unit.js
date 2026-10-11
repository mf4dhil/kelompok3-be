import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import Material from "./material.js";

const MaterialUnit = db.define(
  "material_units",
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
    name: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    conversion_factor: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: false,
      defaultValue: 1,
    },
    is_base: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "material_units",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

Material.hasMany(MaterialUnit, {
  foreignKey: "material_id",
  as: "units",
  onDelete: "CASCADE",
});
MaterialUnit.belongsTo(Material, { foreignKey: "material_id", as: "material" });

export default MaterialUnit;
