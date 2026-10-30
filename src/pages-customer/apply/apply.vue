<template>
	<view class="page">
		<!-- 手机号 + 摊位名称 -->
		<view class="card">
			<view class="row">
				<text class="label">手机号</text>
				<text class="value">{{ phone }}</text>
			</view>
			<view class="row">
				<text class="label">摊位名称</text>
				<up-input
					v-model="form.name"
					class="input"
					placeholder="请输入摊位名称"
					border="none"
					clearable
					:maxlength="50"
				/>
			</view>
		</view>

		<!-- 摊位图片 -->
		<view class="card" style="padding: 20rpx;">
			<text class="label" style="margin-bottom: 10rpx;">摊位图片</text>
			<xy-upload
				v-model="form.images"
				class="upload"
				:max-count="3"
				tip="上传 1~3 张摊位实拍图，建议包含门头照"
			/>
		</view>

		<!-- 底部提交按钮 -->
		<view class="submit-bar">
			<up-button
				text="提交申请"
				color="#b8d98e"
				shape="circle"
				:loading="submitting"
				@click="handleSubmit"
			/>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { createVendorApplication } from '@/api/vendorApplication'
import { useUserStore } from '@/store/user'

/** 摊位名称最大长度 */
const NAME_MAX_LENGTH = 50
/** 摊位图片数量限制 */
const PHOTO_MIN_COUNT = 1
const PHOTO_MAX_COUNT = 3

const userStore = useUserStore()

const form = reactive({
	name: '',
	images: [] as string[]
})
const submitting = ref(false)

// 手机号由登录态带入，不可修改
const phone = computed(() => userStore.userInfo.phone || '-')

/** 提交申请 */
const handleSubmit = async () => {
	const stallName = form.name.trim()
	if (!stallName) {
		uni.showToast({ title: '请输入摊位名称', icon: 'none' })
		return
	}
	if (stallName.length > NAME_MAX_LENGTH) {
		uni.showToast({ title: `摊位名称不能超过 ${NAME_MAX_LENGTH} 个字`, icon: 'none' })
		return
	}
	if (form.images.length < PHOTO_MIN_COUNT) {
		uni.showToast({ title: '请上传摊位图片', icon: 'none' })
		return
	}
	if (form.images.length > PHOTO_MAX_COUNT) {
		uni.showToast({ title: `摊位图片最多上传 ${PHOTO_MAX_COUNT} 张`, icon: 'none' })
		return
	}
	if (submitting.value) return

	submitting.value = true
	try {
		await createVendorApplication({ stallName, stallPhotos: form.images })
		uni.showToast({ title: '申请已提交，请等待审核', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 500)
	} catch (err) {
		// 失败信息已由 request 的响应拦截统一 toast
	} finally {
		submitting.value = false
	}
}
</script>

<style>
    page{
		background-color: #f5f5f5;
	}
</style>
<style scoped>
.page {
	padding: 30rpx;
	padding-bottom: 180rpx;
	box-sizing: border-box;
}

.card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 0 30rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card + .card {
	margin-top: 30rpx;
}

.row {
	display: flex;
	align-items: center;
	height: 100rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.row:last-child {
	border-bottom: none;
}

.label {
	width: 160rpx;
	font-size: 30rpx;
	color: #333333;
	flex-shrink: 0;
}

.value {
	flex: 1;
	font-size: 30rpx;
	color: #666666;
}

.input {
	flex: 1;
}

.card .label:first-child {
	display: block;
}

.upload {
	margin: 30rpx 0 40rpx;
}

.submit-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 20rpx 30rpx calc(20rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}
</style>
