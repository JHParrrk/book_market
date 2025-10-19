const orderService = require("./order.service");

exports.createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { delivery_info, cart_item_ids } = req.body;
    const result = await orderService.createOrder({
      userId,
      delivery_info,
      cart_item_ids,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orders = await orderService.getOrdersByUserId(userId);
    res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const order = await orderService.getOrderDetails({ orderId, userId });
    res.status(200).json(order);
  } catch (err) {
    next(err);
  }
};
