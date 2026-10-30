import { post } from '@/utils/request'
import type { UserInfo } from '@/store/user'

/** 登录请求参数 */
export interface LoginParams {
	phone: string
	code: string
}
/** 登录返回数据（字段按后端实际返回调整） */
export interface LoginResult {
	token: string
	user: UserInfo
}

/** 发送短信验证码 */
export const sendSmsCode = (phone: string) => {
	return post('/auth/sms/send', { phone }, { auth: false })
}

/** 登录 */
export const login = (params: LoginParams) => {
	// 登录接口不需要携带 token
	return post<LoginResult>('/auth/login', params, { auth: false })
}

/** 按数据库最新身份重新签发令牌（如摊主申请通过后升级为摊主） */
export const refreshToken = () => post<LoginResult>('/auth/refresh')
