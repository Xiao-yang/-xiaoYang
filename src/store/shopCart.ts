import { defineStore } from 'pinia'

/** 购物车中的商品项 */
export interface CartItem {
	/** 商品 id */
	dishId: number
	/** 商品名称 */
	dishName: string
	/** 商品封面图 */
	dishImage: string | null
	/** 规格 id，无规格商品为 null */
	specId: number | null
	/** 规格名称，无规格商品为 null */
	specName: string | null
	/** 单价（所选规格价格或商品基础价） */
	price: number
	/** 数量 */
	quantity: number
}

/**
 * 店铺购物车
 *
 * 使用内存存储（不持久化到本地），按 vendorId 分店铺隔离：
 * - 同一小程序运行期间，退出店铺再进入仍可回显购物车商品
 * - 小程序被关闭（进程销毁）后内存自动清空，购物车数据随之清除
 */
export const useShopCartStore = defineStore('shopCart', {
	state: () => ({
		/** 以 vendorId 为键，每个店铺维护自己的购物车列表 */
		carts: {} as Record<number, CartItem[]>
	}),

	getters: {
		/** 获取指定店铺的购物车列表 */
		getCart: (state) => (vendorId: number): CartItem[] => state.carts[vendorId] || [],

		/** 指定店铺的购物车商品总数量 */
		getTotalCount: (state) => (vendorId: number): number => {
			const list = state.carts[vendorId] || []
			return list.reduce((sum, item) => sum + item.quantity, 0)
		},

		/** 指定店铺的购物车总价 */
		getTotalPrice: (state) => (vendorId: number): number => {
			const list = state.carts[vendorId] || []
			return list.reduce((sum, item) => sum + item.price * item.quantity, 0)
		}
	},

	actions: {
		/**
		 * 添加商品到指定店铺购物车
		 * 若同商品同规格已存在，则增加数量；否则新增一条
		 */
		addItem(vendorId: number, item: Omit<CartItem, 'quantity'>, quantity = 1) {
			if (!this.carts[vendorId]) {
				this.carts[vendorId] = []
			}
			const list = this.carts[vendorId]
			const exist = list.find(
				(c) => c.dishId === item.dishId && c.specId === item.specId
			)
			if (exist) {
				exist.quantity += quantity
			} else {
				list.push({ ...item, quantity })
			}
		},

		/** 修改指定店铺某购物车项的数量，数量 <= 0 时移除该项 */
		updateQuantity(vendorId: number, dishId: number, specId: number | null, quantity: number) {
			const list = this.carts[vendorId]
			if (!list) return
			const index = list.findIndex((c) => c.dishId === dishId && c.specId === specId)
			if (index === -1) return
			if (quantity <= 0) {
				list.splice(index, 1)
			} else {
				list[index].quantity = quantity
			}
			if (!list.length) {
				delete this.carts[vendorId]
			}
		},

		/** 移除指定店铺的某个购物车项 */
		removeItem(vendorId: number, dishId: number, specId: number | null) {
			const list = this.carts[vendorId]
			if (!list) return
			const index = list.findIndex((c) => c.dishId === dishId && c.specId === specId)
			if (index !== -1) {
				list.splice(index, 1)
			}
			if (!list.length) {
				delete this.carts[vendorId]
			}
		},

		/** 清空指定店铺的购物车 */
		clearCart(vendorId: number) {
			delete this.carts[vendorId]
		},

		/** 清空所有店铺购物车（小程序关闭时调用） */
		clearAll() {
			this.carts = {}
		}
	}
})
