<template>
	<view class="page">
		<!-- 已登录：展示用户头像、昵称与身份 -->
		<view v-if="userStore.isLogin" class="user-card">
			<xy-image class="avatar" :src="avatarUrl" mode="aspectFill" />
			<view class="user-info">
				<view class="name-row">
					<text class="nickname">{{ displayName }}</text>
					<text class="role-tag">{{ roleText }}</text>
				</view>
				<text class="desc">{{ userStore.userInfo.phone }}</text>
			</view>
		</view>

		<!-- 未登录：展示去登录按钮 -->
		<view v-else class="user-card">
			<xy-image class="avatar" :src="avatarUrl" mode="aspectFill" />
			<view class="user-info">
				<text class="nickname">未登录</text>
				<text class="desc">登录后查看个人信息</text>
			</view>
			<up-button
				class="login-btn"
				size="small"
				shape="circle"
				color="#b8d98e"
				text="去登录"
				@click="goLogin"
			/>
		</view>

		<!-- 客户身份：申请成为摊主 -->
		<view v-if="userStore.isLogin && isCustomer" class="banner" @click="goApply">
			<view class="banner-info">
				<text class="banner-title">成为摊主</text>
				<text class="banner-desc">提交申请，审核通过后即可开启你的小店</text>
			</view>
			<text class="banner-btn" :style="{ backgroundColor: applyStatus === '待审核' ? '#dd4c35' : '#b8d98e' }">{{applyStatus}}</text>
		</view>

		<!-- 摊主 / 管理员身份：功能入口 -->
		<view v-if="menus.length" class="menu">
			<view
				v-for="item in menus"
				:key="item.url"
				class="menu-item"
				@click="goPage(item.url)"
			>
				<up-icon :name="item.icon" size="26" color="#8bc34a" />
				<text class="menu-item-text">{{ item.title }}</text>
			</view>
		</view>

		<!-- 退出登录 -->
		<view v-if="userStore.isLogin" class="logout-bar">
			<view class="logout-btn" @click="handleLogout">
				<text class="logout-text">退出登录</text>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/store/user'
import { getVendorApplication } from '@/api/vendorApplication'
import { refreshToken } from '@/api/user'
import { onShow } from '@dcloudio/uni-app'

const userStore = useUserStore()
const applyStatus = ref('立即申请')

onShow(async () => {
	// 仅客户身份需要检查摊主申请进度
	if (!userStore.isLogin || userStore.userInfo.role !== 'customer') {
		applyStatus.value = '立即申请'
		return
	}
	try {
		const res = await getVendorApplication()
		applyStatus.value = res?.statusText || '立即申请'
		// 审核通过：用数据库最新身份重新签发令牌，无需重新登录即可升级为摊主
		if (res?.status === 'approved') {
			const data = await refreshToken()
			userStore.login(data.token, data.user)
			applyStatus.value = '立即申请'
			uni.showToast({ title: '审核已通过，已升级为摊主', icon: 'none' })
		}
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	}
})

interface MenuItem {
	title: string
	/** uview-plus 图标名称 */
	icon: string
	url: string
}

/** 身份标识对应中文名称 */
const ROLE_TEXT: Record<string, string> = {
	customer: '客户',
	vendor: '摊主',
	admin: '管理员'
}

/** 各身份对应的功能入口（每行最多 5 个） */
const ROLE_MENUS: Record<string, MenuItem[]> = {
	vendor: [
		{ title: '商品管理', icon: 'bag', url: '/pages-vendor/goods/goods' },
		{ title: '店铺管理', icon: 'home', url: '/pages-vendor/shop/shop' }
	],
	admin: [
		{ title: '申请审核', icon: 'checkmark-circle', url: '/pages-admin/apply-audit/apply-audit' },
		{ title: '客户管理', icon: 'account', url: '/pages-admin/customer/customer' },
		{ title: '摊主管理', icon: 'list-dot', url: '/pages-admin/vendor/vendor' }
	]
}


const isCustomer = computed(() => userStore.userInfo.role === 'customer')
const roleText = computed(() => ROLE_TEXT[userStore.userInfo.role] || '')
// 昵称可能为空，兜底展示手机号
const displayName = computed(() => userStore.userInfo.nickname || userStore.userInfo.phone)
// 无头像时使用默认图
const avatarUrl = computed(() => userStore.userInfo.avatar || '/static/logo.png')
const menus = computed(() => ROLE_MENUS[userStore.userInfo.role] || [])

const goLogin = () => {
	uni.navigateTo({ url: '/pages/login/login' })
}

const goApply = () => {
	if(applyStatus.value === '待审核') {
		uni.showToast({ title: '请耐心等待管理员审核，或联系13536467284管理员', icon: 'none' })
		return
	}
	uni.navigateTo({ url: '/pages-customer/apply/apply' })
}

const goPage = (url: string) => {
	uni.navigateTo({ url })
}

/** 退出登录（二次确认） */
const handleLogout = () => {
	uni.showModal({
		title: '提示',
		content: '确定要退出登录吗？',
		success: (res) => {
			if (!res.confirm) return
			userStore.logout()
			uni.showToast({ title: '已退出登录', icon: 'none' })
		}
	})
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding: 30rpx;
	padding-bottom: 160rpx;
	box-sizing: border-box;
}

.user-card {
	display: flex;
	align-items: center;
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 40rpx 30rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	background-color: #f0f0f0;
	flex-shrink: 0;
}

.user-info {
	display: flex;
	flex-direction: column;
	justify-content: center;
	flex: 1;
	margin-left: 30rpx;
	overflow: hidden;
}

.name-row {
	display: flex;
	align-items: center;
}

.nickname {
	font-size: 34rpx;
	font-weight: bold;
	color: #333333;
}

.role-tag {
	font-size: 22rpx;
	color: #8bc34a;
	background-color: #f2f8e9;
	border-radius: 8rpx;
	padding: 4rpx 12rpx;
	margin-left: 16rpx;
	flex-shrink: 0;
}

.desc {
	font-size: 26rpx;
	color: #999999;
	margin-top: 12rpx;
}

.login-btn {
	flex-shrink: 0;
}

.banner {
	display: flex;
	align-items: center;
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 40rpx 30rpx;
	margin-top: 30rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.banner-info {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.banner-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333333;
}

.banner-desc {
	font-size: 24rpx;
	color: #999999;
	margin-top: 12rpx;
}

.banner-btn {
	font-size: 26rpx;
	color: #ffffff;
	background-color: #b8d98e;
	border-radius: 30rpx;
	padding: 12rpx 28rpx;
	flex-shrink: 0;
}

.menu {
	display: flex;
	flex-wrap: wrap;
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 20rpx 0;
	margin-top: 30rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.menu-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 25%;
	padding: 20rpx 0;
}

.menu-item-text {
	font-size: 24rpx;
	color: #333333;
	margin-top: 16rpx;
	text-align: center;
}

.logout-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 120rpx;
	padding-bottom: env(safe-area-inset-bottom);
}

.logout-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 340rpx;
	height: 84rpx;
	background-color: #b8d98e;
	border-radius: 32rpx;
}

.logout-text {
	font-size: 26rpx;
	color: #ffffff;
}
</style>
