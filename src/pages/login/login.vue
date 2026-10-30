<template>
	<view class="page">
		<view class="login-card">
			<xy-image class="logo" src="/static/logo.png" mode="aspectFill" />
			<text class="title">欢迎使用</text>
			<text class="desc">登录后查看你的信息</text>

			<view class="form">
				<view class="form-item">
					<text class="label">手机号</text>
					<input
						v-model="form.phone"
						class="input"
						type="number"
						maxlength="11"
						placeholder="请输入手机号"
						placeholder-class="placeholder"
					/>
				</view>

				<view class="form-item">
					<text class="label">验证码</text>
					<input
						v-model="form.code"
						class="input"
						type="number"
						maxlength="6"
						placeholder="请输入验证码"
						placeholder-class="placeholder"
					/>
					<text class="code-btn" :class="{ disabled: counting > 0 }" @click="handleSendCode">
						{{ counting > 0 ? `${counting}s后重发` : '获取验证码' }}
					</text>
				</view>
			</view>

			<button class="login-btn" :loading="loading" @click="handleLogin">登录</button>

			<text class="agreement">登录即代表同意《用户协议》和《隐私政策》</text>
		</view>
	</view>
</template>

<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import { login, sendSmsCode } from '@/api/user'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const form = reactive({
	phone: '',
	code: ''
})
const loading = ref(false)
/** 验证码重发倒计时（秒），大于 0 时禁止再次发送 */
const counting = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const backToMy = () => {
	// 从「我的」页跳转进来时直接返回，否则回到 tabbar 的「我的」页
	if (getCurrentPages().length > 1) {
		uni.navigateBack()
	} else {
		uni.switchTab({ url: '/pages/my/my' })
	}
}

const isPhoneValid = () => /^1[3-9]\d{9}$/.test(form.phone)

const stopCountdown = () => {
	if (timer) {
		clearInterval(timer)
		timer = null
	}
	counting.value = 0
}

const startCountdown = () => {
	counting.value = 60
	timer = setInterval(() => {
		counting.value--
		if (counting.value <= 0) stopCountdown()
	}, 1000)
}

/** 获取短信验证码 */
const handleSendCode = async () => {
	if (!isPhoneValid()) {
		uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
		return
	}
	if (counting.value > 0) return

	try {
		await sendSmsCode(form.phone)
		uni.showToast({ title: '验证码已发送', icon: 'none' })
		startCountdown()
	} catch (err) {
		// 失败信息已由 request 的响应拦截统一 toast
	}
}

/** 手机号 + 验证码登录 */
const handleLogin = async () => {
	if (!isPhoneValid()) {
		uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
		return
	}
	if (!form.code) {
		uni.showToast({ title: '请输入验证码', icon: 'none' })
		return
	}
	if (loading.value) return

	loading.value = true
	try {
		const { token, user } = await login({ ...form })
		// 写入 pinia 登录态，「我的」页会同步展示头像与昵称
		userStore.login(token, user)
		uni.showToast({ title: '登录成功', icon: 'success' })
		setTimeout(backToMy, 500)
	} catch (err) {
		// 失败信息已由 request 的响应拦截统一 toast
	} finally {
		loading.value = false
	}
}

onUnmounted(stopCountdown)
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding: 0 60rpx;
	box-sizing: border-box;

	.login-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 120rpx;

		.logo {
			width: 160rpx;
			height: 160rpx;
			border-radius: 50%;
			background-color: #ffffff;
		}

		.title {
			font-size: 40rpx;
			font-weight: bold;
			color: #333333;
			margin-top: 40rpx;
		}

		.desc {
			font-size: 28rpx;
			color: #999999;
			margin-top: 16rpx;
		}

		.form {
			width: 100%;
			background-color: #ffffff;
			border-radius: 16rpx;
			padding: 0 30rpx;
			margin-top: 80rpx;
			box-sizing: border-box;

			.form-item {
				display: flex;
				align-items: center;
				height: 100rpx;
				border-bottom: 1rpx solid #f0f0f0;

				&:last-child {
					border-bottom: none;
				}

				.label {
					width: 130rpx;
					font-size: 30rpx;
					color: #333333;
				}

				.input {
					flex: 1;
					font-size: 30rpx;
					color: #333333;
				}

				.code-btn {
					font-size: 26rpx;
					color: #8bc34a;
					padding-left: 20rpx;

					&.disabled {
						color: #bbbbbb;
					}
				}
			}
		}

		.login-btn {
			width: 100%;
			height: 88rpx;
			line-height: 88rpx;
			font-size: 32rpx;
			color: #ffffff;
			background-color: #b8d98e;
			border-radius: 44rpx;
			margin-top: 80rpx;

			&::after {
				border: none;
			}
		}

		.agreement {
			font-size: 24rpx;
			color: #bbbbbb;
			margin-top: 30rpx;
		}
	}
}

.placeholder {
	color: #c0c0c0;
}
</style>
