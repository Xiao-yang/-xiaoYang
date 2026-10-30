import { get } from '@/utils/request'
import type { PageResult } from './vendor'

/**
 * 订单状态（与后端约定，如后端不同请同步修改）：
 * 0 待接单 / 1 制作中 / 2 已完成 / 3 已取消
 */
export const ORDER_STATUS = {
	PENDING: 0,
	PROCESSING: 1,
	COMPLETED: 2,
	CANCELED: 3
} as const

/** 订单状态筛选项，value 为 undefined 表示全部 */
export interface OrderStatusFilter {
	label: string
	value?: number
}

export const ORDER_STATUS_FILTERS: OrderStatusFilter[] = [
	{ label: '全部', value: undefined },
	{ label: '待接单', value: ORDER_STATUS.PENDING },
	{ label: '制作中', value: ORDER_STATUS.PROCESSING },
	{ label: '已完成', value: ORDER_STATUS.COMPLETED },
	{ label: '已取消', value: ORDER_STATUS.CANCELED }
]

/** 订单状态文案映射 */
export const ORDER_STATUS_TEXT: Record<number, string> = {
	[ORDER_STATUS.PENDING]: '待接单',
	[ORDER_STATUS.PROCESSING]: '制作中',
	[ORDER_STATUS.COMPLETED]: '已完成',
	[ORDER_STATUS.CANCELED]: '已取消'
}

/** 订单商品项 */
export interface OrderItem {
	id?: number
	dishId?: number
	dishName: string
	specName?: string | null
	quantity: number
	price: number
	image?: string | null
}

/** 订单，字段与后端 OrderVO 约定 */
export interface Order {
	id: number
	/** 订单号 */
	orderNo: string
	/** 买家 */
	customerId: number
	customerName: string
	/** 卖家 */
	vendorId: number
	vendorName: string
	/** 订单总价 */
	totalPrice: number
	/** 订单状态，见 ORDER_STATUS */
	status: number
	/** 下单时间 */
	createdAt: string
	/** 订单商品明细 */
	items: OrderItem[]
}

/** 订单列表查询参数 */
export interface OrderListParams {
	/** 订单状态，不传为全部 */
	status?: number
	/** 关键词，匹配订单号 */
	keyword?: string
	/** 页码，从 1 开始 */
	page?: number
	pageSize?: number
}

/**
 * 订单列表（分页）
 * 数据范围由后端按当前登录身份自动过滤：
 * 客户看自己的订单、摊主看自家订单、管理员看全部订单
 */
export const getOrders = (params: OrderListParams = {}) => {
	const query: Record<string, string | number> = {}
	if (params.status !== undefined) query.status = params.status
	const keyword = params.keyword?.trim()
	if (keyword) query.keyword = keyword
	if (params.page !== undefined) query.page = params.page
	if (params.pageSize !== undefined) query.pageSize = params.pageSize
	return get<PageResult<Order>>('/orders', query)
}
