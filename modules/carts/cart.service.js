// book_market/modules/carts/cart.service.js

const cartRepository = require("./cart.repository");
const { NOT_FOUND } = require("../../constants/errors");
const { CustomError } = require("../../utils/errorHandler.util");

exports.addToCart = (cartData) => cartRepository.upsertCartItem(cartData);

exports.getCartItems = (userId) => cartRepository.findCartItemsByUserId(userId);

/**
 * [개선] 장바구니 상품 수량 변경
 * - DB 조회 없이 한 번의 쿼리로 소유권 확인과 수정을 동시에 처리합니다.
 * - 쿼리 결과(영향받은 행의 수)를 확인하여 성공 여부를 판단합니다.
 */
exports.updateCartItem = async ({ cartItemId, quantity, userId }) => {
  const affectedRows = await cartRepository.updateCartItemQuantity(
    cartItemId,
    quantity,
    userId
  );

  // affectedRows가 0이면, 해당 cartItemId가 존재하지 않거나 소유자가 다른 경우입니다.
  if (affectedRows === 0) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      "해당 상품을 장바구니에서 찾을 수 없거나, 수정할 권한이 없습니다."
    );
  }
};

/**
 * [개선] 장바구니 상품 삭제
 * - DB 조회 없이 한 번의 쿼리로 소유권 확인과 삭제를 동시에 처리합니다.
 */
exports.removeCartItem = async (cartItemId, userId) => {
  const affectedRows = await cartRepository.deleteCartItem(cartItemId, userId);

  if (affectedRows === 0) {
    throw new CustomError(
      NOT_FOUND.statusCode,
      "해당 상품을 장바구니에서 찾을 수 없거나, 삭제할 권한이 없습니다."
    );
  }
};
