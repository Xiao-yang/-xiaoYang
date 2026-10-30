<template>
	<view class="page">
		<!-- 未登录：展示未登录提示与登录按钮 -->
		<view v-if="!isLogin" class="unlogin">
			<up-icon name="account" size="96" color="#cccccc" />
			<text class="unlogin__text">登录后可查看订单</text>
			<up-button
				class="unlogin__btn"
				shape="circle"
				color="#b8d98e"
				text="去登录"
				@click="goLogin"
			/>
		</view>

		<template v-else>
			<!-- 搜索栏（吸顶） -->
			<view class="search-bar">
				<up-search
					v-model="searchInput"
					placeholder="搜索订单号"
					:show-action="true"
					action-text="搜索"
					bg-color="#f5f5f5"
					search-icon-color="#8bc34a"
					@search="handleSearch"
					@custom="handleSearch"
					@clear="handleClear"
				/>
				<!-- 订单状态分类栏 -->
				<up-tabs
					:list="tabs"
					:current="currentTab"
					line-color="#b8d98e"
					active-style="color:#333333;font-weight:bold"
					inactive-style="color:#666666"
					@change="handleTabChange"
				/>
			</view>

			<!-- 订单列表 -->
			<view class="list">
				<view v-for="order in list" :key="order.id" class="order-card">
					<view class="order-card__head">
						<text class="order-card__no">订单号：{{ order.orderNo }}</text>
						<text
							class="order-card__status"
							:class="statusClass(order.status)"
						>
							{{ ORDER_STATUS_TEXT[order.status] || '未知状态' }}
						</text>
					</view>

					<view class="order-card__row">
						<text class="order-card__label">下单时间</text>
						<text class="order-card__value">{{ formatTime(order.createdAt) }}</text>
					</view>

					<!-- 客户：看卖家；摊主：看买家；管理员：买家 + 卖家 -->
					<view v-if="role !== 'customer'" class="order-card__row">
						<text class="order-card__label">买家</text>
						<text class="order-card__value">{{ order.customerName || '-' }}</text>
					</view>
					<view v-if="role !== 'vendor'" class="order-card__row">
						<text class="order-card__label">卖家</text>
						<text class="order-card__value">{{ order.vendorName || '-' }}</text>
					</view>

					<view class="order-card__foot">
						<text class="order-card__price">¥{{ formatPrice(order.totalPrice) }}</text>
					</view>
				</view>

				<!-- 加载状态 -->
				<view v-if="list.length" class="state">
					<xy-loading
						:status="loadingMore ? 'loading' : hasMore ? 'more' : 'noMore'"
						@click="loadMore"
					/>
				</view>
				<view v-else-if="loading" class="state">
					<xy-loading status="loading" />
				</view>
				<view v-else class="state">
					<text class="state__text">暂无订单</text>
				</view>
			</view>
		</template>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import {
	ORDER_STATUS_FILTERS,
	ORDER_STATUS_TEXT,
	getOrders
} from '@/api/order'
import type { Order } from '@/api/order'

const userStore = useUserStore()

const PAGE_SIZE = 10

const isLogin = computed(() => userStore.isLogin)
/** 当前身份：customer 客户 / vendor 摊主 / admin 管理员 */
const role = computed(() => userStore.userInfo.role)

/** 搜索框输入值（实时绑定，不触发搜索） */
const searchInput = ref('')
/** 实际生效的搜索关键词 */
const appliedKeyword = ref('')
/** 当前状态筛选，undefined 表示全部 */
const statusFilter = ref<number | undefined>(undefined)
/** 状态分类 Tabs 数据（uview-plus 需要 { name } 结构） */
const tabs = computed(() => ORDER_STATUS_FILTERS.map((item) => ({ name: item.label })))
/** 当前选中的 Tabs 索引 */
const currentTab = ref(0)

const list = ref<Order[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(true)

/** 请求序号，丢弃过期响应（快速切换筛选时的竞态） */
let requestId = 0

/** 归一化后端字段，避免模板访问缺失字段报错 */
const normalize = (data: any[]): Order[] =>
	data.map((item) => ({
		id: item.id,
		orderNo: item.orderNo || '',
		customerId: item.customerId,
		customerName: item.customerName || '',
		vendorId: item.vendorId,
		vendorName: item.vendorName || '',
		totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : 0,
		status: item.status,
		createdAt: item.createdAt || '',
		items: Array.isArray(item.items) ? item.items : []
	}))

/** 加载订单列表，reset 为 true 时回到第一页 */
const load = async (reset = false) => {
	if (!isLogin.value) return
	if (!reset && (loading.value || loadingMore.value || !hasMore.value)) return

	if (reset) {
		page.value = 1
		hasMore.value = true
	}

	const currentPage = page.value
	const isFirstPage = currentPage === 1
	const token = ++requestId
	if (isFirstPage) {
		loading.value = true
	} else {
		loadingMore.value = true
	}

	try {
		const data = await getOrders({
			status: statusFilter.value,
			keyword: appliedKeyword.value,
			page: currentPage,
			pageSize: PAGE_SIZE
		})
		if (token !== requestId) return

		const rows = normalize(data.list || [])
		if (reset) {
			list.value = rows
		} else {
			list.value = [...list.value, ...rows]
		}
		hasMore.value = list.value.length < (data.total || 0)
		page.value = currentPage + 1
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		if (token === requestId) {
			loading.value = false
			loadingMore.value = false
		}
	}
}

/** 上拉加载更多 */
const loadMore = () => {
	if (!hasMore.value || loading.value || loadingMore.value) return
	load(false)
}

/** 切换状态分类：Tabs change 回调参数为 { ...item, index } */
const handleTabChange = (item: { index?: number } | number) => {
	const index = typeof item === 'number' ? item : item?.index ?? 0
	const value = ORDER_STATUS_FILTERS[index]?.value
	if (statusFilter.value === value) return
	statusFilter.value = value
	currentTab.value = index
	load(true)
}

/** 点击搜索 / 回车：应用关键词并重新加载 */
const handleSearch = () => {
	appliedKeyword.value = searchInput.value.trim()
	uni.hideKeyboard()
	load(true)
}

/** 清空关键词：回到无关键词的列表 */
const handleClear = () => {
	searchInput.value = ''
	appliedKeyword.value = ''
	load(true)
}

const goLogin = () => {
	uni.navigateTo({ url: '/pages/login/login' })
}

/** 时间展示：兼容 ISO 字符串与时间戳，截取到分钟 */
const formatTime = (value: string | number) => {
	if (!value) return ''
	if (typeof value === 'number') {
		const d = new Date(value)
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
	}
	return String(value).replace('T', ' ').slice(0, 16)
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

const formatPrice = (price: number) => (Number.isFinite(price) ? price.toFixed(2) : '0.00')

/** 状态标签样式 */
const statusClass = (status: number) => {
	if (status === 0) return 'order-card__status--pending'
	if (status === 1) return 'order-card__status--processing'
	if (status === 2) return 'order-card__status--completed'
	return 'order-card__status--canceled'
}

onShow(() => {
	if (!isLogin.value) {
		list.value = []
		return
	}
	load(true)
})

onReachBottom(() => {
	loadMore()
})
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding-bottom: 24rpx;
	background-color: #f5f5f5;
	box-sizing: border-box;
}

/* 未登录 */
.unlogin {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 200rpx;
}

.unlogin__text {
	margin-top: 24rpx;
	font-size: 28rpx;
	color: #999999;
}

.unlogin__btn {
	margin-top: 40rpx;
	width: 240rpx;
}

/* 搜索栏 */
.search-bar {
	position: sticky;
	top: 0;
	z-index: 20;
	padding: 20rpx 24rpx 10rpx;
	background-color: #ffffff;
}

/* 列表 */
.list {
	padding: 0 24rpx;
}

.order-card {
	margin-bottom: 20rpx;
	padding: 24rpx;
	background-color: #ffffff;
	border-radius: 16rpx;
}

.order-card__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-bottom: 16rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.order-card__no {
	flex: 1;
	font-size: 26rpx;
	color: #333333;
	word-break: break-all;
}

.order-card__status {
	margin-left: 16rpx;
	padding: 4rpx 16rpx;
	font-size: 22rpx;
	border-radius: 8rpx;
}

.order-card__status--pending {
	color: #d98014;
	background-color: #fdf1e2;
}

.order-card__status--processing {
	color: #1b7ed9;
	background-color: #e6f1fc;
}

.order-card__status--completed {
	color: #2f8f46;
	background-color: #e8f5ea;
}

.order-card__status--canceled {
	color: #999999;
	background-color: #f2f2f2;
}

.order-card__row {
	display: flex;
	justify-content: space-between;
	margin-top: 16rpx;
}

.order-card__label {
	font-size: 24rpx;
	color: #999999;
}

.order-card__value {
	font-size: 24rpx;
	color: #333333;
}

.order-card__foot {
	display: flex;
	justify-content: flex-end;
	margin-top: 20rpx;
}

.order-card__price {
	font-size: 30rpx;
	font-weight: bold;
	color: #f56c6c;
}

.state {
	padding: 24rpx 0;
	text-align: center;
}

.state__text {
	font-size: 24rpx;
	color: #999999;
}
</style>
