import { useUserStore } from '@/store/user'

/** 接口基础地址，按需修改（例如 https://api.xxx.com） */
export const BASE_URL = 'http://localhost:8080/api'

/** 请求超时时间（毫秒） */
const TIMEOUT = 10000

/** 后端业务成功状态码，按后端约定修改 */
const SUCCESS_CODE = 0

/** 后端统一返回结构 */
export interface ApiResult<T = any> {
	code: number
	message: string
	data: T
}

export interface RequestOptions {
	/** 接口地址，支持完整 url（http 开头）或基于 BASE_URL 的相对路径 */
	url: string
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
	data?: any
	header?: Record<string, string>
	/** 是否携带 token，默认 true */
	auth?: boolean
	/** 是否展示 loading，默认 false */
	showLoading?: boolean
	/** 是否自动 toast 错误信息，默认 true */
	showError?: boolean
}

let loadingCount = 0

const openLoading = () => {
	if (loadingCount === 0) {
		uni.showLoading({ title: '加载中...', mask: true })
	}
	loadingCount++
}

const closeLoading = () => {
	loadingCount--
	if (loadingCount <= 0) {
		loadingCount = 0
		uni.hideLoading()
	}
}

const toast = (message: string) => {
	uni.showToast({ title: message, icon: 'none' })
}

/** 跳转登录页，避免在登录页重复跳转 */
const toLogin = () => {
	const pages = getCurrentPages()
	const current = pages[pages.length - 1] as { route?: string } | undefined
	if (current && current.route === 'pages/login/login') return
	uni.navigateTo({ url: '/pages/login/login' })
}

/**
 * 统一请求方法：内部完成请求拦截与响应拦截
 * 成功时直接 resolve 业务数据 data，失败时 reject
 */
export const request = <T = any>(options: RequestOptions): Promise<T> => {
	const {
		url,
		method = 'GET',
		data,
		header = {},
		auth = true,
		showLoading = false,
		showError = true
	} = options

	// ---------------- 请求拦截 ----------------
	const finalHeader: Record<string, string> = {
		'Content-Type': 'application/json',
		...header
	}

	if (auth) {
		const token = useUserStore().token
		if (token) {
			finalHeader.Authorization = `Bearer ${token}`
		}
	}

	if (showLoading) openLoading()

	// ---------------- 发起请求 ----------------
	return new Promise<T>((resolve, reject) => {
		uni.request({
			url: /^https?:\/\//.test(url) ? url : BASE_URL + url,
			method,
			data,
			header: finalHeader,
			timeout: TIMEOUT,
			success: (res) => {
				// ---------------- 响应拦截 ----------------
				const statusCode = res.statusCode

				// 登录态失效：清空登录状态并跳转登录页
				if (statusCode === 401) {
					useUserStore().logout()
					toLogin()
					reject(new Error('登录已失效，请重新登录'))
					return
				}

				// http 状态码异常
				if (statusCode < 200 || statusCode >= 300) {
					const message = `请求失败(${statusCode})`
					if (showError) toast(message)
					reject(new Error(message))
					return
				}

				// 业务状态码处理
				const result = res.data as unknown as ApiResult<T>
				if (result.code === SUCCESS_CODE) {
					resolve(result.data)
					return
				}

				const message = result.message || '请求失败'
				if (showError) toast(message)
				reject(new Error(message))
			},
			fail: (err) => {
				if (showError) toast('网络异常，请稍后重试')
				reject(err)
			},
			complete: () => {
				if (showLoading) closeLoading()
			}
		})
	})
}

export const get = <T = any>(url: string, data?: any, options?: Partial<RequestOptions>) => {
	return request<T>({ url, method: 'GET', data, ...options })
}

export const post = <T = any>(url: string, data?: any, options?: Partial<RequestOptions>) => {
	return request<T>({ url, method: 'POST', data, ...options })
}

export const put = <T = any>(url: string, data?: any, options?: Partial<RequestOptions>) => {
	return request<T>({ url, method: 'PUT', data, ...options })
}

export const del = <T = any>(url: string, data?: any, options?: Partial<RequestOptions>) => {
	return request<T>({ url, method: 'DELETE', data, ...options })
}

export default request
