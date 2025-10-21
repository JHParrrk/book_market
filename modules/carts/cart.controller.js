const cartService = require("./cart.service");

exports.addToCart = async (req, res, next) => {
  try {
    const { book_id, quantity } = req.body;
    const userId = req.user.id;
    await cartService.addToCart({ userId, book_id, quantity });
    res.status(201).json({ message: "장바구니에 상품을 담았습니다." });
  } catch (err) {
    next(err);
  }
};

exports.getCartItems = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const cartItems = await cartService.getCartItems(userId);
    res.status(200).json(cartItems);
  } catch (err) {
    next(err);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { cartItemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;
    await cartService.updateCartItem({ cartItemId, quantity, userId });
    res.status(200).json({ message: "상품 수량이 변경되었습니다." });
  } catch (err) {
    next(err);
  }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const { cartItemId } = req.params;
    const userId = req.user.id;
    await cartService.removeCartItem(cartItemId, userId);
    res
      .status(200)
      .json({ message: "장바구니 상품이 성공적으로 삭제되었습니다." });
  } catch (err) {
    next(err);
  }
};
