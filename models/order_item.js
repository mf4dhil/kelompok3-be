import { DataTypes } from "sequelize";
import db from "../config/dababase.js";
import Order from "./order.js";
import ProductVariant from "./productvariants.js";

const OrderItem = db.define(
  "order_items",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "order_items",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// Relation: OrderItem belongsTo Order
OrderItem.belongsTo(Order, { foreignKey: "order_id" });
// Relation: Order hasMany OrderItem
Order.hasMany(OrderItem, { foreignKey: "order_id" });

// Relation: OrderItem belongsTo ProductVariant
OrderItem.belongsTo(ProductVariant, { foreignKey: "product_variant_id" });

export default OrderItem;