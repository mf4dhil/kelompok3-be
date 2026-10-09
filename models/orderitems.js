import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

const OrderItem = db.define(
  "OrderItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    product_variant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },

//  notes: {
//    type: DataTypes.TEXT,
//     allowNull: true,
//   },

  },
  {
    tableName: "order_items",
    timestamps: true,
  }
);

export default OrderItem;


// const OrderItem = db.define(
//   "OrderItem",
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//     },

//     order_id: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },

//     product_variant_id: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },

//     quantity: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },

//     price: {
//       type: DataTypes.DECIMAL(12, 2),
//       allowNull: false,
//     },

//     subtotal: {
//       type: DataTypes.DECIMAL(12, 2),
//       allowNull: false,
//     },

//     notes: {
//       type: DataTypes.TEXT,
//       allowNull: true,
//     },
//   },
//   {
//     tableName: "order_items",
//     timestamps: true,
//   }
// );

// export default OrderItem;