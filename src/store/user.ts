import { defineStore } from 'pinia'

export interface UserInfo {
	avatar: string
	nickname: string
}

const emptyUserInfo = (): UserInfo => ({
	avatar: '',
	nickname: ''
})

export const useUserStore = defineStore('user', {
	state: () => ({
		token: '',
		userInfo: emptyUserInfo()
	}),
	getters: {
		// 是否已登录
		isLogin: (state): boolean => !!state.token
	},
	actions: {
		// 登录成功后写入登录态
		login(token: string, userInfo: UserInfo) {
			this.token = token
			this.userInfo = userInfo
		},
		// 退出登录，清空登录态
		logout() {
			this.token = ''
			this.userInfo = emptyUserInfo()
		}
	}
})
