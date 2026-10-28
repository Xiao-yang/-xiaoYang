<template>
	<view class="page">
		<!-- 已登录：展示用户头像与昵称卡片 -->
		<view v-if="userStore.isLogin" class="user-card">
			<image class="avatar" :src="avatarUrl" mode="aspectFill" />
			<view class="user-info">
				<text class="nickname">{{ userStore.userInfo.nickname }}</text>
				<text class="desc">欢迎回来</text>
			</view>
		</view>

		<!-- 未登录：展示去登录按钮 -->
		<view v-else class="user-card">
			<image class="avatar" :src="avatarUrl" mode="aspectFill" />
			<view class="user-info">
				<text class="nickname">未登录</text>
				<text class="desc">登录后查看个人信息</text>
			</view>
			<button class="login-btn" @click="goLogin">去登录</button>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

// 无头像时使用默认图
const avatarUrl = computed(() => userStore.userInfo.avatar || '/static/logo.png')

const goLogin = () => {
	uni.navigateTo({ url: '/pages/login/login' })
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding: 30rpx;
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
}

.nickname {
	font-size: 34rpx;
	font-weight: bold;
	color: #333333;
}

.desc {
	font-size: 26rpx;
	color: #999999;
	margin-top: 12rpx;
}

.login-btn {
	width: 160rpx;
	height: 64rpx;
	line-height: 64rpx;
	font-size: 28rpx;
	color: #ffffff;
	background-color: #b8d98e;
	border-radius: 32rpx;
	padding: 0;
	margin: 0;
	flex-shrink: 0;
}

.login-btn::after {
	border: none;
}
</style>
