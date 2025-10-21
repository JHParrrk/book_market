const cartRepository = require("./cart.repository");
const { FORBIDDEN } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

exports.addToCart = (cartData) => cartRepository.upsertCartItem(cartData);

exports.getCartItems = (userId) => cartRepository.findCartItemsByUserId(userId);

exports.updateCartItem = async ({ cartItemId, quantity, userId }) => {
  const item = await cartRepository.findCartItemById(cartItemId);

  // 1. 상품 존재 여부 확인
  if (!item) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      "해당 상품을 장바구니에서 찾을 수 없습니다."
    );
  }
  // 2. 소유권 확인
  if (item.user_id !== userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신의 장바구니 상품만 수정할 수 있습니다."
    );
  }

  return cartRepository.updateCartItemQuantity(cartItemId, quantity);
};

exports.removeCartItem = async (cartItemId, userId) => {
  const item = await cartRepository.findCartItemById(cartItemId);

  // 1. 상품 존재 여부 확인
  if (!item) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      "해당 상품을 장바구니에서 찾을 수 없습니다."
    );
  }
  // 2. 소유권 확인
  if (item.user_id !== userId) {
    throw new CustomError(
      FORBIDDEN.statusCode,
      "자신의 장바구니 상품만 삭제할 수 있습니다."
    );
  }

  return cartRepository.deleteCartItem(cartItemId);
};
