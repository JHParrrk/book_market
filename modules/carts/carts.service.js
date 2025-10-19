const cartRepository = require("./cart.repository");
const { FORBIDDEN } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

exports.addToCart = (cartData) => cartRepository.upsertCartItem(cartData);

exports.getCartItems = (userId) => cartRepository.findCartItemsByUserId(userId);

exports.updateCartItem = async ({ cartItemId, quantity, userId }) => {
  // 본인 장바구니 상품인지 확인
  const item = await cartRepository.findCartItemById(cartItemId);
  if (item && item.user_id !== userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신의 장바구니 상품만 수정할 수 있습니다."
    );
  }
  return cartRepository.updateCartItemQuantity(cartItemId, quantity);
};

exports.removeCartItem = async (cartItemId, userId) => {
  // 본인 장바구니 상품인지 확인
  const item = await cartRepository.findCartItemById(cartItemId);
  if (item && item.user_id !== userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신의 장바구니 상품만 삭제할 수 있습니다."
    );
  }
  return cartRepository.deleteCartItem(cartItemId);
};
