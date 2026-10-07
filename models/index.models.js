import Customer from "./customer.js";
import Order from "./order.js";
import OrderItem from "./orderitems.js";
import ProductVariant from "./productvariants.js";

// Customer -> Order
Customer.hasMany(Order, {
  foreignKey: "customer_id",
});

Order.belongsTo(Customer, {
  foreignKey: "customer_id",
});

// Order -> OrderItem
Order.hasMany(OrderItem, {
  foreignKey: "order_id",
});

OrderItem.belongsTo(Order, {
  foreignKey: "order_id",
});

// ProductVariant -> OrderItem
ProductVariant.hasMany(OrderItem, {
  foreignKey: "product_variant_id",
});

OrderItem.belongsTo(ProductVariant, {
  foreignKey: "product_variant_id",
});

export {
  Customer,
  Order,
  OrderItem,
  ProductVariant,
};