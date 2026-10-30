import { post, get, patch } from '@/utils/request'

/** 摊主申请提交参数 */
export interface VendorApplicationParams {
	/** 摊位名称，必填，最长 50 字 */
	stallName: string
	/** 摊位图片地址，必填，1~3 个 */
	stallPhotos: string[]
}

/** 提交摊主申请 */
export const createVendorApplication = (params: VendorApplicationParams) => {
	return post('/vendor-applications', params)
}

export const getVendorApplication = () => {
	return get('/vendor-applications/mine')
}

/** 审核状态：pending 审核中 / approved 审核通过 / rejected 审核失败 */
export type VendorApplicationStatus = 'pending' | 'approved' | 'rejected' | ''

/** 审核列表项 */
export interface VendorApplication {
	id: number
	stallName: string
	phone: string
	stallPhotos: string[]
	status: VendorApplicationStatus
	createdAt?: string
}

/** 审核列表查询参数 */
export interface VendorApplicationListParams {
	/** 状态筛选，不传表示全部 */
	status?: VendorApplicationStatus
	/** 搜索关键字（摊位名称 / 手机号） */
	keyword?: string
	page: number
	pageSize: number
}

/** 审核列表返回数据（后端字段不一致时改这里即可） */
export interface VendorApplicationListResult {
	list: VendorApplication[]
	total: number
}

/** 分页查询摊主申请列表（管理端） */
export const getVendorApplicationList = (params: VendorApplicationListParams) => {
	return get<VendorApplicationListResult>('/admin/vendor-applications', params)
}

/** 审核摊主申请：通过 / 拒绝（拒绝时可填写原因，非必填） */
export const auditVendorApplication = (
	id: number,
	status: Extract<VendorApplicationStatus, 'approved' | 'rejected'>,
	auditReason?: string
) => {
	const data: { status: typeof status; auditReason?: string } = { status }
	const reason = auditReason?.trim()
	if (reason) data.auditReason = reason
	return patch(`/admin/vendor-applications/${id}/status`, data)
}