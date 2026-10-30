<template>
	<view class="page">
		<!-- 固定顶部：搜索框 + 上下架分类 -->
		<view class="header">
			<view class="header__search">
				<up-search
					v-model="keyword"
					placeholder="搜索商品名称"
					:show-action="false"
					bg-color="#f5f5f5"
					search-icon-color="#8bc34a"
					@search="handleSearch"
					@clear="handleSearch"
				/>
			</view>
			<up-tabs
				:list="tabs"
				:current="currentTab"
				line-color="#b8d98e"
				active-style="color:#333333;font-weight:bold"
				inactive-style="color:#666666"
				@change="handleTabChange"
			/>
		</view>

		<!-- 商品列表 -->
		<view class="list">
			<view v-for="item in list" :key="item.id" class="goods-item">
				<xy-image
					class="goods-item__image"
					:src="item.image"
					mode="aspectFill"
				/>

				<view class="goods-item__main">
					<view class="goods-item__head">
						<text class="goods-item__name">{{ item.name }}</text>
						<text
							class="goods-status"
							:class="item.status === 1 ? 'goods-status--on' : 'goods-status--off'"
						>
							{{ item.status === 1 ? '已上架' : '已下架' }}
						</text>
					</view>

					<view class="goods-item__meta">
						<text class="price">
							¥{{ displayPrice(item).toFixed(2) }}<text v-if="hasSpecs(item)" class="price-from"> 起</text>
						</text>
						<text v-if="hasSpecs(item)" class="spec-tag">{{ item.specs.length }}种规格</text>
						<text class="stock">库存 {{ item.stock }}</text>
					</view>

					<view class="goods-item__actions">
						<up-button
							size="small"
							shape="circle"
							plain
							color="#8bc34a"
							text="编辑"
							custom-style="width:140rpx"
							@click="goEdit(item)"
						/>
						<up-button
							size="small"
							shape="circle"
							:color="item.status === 1 ? '#fa8c16' : '#b8d98e'"
							:text="item.status === 1 ? '下架' : '上架'"
							custom-style="width:140rpx;margin-left:16rpx"
							:loading="updatingId === item.id"
							@click="handleToggleStatus(item)"
						/>
						<up-button
							size="small"
							shape="circle"
							plain
							color="#f56c6c"
							text="删除"
							custom-style="width:140rpx;margin-left:16rpx"
							@click="handleDelete(item)"
						/>
					</view>
				</view>
			</view>

			<view v-if="isEmpty" class="empty">
				<text class="empty__text">暂无商品</text>
			</view>

			<xy-loading :status="loadStatus" @click="handleLoadMore" />
		</view>

		<!-- 底部新增按钮 -->
		<view class="footer">
			<up-button
				shape="circle"
				color="#b8d98e"
				text="+ 新增商品"
				custom-style="width:600rpx"
				@click="goCreate"
			/>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { getMyDishes, removeDish, updateDishStatus } from '@/api/dish'
import type { Dish } from '@/api/dish'

const PAGE_SIZE = 10

interface TabItem {
	name: string
	/** undefined 表示「全部」 */
	value?: number
}

const tabs: TabItem[] = [
	{ name: '全部', value: undefined },
	{ name: '已上架', value: 1 },
	{ name: '已下架', value: 0 }
]

const keyword = ref('')
const currentTab = ref(0)
const currentStatus = computed(() => tabs[currentTab.value].value)

const list = ref<Dish[]>([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)
const loaded = ref(false)
/** 正在切换上下架的商品 id */
const updatingId = ref<number | null>(null)

const isEmpty = computed(() => loaded.value && !loading.value && !list.value.length)

/** 是否配置了多规格 */
const hasSpecs = (item: Dish) => !!item.specs?.length

/** 有规格时取最低规格价作为起价展示，否则用商品基础价 */
const displayPrice = (item: Dish) => {
	if (item.specs?.length) {
		return Math.min(...item.specs.map((spec) => Number(spec.price)))
	}
	return Number(item.price)
}

/** 底部加载状态，交给 xy-loading 展示 */
const loadStatus = computed(() => {
	if (loading.value) return list.value.length ? 'loading' : 'idle'
	if (!list.value.length) return 'idle'
	return finished.value ? 'noMore' : 'more'
})

/** 拉取商品列表，reset 为 true 时从第一页重新查询 */
const fetchList = async (reset = false) => {
	if (loading.value) return
	if (!reset && finished.value) return

	if (reset) {
		page.value = 1
		finished.value = false
	}
	loading.value = true
	try {
		const res = await getMyDishes({
			keyword: keyword.value,
			status: currentStatus.value,
			page: page.value,
			pageSize: PAGE_SIZE
		})
		const rows = res?.list || []
		list.value = reset ? rows : [...list.value, ...rows]
		// 返回条数不足一页或已达总数，视为没有更多
		finished.value = rows.length < PAGE_SIZE || list.value.length >= (res?.total ?? 0)
		page.value++
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		loading.value = false
		loaded.value = true
	}
}

const handleSearch = () => {
	fetchList(true)
}

const handleTabChange = (_item: { index: number }, index: number) => {
	currentTab.value = index
	fetchList(true)
}

const handleLoadMore = () => {
	fetchList()
}

/** 上架 / 下架切换 */
const handleToggleStatus = async (item: Dish) => {
	if (updatingId.value !== null) return
	const nextStatus = item.status === 1 ? 0 : 1
	updatingId.value = item.id
	try {
		await updateDishStatus(item.id, nextStatus)
		uni.showToast({ title: nextStatus === 1 ? '已上架' : '已下架', icon: 'none' })
		// 当前分类下该商品可能不再符合筛选条件，重新查询
		fetchList(true)
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		updatingId.value = null
	}
}

/** 删除商品（二次确认） */
const handleDelete = (item: Dish) => {
	uni.showModal({
		title: '提示',
		content: `确定删除「${item.name}」吗？删除后不可恢复。`,
		success: async (res) => {
			if (!res.confirm) return
			try {
				await removeDish(item.id)
				uni.showToast({ title: '删除成功', icon: 'none' })
				fetchList(true)
			} catch (err) {
				// 错误信息已由 request 的响应拦截统一 toast
			}
		}
	})
}

const goCreate = () => {
	uni.navigateTo({ url: '/pages-vendor/goods-edit/goods-edit' })
}

const goEdit = (item: Dish) => {
	uni.navigateTo({ url: `/pages-vendor/goods-edit/goods-edit?id=${item.id}` })
}

// 上拉加载下一页
onReachBottom(() => {
	if (!loading.value && !finished.value && list.value.length) fetchList()
})

// 从新增 / 编辑页返回时自动刷新列表
onShow(() => {
	fetchList(true)
})
</script>

<style scoped>
page {
	background-color: #f5f5f5;
}

.page {
	min-height: 100vh;
	background-color: #f5f5f5;
}

.header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 10;
	background-color: #ffffff;
	padding: 16rpx 24rpx 12rpx;
	border-bottom: 1rpx solid #f0f0f0;
	box-sizing: border-box;
}

.list {
	padding: 202rpx 24rpx calc(180rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

.goods-item {
	display: flex;
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.goods-item + .goods-item {
	margin-top: 24rpx;
}

.goods-item__image {
	width: 180rpx;
	height: 180rpx;
	border-radius: 12rpx;
	background-color: #f0f0f0;
	flex-shrink: 0;
}

.goods-item__image--empty {
	display: flex;
	align-items: center;
	justify-content: center;
}

.goods-item__image-text {
	font-size: 22rpx;
	color: #bbbbbb;
}

.goods-item__main {
	flex: 1;
	margin-left: 24rpx;
	overflow: hidden;
}

.goods-item__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.goods-item__name {
	flex: 1;
	font-size: 30rpx;
	font-weight: bold;
	color: #333333;
	margin-right: 16rpx;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.goods-status {
	flex-shrink: 0;
	font-size: 22rpx;
	padding: 4rpx 16rpx;
	border-radius: 8rpx;
}

.goods-status--on {
	color: #7bb662;
	background-color: #f2f8e9;
}

.goods-status--off {
	color: #999999;
	background-color: #f0f0f0;
}

.goods-item__meta {
	display: flex;
	align-items: center;
	margin-top: 16rpx;
}

.price {
	font-size: 30rpx;
	color: #dd4c35;
	font-weight: bold;
	margin-right: 24rpx;
}

.price-from {
	font-size: 22rpx;
	font-weight: normal;
}

.spec-tag {
	font-size: 22rpx;
	color: #999999;
	margin-right: 24rpx;
}

.stock {
	font-size: 24rpx;
	color: #999999;
}

.goods-item__actions {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-top: 20rpx;
}

.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 120rpx 0;
}

.empty__text {
	font-size: 26rpx;
	color: #999999;
}

.footer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx 0 calc(20rpx + env(safe-area-inset-bottom));
	background-color: #ffffff;
	box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}
</style>
