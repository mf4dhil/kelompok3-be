import { DataTypes } from "sequelize";
import db from "../config/dababase.js";

// const Order = db.define(
//   "Order",
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//     },

//     customer_id: {
//       type: DataTypes.INTEGER,
//       allowNull: false,
//     },

//     order_number: {
//       type: DataTypes.STRING(30),
//       allowNull: false,
//       unique: true,
//     },

//     order_date: {
//       type: DataTypes.DATEONLY,
//       allowNull: false,
//     },

//     pickup_date: {
//       type: DataTypes.DATEONLY,
//       allowNull: false,
//     },

//     status: {
//       type: DataTypes.ENUM(
//         "Pending",
//         "Diproses",
//         "Dibuat",
//         "Selesai",
//         "Diambil",
//         "Dibatalkan"
//       ),
//       defaultValue: "Pending",
//       allowNull: false,
//     },

//     notes: {
//       type: DataTypes.TEXT,
//       allowNull: true,
//     },

//     total_amount: {
//       type: DataTypes.DECIMAL(12, 2),
//       allowNull: false,
//       defaultValue: 0,
//     },
//   },
//   {
//     tableName: "orders",
//     timestamps: true,
//   }
// );

// export default Order;

const Order = db.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    order_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },

    order_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    pickup_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        "Pending",
        "Diproses",
        "Dibuat",
        "Selesai",
        "Diambil",
        "Dibatalkan"
      ),
      defaultValue: "Pending",
      allowNull: false,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // payment_method: {
    //   type: DataTypes.ENUM("transfer", "cash"),
    //   allowNull: false,
    // },

    // rekening_id: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true,
    // },

    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "orders",
    timestamps: true,
  }
);

export default Order;