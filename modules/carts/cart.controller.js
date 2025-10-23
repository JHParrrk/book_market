const cartService = require("./cart.service");
const { CustomError } = require("../../utils/errorHandler.util");
const { BAD_REQUEST } = require("../../constants/errors");

exports.addToCart = async (req, res, next) => {
  try {
    const { book_id, quantity } = req.body;

    // [강화] 입력값 검증
    if (!book_id || !quantity || Number(quantity) < 1) {
      // 이제 CustomError를 정상적으로 사용할 수 있습니다.
      throw new CustomError(
        BAD_REQUEST.statusCode,
        "도서 ID와 1 이상의 수량을 정확히 입력해주세요."
      );
    }

    const userId = req.user.id;
    await cartService.addToCart({
      userId,
      book_id,
      quantity: Number(quantity),
    });
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

    // [강화] 입력값 검증
    if (!quantity || Number(quantity) < 1) {
      throw new CustomError(
        BAD_REQUEST.statusCode,
        "1 이상의 수량을 정확히 입력해주세요."
      );
    }

    const userId = req.user.id;
    await cartService.updateCartItem({
      cartItemId,
      quantity: Number(quantity),
      userId,
    });
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
