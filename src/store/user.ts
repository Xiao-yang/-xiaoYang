import { defineStore } from 'pinia'

export interface UserInfo {
	id: number,
	phone: string,
	nickname?: string
	avatar?: string,
	role: string
}

const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'

const emptyUserInfo = (): UserInfo => ({
	id: 0,
	phone: '',
	nickname: undefined,
	avatar: undefined,
	role: ''
})

/** 从本地存储读取用户信息，读取失败时降级为空 */
const getStorageUserInfo = (): UserInfo => {
	try {
		const userInfo = uni.getStorageSync(USER_INFO_KEY)
		return userInfo || emptyUserInfo()
	} catch (err) {
		return emptyUserInfo()
	}
}

export const useUserStore = defineStore('user', {
	state: () => ({
		token: (uni.getStorageSync(TOKEN_KEY) as string) || '',
		userInfo: getStorageUserInfo()
	}),
	getters: {
		// 是否已登录
		isLogin: (state): boolean => !!state.token
	},
	actions: {
		// 登录成功后写入登录态并持久化到本地
		login(token: string, userInfo: UserInfo) {
			this.token = token
			this.userInfo = userInfo
			uni.setStorageSync(TOKEN_KEY, token)
			uni.setStorageSync(USER_INFO_KEY, userInfo)
		},
		// 退出登录，清空登录态与本地缓存
		logout() {
			this.token = ''
			this.userInfo = emptyUserInfo()
			uni.removeStorageSync(TOKEN_KEY)
			uni.removeStorageSync(USER_INFO_KEY)
		}
	}
})
