<template>
	<view class="shop-list">
		<!-- 筛选栏：距离排序 / 评分排序 / 距离范围（吸顶） -->
		<view class="filter" :style="{ top: stickyTop + 'px' }">
			<view class="filter__row">
				<view
					v-for="(item, index) in SORTS"
					:key="item.value"
					class="chip"
					:class="{ 'chip--active': sortIndex === index }"
					@click="changeSort(index)"
				>
					{{ item.label }}
				</view>
			</view>
			<view class="filter__row filter__row--distance">
				<text class="filter__hint">距离</text>
				<view
					v-for="item in DISTANCES"
					:key="item.value"
					class="chip chip--sm"
					:class="{ 'chip--sm-active': maxDistance === item.value }"
					@click="changeDistance(item.value)"
				>
					{{ item.label }}
				</view>
			</view>
		</view>

		<!-- 摊位列表 -->
		<view class="list">
			<view v-for="shop in list" :key="shop.id" class="shop">
				<!-- 摊位图片与名称左右布局，点击进入店铺 -->
				<view class="shop__head" @click="goShop(shop.id)">
					<xy-image
						class="shop__cover"
						:src="shop.stallPhotos[0]"
						mode="aspectFill"
					/>

					<view class="shop__info">
						<view class="shop__title">
							<text class="shop__name">{{ shop.stallName }}</text>
							<text class="shop__rating">★ {{ shop.rating.toFixed(1) }}</text>
						</view>
						<view class="shop__meta">
							<text class="shop__distance">{{ formatDistance(shop.distance) }}</text>
							<text
								class="shop__status"
								:class="shop.status === 1 ? 'shop__status--open' : 'shop__status--rest'"
							>
								{{ shop.status === 1 ? '营业中' : '休息中' }}
							</text>
						</view>
					</view>
				</view>

				<!-- 商品：图片 + 名称 + 价格，左右滑动，最多 6 个；点击进入店铺并定位到该商品 -->
				<scroll-view
					v-if="shop.dishes.length"
					class="shop__dishes"
					scroll-x
					enable-flex
					:show-scrollbar="false"
				>
					<view class="dish-list">
						<view
							v-for="dish in shop.dishes"
							:key="dish.id"
							class="dish"
							@click="goDish(shop.id, dish.id)"
						>
							<xy-image
								class="dish__image"
								:src="dish.image"
								mode="aspectFill"
								default-text="暂无"
							/>
							<text class="dish__name">{{ dish.name }}</text>
							<text v-if="!isVendor" class="dish__price">¥{{ dish.price.toFixed(2) }}</text>
						</view>
					</view>
				</scroll-view>
			</view>

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
				<text class="state__text">暂无符合条件的摊位</text>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { getVendors } from '@/api/vendor'
import type { VendorListItem } from '@/api/vendor'
import { useUserStore } from '@/store/user'

const props = withDefaults(
	defineProps<{
		/** 搜索关键词，传入后按摊位名称 / 商品名称筛选 */
		keyword?: string
		/** 默认最大距离（米），0 表示不限；首页传 10000 只展示 10 公里内 */
		defaultMaxDistance?: number
		/** 吸顶偏移（px），首页需避开顶部品牌区；0 表示贴页面顶部 */
		stickyTop?: number
	}>(),
	{
		keyword: '',
		defaultMaxDistance: 0,
		stickyTop: 0
	}
)

const userStore = useUserStore()
/** 摊主身份：隐藏价格且禁止进入店铺详情 */
const isVendor = computed(() => userStore.userInfo.role === 'vendor')

/** 排序选项 */
const SORTS: { label: string; value: 'default' | 'distance' | 'rating' }[] = [
	{ label: '综合', value: 'default' },
	{ label: '距离最近', value: 'distance' },
	{ label: '评分最高', value: 'rating' }
]

/** 距离范围选项，0 表示不限 */
const DISTANCES: { label: string; value: number }[] = [
	{ label: '10km', value: 10000 },
	{ label: '3km', value: 3000 },
	{ label: '1km', value: 1000 },
	{ label: '500m', value: 500 }
]

const PAGE_SIZE = 10

const list = ref<VendorListItem[]>([])
/** 首屏/重置加载中 */
const loading = ref(false)
/** 上拉加载中 */
const loadingMore = ref(false)
const page = ref(1)
const total = ref(0)
const hasMore = ref(true)
const sortIndex = ref(0)
const maxDistance = ref(props.defaultMaxDistance)
/** 当前定位，获取失败时为 null */
const location = ref<{ lat: number; lng: number } | null>(null)

let timer: ReturnType<typeof setTimeout> | null = null
/** 请求序号，用于丢弃过期响应（快速切换筛选时的竞态） */
let requestId = 0

/** 获取当前定位（gcj02），失败静默返回 null */
const fetchLocation = () =>
	new Promise<{ lat: number; lng: number } | null>((resolve) => {
		uni.getLocation({
			type: 'gcj02',
			success: (res) => resolve({ lat: res.latitude, lng: res.longitude }),
			fail: () => resolve(null)
		})
	})

/** 距离文案：不足 1 公里显示米，否则显示公里；兼容 null / undefined / NaN */
const formatDistance = (distance: number | null | undefined) => {
	if (distance === null || distance === undefined || Number.isNaN(distance)) return '距离未知'
	return distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`
}

/**
 * 加载摊位列表
 * reset 为 true 时从第一页重新拉取（搜索、切换筛选），否则加载下一页
 */
const load = async (reset = false) => {
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
		const data = await getVendors({
			lat: location.value?.lat,
			lng: location.value?.lng,
			sort: SORTS[sortIndex.value].value,
			maxDistance: maxDistance.value || undefined,
			keyword: props.keyword,
			page: currentPage,
			pageSize: PAGE_SIZE
		})
		// 已有更新的请求发出，丢弃这次结果
		if (token !== requestId) return
		// 归一化：后端字段可能缺失，统一兜底为数组/默认值，避免模板访问 .length 报错
		const normalized = (data.list || []).map((shop) => ({
			...shop,
			stallPhotos: Array.isArray(shop.stallPhotos) ? shop.stallPhotos : [],
			rating: typeof shop.rating === 'number' ? shop.rating : 0,
			dishes: Array.isArray(shop.dishes) ? shop.dishes : []
		}))
		list.value = isFirstPage ? normalized : [...list.value, ...normalized]
		total.value = data.total
		hasMore.value = list.value.length < data.total
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		if (token === requestId) {
			loading.value = false
			loadingMore.value = false
		}
	}
}

/** 上拉加载下一页，供页面 onReachBottom 调用 */
const loadMore = () => {
	if (loading.value || loadingMore.value || !hasMore.value) return
	page.value += 1
	load()
}

const changeSort = async (index: number) => {
	if (sortIndex.value === index) return
	sortIndex.value = index
	// 选择距离排序时若还没有定位，重新尝试获取
	if (SORTS[index].value === 'distance' && !location.value) {
		location.value = await fetchLocation()
		if (!location.value) {
			uni.showToast({ title: '未获取到定位，无法按距离排序', icon: 'none' })
		}
	}
	load(true)
}

const changeDistance = (value: number) => {
	if (maxDistance.value === value) return
	maxDistance.value = value
	load(true)
}

/** 点击摊位图片/名称进入店铺详情（摊主身份禁止进入） */
const goShop = (vendorId: number) => {
	if (isVendor.value) return
	uni.navigateTo({ url: `/pages-customer/shop-detail/shop-detail?id=${vendorId}` })
}

/** 点击商品进入店铺详情并定位到该商品（摊主身份禁止进入） */
const goDish = (vendorId: number, dishId: number) => {
	if (isVendor.value) return
	uni.navigateTo({
		url: `/pages-customer/shop-detail/shop-detail?id=${vendorId}&dishId=${dishId}`
	})
}

/** 关键词变化时防抖刷新；关键词为空时清空结果（搜索页清空场景） */
watch(
	() => props.keyword,
	(val) => {
		if (timer) clearTimeout(timer)
		if (!val) {
			list.value = []
			hasMore.value = false
			total.value = 0
			return
		}
		timer = setTimeout(() => load(true), 400)
	}
)

onMounted(async () => {
	location.value = await fetchLocation()
	// 默认按距离筛选却没拿到定位时，距离条件无法生效，提示已展示全部
	if (props.defaultMaxDistance > 0 && !location.value) {
		uni.showToast({ title: '未获取到定位，已显示全部摊位', icon: 'none' })
	}
	load(true)
})

/** 暴露给页面，配合 onReachBottom 实现上拉加载 */
defineExpose({ loadMore })
</script>

<style scoped>
.shop-list {
	padding: 0 24rpx;
}

.filter {
	position: sticky;
	z-index: 10;
	padding-top: 16rpx;
	padding-bottom: 20rpx;
	background-color: #f5f5f5;
}

.filter__row {
	display: flex;
	align-items: center;
}

.filter__row--distance {
	margin-top: 16rpx;
}

.filter__hint {
	margin-right: 12rpx;
	font-size: 24rpx;
	color: #999999;
}

.chip {
	margin-right: 16rpx;
	padding: 10rpx 28rpx;
	font-size: 26rpx;
	color: #666666;
	background-color: #ffffff;
	border-radius: 28rpx;
}

.chip--active {
	color: #ffffff;
	font-weight: bold;
	background-color: #b8d98e;
}

.chip--sm {
	padding: 6rpx 20rpx;
	font-size: 24rpx;
	border-radius: 24rpx;
}

.chip--sm-active {
	color: #5c8a2a;
	background-color: #eef7e4;
}

.shop {
	margin-bottom: 20rpx;
	padding: 20rpx;
	background-color: #ffffff;
	border-radius: 20rpx;
}

.shop__head {
	display: flex;
}

.shop__cover {
	width: 150rpx;
	height: 150rpx;
	flex-shrink: 0;
	border-radius: 14rpx;
}

.shop__cover--empty {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f0f2eb;
}

.shop__cover-text {
	font-size: 20rpx;
	color: #9aa093;
}

.shop__info {
	padding-top: 10rpx;
	flex: 1;
	margin-left: 20rpx;
	overflow: hidden;
}

.shop__title {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.shop__name {
	flex: 1;
	font-size: 32rpx;
	font-weight: bold;
	color: #333333;
	word-break: break-all;
}

.shop__rating {
	flex-shrink: 0;
	margin-left: 12rpx;
	font-size: 24rpx;
	color: #fa8c16;
}

.shop__meta {
	display: flex;
	align-items: center;
	margin-top: 12rpx;
}

.shop__distance {
	font-size: 24rpx;
	color: #999999;
}

.shop__status {
	margin-left: 16rpx;
	padding: 4rpx 14rpx;
	font-size: 22rpx;
	border-radius: 18rpx;
}

.shop__status--open {
	color: #5c8a2a;
	background-color: #eef7e4;
}

.shop__status--rest {
	color: #9a9a9a;
	background-color: #f2f2f2;
}

.shop__dishes {
	width: 100%;
	margin-top: 18rpx;
	white-space: nowrap;
}

.dish-list {
	display: flex;
	flex-wrap: nowrap;
}

.dish {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 130rpx;
	flex-shrink: 0;
	margin-right: 20rpx;
}

.dish:last-child {
	margin-right: 0;
}

.dish__image {
	width: 130rpx;
	height: 130rpx;
	border-radius: 12rpx;
	background-color: #f0f2eb;
}

.dish__image--empty {
	display: flex;
	align-items: center;
	justify-content: center;
}

.dish__image-text {
	font-size: 22rpx;
	color: #9aa093;
}

.dish__name {
	width: 100%;
	margin-top: 5rpx;
	font-size: 24rpx;
	color: #333333;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.dish__price {
	margin-top: 4rpx;
	text-align: left;
	font-size: 24rpx;
	font-weight: bold;
	color: #f56c6c;
}

.dish__price--hidden {
	font-weight: normal;
	color: #bbbbbb;
}

.shop__no-dish {
	margin-top: 16rpx;
	font-size: 24rpx;
	color: #bbbbbb;
}

.state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 60rpx 0;
}

.state__text {
	font-size: 26rpx;
	color: #999999;
}
</style>
