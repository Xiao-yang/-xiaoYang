import { get, post, put, patch, del } from '@/utils/request'

/** 菜品规格：同一商品不同规格对应不同价格 */
export interface DishSpec {
	/** 详情/列表返回时有 id，新增时不需要 */
	id?: number
	name: string
	price: number
}

/** 菜品（商品）信息，字段与后端 DishVO 一致 */
export interface Dish {
	id: number
	vendorId: number
	name: string
	price: number
	image: string | null
	/** 图片列表，最多 3 张 */
	images: string[]
	description: string | null
	stock: number
	/** 1 上架 0 下架 */
	status: number
	/** 规格列表，无规格时为空数组，此时以 price 为准 */
	specs: DishSpec[]
}

/** 摊主菜品列表查询参数 */
export interface MyDishListParams {
	/** 商品名称关键词 */
	keyword?: string
	/** 上下架筛选：1 上架 0 下架，不传为全部 */
	status?: number
	/** 页码，从 1 开始 */
	page?: number
	/** 每页条数 */
	pageSize?: number
}

/** 分页结果 */
export interface DishListResult {
	list: Dish[]
	total: number
	page: number
	pageSize: number
}

/** 新增 / 编辑商品的提交数据 */
export interface DishPayload {
	name: string
	price: number
	image?: string | null
	/** 图片列表，最多 3 张，第一张作为封面 */
	images?: string[]
	description?: string | null
	stock: number
	status?: number
	/** 规格列表；编辑时传空数组表示清空规格，不传则保持不变 */
	specs?: DishSpec[]
}

/** 摊主自己的商品列表（分页），支持名称搜索与上下架筛选 */
export const getMyDishes = (params: MyDishListParams = {}) => {
	const query: Record<string, string | number> = {}
	const keyword = params.keyword?.trim()
	if (keyword) query.keyword = keyword
	if (params.status !== undefined) query.status = params.status
	if (params.page !== undefined) query.page = params.page
	if (params.pageSize !== undefined) query.pageSize = params.pageSize
	return get<DishListResult>('/dishes/mine', query)
}

/** 顾客端：获取指定摊位的在售商品列表（含规格） */
export const getDishesByVendor = (vendorId: number) =>
	get<Dish[]>('/dishes', { vendorId })

/** 商品详情 */
export const getDishDetail = (id: number) => get<Dish>(`/dishes/${id}`)

/** 新增商品 */
export const createDish = (data: DishPayload) => post<Dish>('/dishes', data)

/** 编辑商品 */
export const updateDish = (id: number, data: Partial<DishPayload>) =>
	put<Dish>(`/dishes/${id}`, data)

/** 上架 / 下架 */
export const updateDishStatus = (id: number, status: number) =>
	patch<Dish>(`/dishes/${id}/status`, { status })

/** 删除商品 */
export const removeDish = (id: number) => del<null>(`/dishes/${id}`)
