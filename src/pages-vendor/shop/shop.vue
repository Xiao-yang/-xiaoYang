<template>
	<view class="page">
		<view v-if="loading" class="page__loading">
			<xy-loading status="loading" />
		</view>

		<template v-else-if="vendor">
			<!-- 查看态 -->
			<view v-if="!editing" class="card">
				<swiper
					v-if="vendor.stallPhotos.length"
					class="banner"
					:indicator-dots="vendor.stallPhotos.length > 1"
					indicator-color="rgba(255,255,255,0.6)"
					indicator-active-color="#b8d98e"
					circular
					autoplay
					interval="4000"
				>
					<swiper-item v-for="(photo, index) in vendor.stallPhotos" :key="index">
						<xy-image class="banner__image" :src="photo" mode="aspectFill" />
					</swiper-item>
				</swiper>
				<view v-else class="banner banner--empty">
					<text class="banner__empty-text">暂无摊位照片</text>
				</view>

				<view class="info">
					<view class="info__head">
						<text class="info__name">{{ vendor.stallName }}</text>
						<text
							class="status-tag"
							:class="vendor.status === 1 ? 'status-tag--open' : 'status-tag--rest'"
						>
							{{ vendor.status === 1 ? '营业中' : '休息中' }}
						</text>
					</view>
					<view class="info__row">
						<text class="info__label">摊位公告</text>
						<text class="info__value">{{ vendor.announcement || '暂无公告' }}</text>
					</view>
					<view class="info__row">
						<text class="info__label">摊位位置</text>
						<text class="info__value">{{ vendor.address || '未设置' }}</text>
					</view>
					<view class="info__row">
						<text class="info__label">照片张数</text>
						<text class="info__value">{{ vendor.stallPhotos.length }} / 3</text>
					</view>
				</view>
			</view>

			<!-- 编辑态 -->
			<view v-else class="card" style="padding: 20rpx;">
				<view class="field">
					<text class="field__label">摊位照片</text>
					<xy-upload
						v-model="form.stallPhotos"
						:max-count="3"
						tip="最多 3 张，第一张作为门店封面"
					/>
				</view>

				<view class="field">
					<text class="field__label">摊位名称</text>
					<view class="field__box">
						<up-input
							v-model="form.stallName"
							placeholder="请输入摊位名称"
							:maxlength="50"
							border="none"
						/>
					</view>
				</view>

				<view class="field">
					<text class="field__label">摊位位置</text>
					<view class="field__box location" @click="chooseLocation">
						<text class="location__text" :class="{ 'location__text--empty': !form.address }">
							{{ form.address || '点击选择摆摊位置' }}
						</text>
						<up-icon name="map-fill" size="16" color="#8a8f86" />
					</view>
				</view>

				<view class="field">
					<text class="field__label">摊位公告</text>
					<view class="field__box field__box--area">
						<up-textarea
							v-model="form.announcement"
							placeholder="告诉顾客今日推荐、出摊时间等"
							:maxlength="255"
							count
							border="none"
							height="160"
						/>
					</view>
				</view>

				<view class="field field--row">
					<text class="field__label">营业状态</text>
					<view class="switch-wrap">
						<up-switch
							v-model="form.status"
							:active-value="1"
							:inactive-value="0"
							active-color="#b8d98e"
						/>
						<text class="switch-text">{{ form.status === 1 ? '营业中' : '休息中' }}</text>
					</view>
				</view>
			</view>

			<!-- 底部操作 -->
			<view class="footer">
				<template v-if="editing">
					<up-button
						shape="circle"
						plain
						color="#999999"
						text="取消"
						custom-style="width:220rpx"
						@click="cancelEdit"
					/>
					<up-button
						shape="circle"
						color="#b8d98e"
						text="保存"
						custom-style="width:400rpx;margin-left:24rpx"
						:loading="saving"
						@click="handleSave"
					/>
				</template>
				<up-button
					v-else
					shape="circle"
					color="#b8d98e"
					text="编辑店铺"
					custom-style="width:600rpx"
					@click="startEdit"
				/>
			</view>
		</template>
	</view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getMyVendor, updateMyVendor } from '@/api/vendor'
import type { Vendor } from '@/api/vendor'

/** 摊位资料（查看态数据源） */
const vendor = ref<Vendor | null>(null)
const loading = ref(true)
const editing = ref(false)
const saving = ref(false)

/** 编辑态表单 */
const form = reactive({
	stallName: '',
	stallPhotos: [] as string[],
	announcement: '',
	status: 1,
	/** 摆摊位置描述 */
	address: '',
	latitude: null as number | null,
	longitude: null as number | null
})

/** 选择摆摊位置（地图选点，返回地址与经纬度） */
const chooseLocation = () => {
	uni.chooseLocation({
		success: (res) => {
			form.address = res.address || res.name || ''
			form.latitude = res.latitude
			form.longitude = res.longitude
		},
		fail: () => {
			uni.showToast({ title: '需要授权位置信息才能选择摆摊位置', icon: 'none' })
		}
	})
}

/** 拉取摊位资料 */
const loadVendor = async () => {
	try {
		vendor.value = await getMyVendor()
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		loading.value = false
	}
}

/** 进入编辑态，用当前数据回填表单 */
const startEdit = () => {
	if (!vendor.value) return
	form.stallName = vendor.value.stallName
	form.stallPhotos = [...vendor.value.stallPhotos]
	form.announcement = vendor.value.announcement || ''
	form.status = vendor.value.status
	form.address = vendor.value.address || ''
	form.latitude = vendor.value.latitude
	form.longitude = vendor.value.longitude
	editing.value = true
}

/** 取消编辑，丢弃未保存的修改 */
const cancelEdit = () => {
	editing.value = false
}

/** 保存后退出编辑态并刷新展示 */
const handleSave = async () => {
	if (saving.value) return

	const stallName = form.stallName.trim()
	if (!stallName) {
		uni.showToast({ title: '请输入摊位名称', icon: 'none' })
		return
	}
	if (form.stallPhotos.length === 0) {
		uni.showToast({ title: '请至少上传 1 张摊位照片', icon: 'none' })
		return
	}
	if (!form.address || form.latitude === null || form.longitude === null) {
		uni.showToast({ title: '请选择摆摊位置', icon: 'none' })
		return
	}

	saving.value = true
	try {
		vendor.value = await updateMyVendor({
			stallName,
			stallPhotos: form.stallPhotos,
			announcement: form.announcement.trim() || null,
			status: form.status,
			address: form.address,
			latitude: form.latitude,
			longitude: form.longitude
		})
		editing.value = false
		uni.showToast({ title: '保存成功', icon: 'success' })
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		saving.value = false
	}
}

onLoad(() => {
	loadVendor()
})
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 24rpx;
	padding-bottom: 200rpx;
	background-color: #f5f5f5;
	box-sizing: border-box;
}

.page__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding-top: 240rpx;
}

.card {
	overflow: hidden;
	background-color: #ffffff;
	border-radius: 20rpx;
}

.banner {
	width: 100%;
	height: 360rpx;
}

.banner__image {
	width: 100%;
	height: 100%;
}

.banner--empty {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f0f2eb;
}

.banner__empty-text {
	font-size: 26rpx;
	color: #9aa093;
}

.info {
	padding: 28rpx;
}

.info__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.info__name {
	flex: 1;
	font-size: 36rpx;
	font-weight: bold;
	color: #333333;
	word-break: break-all;
}

.status-tag {
	flex-shrink: 0;
	margin-left: 16rpx;
	padding: 6rpx 18rpx;
	font-size: 24rpx;
	border-radius: 20rpx;
}

.status-tag--open {
	color: #5c8a2a;
	background-color: #eef7e4;
}

.status-tag--rest {
	color: #9a9a9a;
	background-color: #f2f2f2;
}

.info__row {
	display: flex;
	margin-top: 16rpx;
	font-size: 28rpx;
	line-height: 1.6;
}

.info__label {
	width: 160rpx;
	flex-shrink: 0;
	color: #999999;
}

.info__value {
	flex: 1;
	color: #333333;
	word-break: break-all;
}

.field {
	margin-bottom: 28rpx;
}

.field--row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.field__label {
	display: block;
	margin-bottom: 14rpx;
	font-size: 28rpx;
	color: #333333;
}

.field__box {
	display: flex;
	align-items: center;
	min-height: 88rpx;
	padding: 0 20rpx;
	background-color: #f7f8f5;
	border: 1rpx solid #e2e5dd;
	border-radius: 12rpx;
	box-sizing: border-box;
}

.location {
	justify-content: space-between;
}

.location__text {
	flex: 1;
	margin-right: 16rpx;
	font-size: 26rpx;
	color: #333333;
	word-break: break-all;
}

.location__text--empty {
	color: #999999;
}

.field__box--area {
	align-items: flex-start;
	padding: 16rpx 20rpx;
}

.switch-wrap {
	display: flex;
	align-items: center;
}

.switch-text {
	margin-left: 16rpx;
	font-size: 28rpx;
	color: #666666;
}

.footer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx 0;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	background-color: #ffffff;
	border-top: 1rpx solid #eeeeee;
}
</style>
