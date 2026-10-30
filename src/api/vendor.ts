import { get, put } from '@/utils/request'

/** 摊位资料，字段与后端 VendorVO 一致 */
export interface Vendor {
	id: number
	/** 摊主用户ID（users.id） */
	userId: number
	stallName: string
	/** 摊位照片，最多 3 张 */
	stallPhotos: string[]
	announcement: string | null
	/** 坐标，未设置时为 null */
	latitude: number | null
	longitude: number | null
	/** 摆摊位置描述 */
	address: string | null
	/** 评分 0~5 */
	rating: number
	/** 1 营业中 0 休息中 */
	status: number
}

/** 摊位列表里的商品预览 */
export interface VendorDishPreview {
	id: number
	name: string
	price: number
	image: string | null
}

/** 顾客端摊位列表项 */
export interface VendorListItem extends Vendor {
	/** 距离（米），无定位或无坐标时为 null */
	distance: number | null
	/** 默认展示的商品，最多 6 个 */
	dishes: VendorDishPreview[]
}

/** 分页返回结构 */
export interface PageResult<T> {
	list: T[]
	total: number
	page: number
	pageSize: number
}

/** 顾客端摊位列表查询参数 */
export interface VendorListParams {
	/** 当前纬度，与 lng 同时传才会计算距离 */
	lat?: number
	lng?: number
	/** default 综合 / distance 距离最近 / rating 评分最高 */
	sort?: 'default' | 'distance' | 'rating'
	/** 最大距离（米），不传表示不限 */
	maxDistance?: number
	/** 关键词，匹配摊位名称或在售商品名称 */
	keyword?: string
	/** 页码，从 1 开始 */
	page?: number
	pageSize?: number
}

/** 摊主更新摊位资料 */
export interface VendorPayload {
	stallName?: string
	stallPhotos?: string[]
	announcement?: string | null
	status?: number
	/** 摆摊位置描述 */
	address?: string
	latitude?: number
	longitude?: number
}

/** 摊主查看自己的摊位资料 */
export const getMyVendor = () => get<Vendor>('/vendors/me')

/** 摊主更新自己的摊位资料 */
export const updateMyVendor = (data: VendorPayload) => put<Vendor>('/vendors/me', data)

/** 顾客端摊位列表（仅营业中，分页） */
export const getVendors = (params: VendorListParams = {}) => {
	const query: Record<string, string | number> = {}
	if (params.lat !== undefined && params.lng !== undefined) {
		query.lat = params.lat
		query.lng = params.lng
	}
	if (params.sort) query.sort = params.sort
	if (params.maxDistance) query.maxDistance = params.maxDistance
	if (params.page) query.page = params.page
	if (params.pageSize) query.pageSize = params.pageSize
	const keyword = params.keyword?.trim()
	if (keyword) query.keyword = keyword
	return get<PageResult<VendorListItem>>('/vendors', query)
}
