<template>
	<view class="page">
		<!-- 加载中 -->
		<view v-if="loading" class="page__loading">
			<xy-loading status="loading" />
		</view>

		<template v-else-if="vendor">
			<!-- 顶部摊位图片轮播 -->
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

			<!-- 摊位信息卡片：图片 + 名称 + 距离 + 状态 -->
			<view class="shop-card">
				<view class="shop-card__head">
					<xy-image
						class="shop-card__cover"
						:src="vendor.stallPhotos[0]"
						mode="aspectFill"
					/>

					<view class="shop-card__info">
						<view class="shop-card__title">
							<text class="shop-card__name">{{ vendor.stallName }}</text>
							<text class="shop-card__rating">★ {{ vendor.rating.toFixed(1) }}</text>
						</view>
						<view class="shop-card__meta">
							<text class="shop-card__distance">{{ formatDistance(vendor.distance) }}</text>
							<text
								class="shop-card__status"
								:class="vendor.status === 1 ? 'shop-card__status--open' : 'shop-card__status--rest'"
							>
								{{ vendor.status === 1 ? '营业中' : '休息中' }}
							</text>
						</view>
						<text v-if="vendor.announcement" class="shop-card__notice">{{ vendor.announcement }}</text>
					</view>
				</view>
			</view>

			<!-- 商品列表 -->
			<view class="goods-section">
				<view class="goods-section__title">商品列表</view>
				<view v-if="vendor.dishes.length" class="goods-list">
					<view
						v-for="dish in vendor.dishes"
						:key="dish.id"
						:id="'dish-' + dish.id"
						class="goods-item"
					>
						<xy-image
							class="goods-item__image"
							:src="dish.image"
							mode="aspectFill"
						/>

						<view class="goods-item__main">
							<text class="goods-item__name">{{ dish.name }}</text>
							<text v-if="dish.description" class="goods-item__desc">{{ dish.description }}</text>

							<view class="goods-item__bottom">
								<view class="goods-item__price-wrap">
									<text class="goods-item__price">
										¥{{ displayPrice(dish).toFixed(2) }}
										<text v-if="hasSpecs(dish)" class="goods-item__price-from"> 起</text>
									</text>
									<text v-if="hasSpecs(dish)" class="goods-item__spec-tag">{{ dish.specs.length }}种规格</text>
								</view>
								<view class="goods-item__add" @click="openSpec(dish)">
									<up-icon name="plus" size="14" color="#ffffff" />
								</view>
							</view>
						</view>
					</view>
				</view>
				<view v-else class="goods-empty">
					<text class="goods-empty__text">该摊位暂无商品</text>
				</view>
			</view>

			<!-- 底部结算栏 -->
			<view class="settle-bar">
				<view class="settle-bar__cart" @click="toggleCartPanel">
					<view class="settle-bar__cart-icon">
						<up-icon name="shopping-cart" size="28" color="#fff" />
						<view v-if="totalCount > 0" class="settle-bar__badge">{{ totalCount }}</view>
					</view>
					<view class="settle-bar__cart-text">
						<text class="settle-bar__price">¥{{ totalPrice.toFixed(2) }}</text>
						<!-- <text class="settle-bar__hint">另需配送费 ¥0.00</text> -->
					</view>
				</view>
				<view
					class="settle-bar__btn"
					:class="{ 'settle-bar__btn--disabled': totalCount === 0 }"
					@click="handleCheckout"
				>
					{{ totalCount > 0 ? '去结算' : '购物车是空的' }}
				</view>
			</view>

			<!-- 购物车展开面板 -->
			<view v-if="cartPanelVisible" class="cart-mask" @click="toggleCartPanel" />
			<view v-if="cartPanelVisible" class="cart-panel">
				<view class="cart-panel__head">
					<text class="cart-panel__title">已选商品</text>
					<text class="cart-panel__clear" @click="handleClearCart">清空</text>
				</view>
				<scroll-view class="cart-panel__list" scroll-y>
					<view v-for="item in cartList" :key="item.dishId + '-' + item.specId" class="cart-item">
						<xy-image
							class="cart-item__image"
							:src="item.dishImage"
							mode="aspectFill"
						/>
						<view class="cart-item__main">
							<text class="cart-item__name">{{ item.dishName }}</text>
							<text v-if="item.specName" class="cart-item__spec">{{ item.specName }}</text>
							<text class="cart-item__price">¥{{ item.price.toFixed(2) }}</text>
						</view>
						<view class="cart-item__stepper">
							<view
								class="cart-item__stepper-btn cart-item__stepper-btn--minus"
								@click="changeQuantity(item, -1)"
							>
								<up-icon name="minus" size="10" color="#666666" />
							</view>
							<text class="cart-item__stepper-num">{{ item.quantity }}</text>
							<view
								class="cart-item__stepper-btn cart-item__stepper-btn--plus"
								@click="changeQuantity(item, 1)"
							>
								<up-icon name="plus" size="10" color="#ffffff" />
							</view>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- 规格选择弹层 -->
			<up-popup
				v-model:show="specVisible"
				mode="bottom"
				:border-radius="20"
				:safe-area-inset-bottom="true"
				:mask-style="{ bottom: 'calc(110rpx + env(safe-area-inset-bottom))' }"
			>
				<view v-if="specDish" class="spec-popup">
					<view class="spec-popup__head">
						<xy-image
							class="spec-popup__image"
							:src="specDish.image"
							mode="aspectFill"
						/>
						<view class="spec-popup__info">
							<text class="spec-popup__name">{{ specDish.name }}</text>
							<text class="spec-popup__price">
								¥{{ selectedPrice.toFixed(2) }}
							</text>
						</view>
						<view class="spec-popup__close" @click="specVisible = false">
							<up-icon name="close" size="16" color="#999999" />
						</view>
					</view>

					<view v-if="hasSpecs(specDish)" class="spec-popup__section">
						<text class="spec-popup__section-title">选择规格</text>
						<view class="spec-popup__specs">
							<view
								v-for="spec in specDish.specs"
								:key="spec.id"
								class="spec-chip"
								:class="{ 'spec-chip--active': selectedSpecId === spec.id }"
								@click="selectedSpecId = spec.id ?? null"
							>
								{{ spec.name }}
							</view>
						</view>
					</view>

					<view class="spec-popup__section">
						<text class="spec-popup__section-title">购买数量</text>
						<view class="spec-popup__stepper">
							<view
								class="spec-popup__stepper-btn"
								:class="{ 'spec-popup__stepper-btn--disabled': specQuantity <= 0 }"
								@click="decreaseSpecQuantity"
							>
								<up-icon name="minus" size="12" :color="specQuantity <= 0 ? '#cccccc' : '#666666'" />
							</view>
							<text class="spec-popup__stepper-num">{{ specQuantity }}</text>
							<view class="spec-popup__stepper-btn spec-popup__stepper-btn--plus" @click="specQuantity++">
								<up-icon name="plus" size="12" color="#ffffff" />
							</view>
						</view>
					</view>

					<view class="spec-popup__footer">
						<up-button
							shape="circle"
							color="#b8d98e"
							text="加入购物车"
							custom-style="width:100%"
							@click="confirmAddCart"
						/>
					</view>
				</view>
			</up-popup>
		</template>
	</view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getVendorDetail } from '@/api/vendor'
import type { VendorDetail } from '@/api/vendor'
import type { Dish, DishSpec } from '@/api/dish'
import { getDishesByVendor } from '@/api/dish'
import { useShopCartStore } from '@/store/shopCart'
import type { CartItem } from '@/store/shopCart'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const cartStore = useShopCartStore()

const vendor = ref<VendorDetail | null>(null)
const loading = ref(true)
/** 进入店铺时需要滚动定位的商品 id */
const targetDishId = ref<number | null>(null)

/** 购物车面板 */
const cartPanelVisible = ref(false)
/** 规格弹层 */
const specVisible = ref(false)
const specDish = ref<Dish | null>(null)
const selectedSpecId = ref<number | null>(null)
const specQuantity = ref(1)

/** 当前店铺的购物车列表（从 store 派生） */
const cartList = computed<CartItem[]>(() =>
	vendor.value ? cartStore.getCart(vendor.value.id) : []
)
const totalCount = computed(() =>
	vendor.value ? cartStore.getTotalCount(vendor.value.id) : 0
)
const totalPrice = computed(() =>
	vendor.value ? cartStore.getTotalPrice(vendor.value.id) : 0
)

/** 购物车被清空时自动关闭购物车面板 */
watch(
	() => cartList.value.length,
	(len) => {
		if (len === 0) cartPanelVisible.value = false
	}
)

/** 所选规格的价格；无规格时取商品基础价 */
const selectedPrice = computed(() => {
	if (!specDish.value) return 0
	if (!hasSpecs(specDish.value)) return Number(specDish.value.price)
	const spec = specDish.value.specs.find((s) => s.id === selectedSpecId.value)
	return spec ? Number(spec.price) : 0
})

/** 距离文案：兼容 null / undefined / NaN */
const formatDistance = (distance: number | null | undefined) => {
	if (distance === null || distance === undefined || Number.isNaN(distance)) {
		return '距离未知'
	}
	return distance < 1000 ? `${distance}米` : `${(distance / 1000).toFixed(1)}公里`
}

/** 是否有规格 */
const hasSpecs = (dish: Dish) => !!dish.specs?.length

/** 有规格取最低价作为起价，否则用商品基础价 */
const displayPrice = (dish: Dish) => {
	if (hasSpecs(dish)) {
		return Math.min(...dish.specs.map((s) => Number(s.price)))
	}
	return Number(dish.price)
}

/** 加载摊位详情 */
const loadVendor = async (id: number) => {
	loading.value = true
	try {
		const location = await getLocation()
		const data = await getVendorDetail(id)

		// 详情接口不返回 distance，根据用户定位与摊位经纬度自行计算
		const distance = calcDistance(location, data.latitude, data.longitude)

		// 详情接口可能不返回商品列表，此时单独拉取
		let dishes: Dish[] = Array.isArray(data.dishes) ? data.dishes : []
		if (!dishes.length) {
			try {
				dishes = (await getDishesByVendor(id)) || []
			} catch (e) {
				dishes = []
			}
		}

		// 归一化：后端字段可能缺失，统一兜底，避免模板访问 .length / 运算报错
		vendor.value = {
			...data,
			distance,
			stallPhotos: Array.isArray(data.stallPhotos) ? data.stallPhotos : [],
			rating: typeof data.rating === 'number' ? data.rating : 0,
			dishes: dishes.map((dish) => ({
				...dish,
				images: Array.isArray(dish.images) ? dish.images : [],
				specs: Array.isArray(dish.specs) ? dish.specs : []
			}))
		}
		// 数据加载完成后，若带有 dishId 则滚动到对应商品
		if (targetDishId.value) {
			await nextTick()
			// 再延迟一帧确保列表节点已挂载
			setTimeout(() => scrollToDish(targetDishId.value as number), 100)
		}
	} catch (err) {
		// 错误已由请求拦截统一 toast
	} finally {
		loading.value = false
	}
}

/**
 * 根据用户定位与摊位经纬度计算直线距离（米）
 * 任一方缺失时返回 null
 */
const calcDistance = (
	location: { lat: number; lng: number } | null,
	lat: number | null | undefined,
	lng: number | null | undefined
): number | null => {
	if (!location || lat == null || lng == null) return null
	const R = 6371000
	const toRad = (d: number) => (d * Math.PI) / 180
	const dLat = toRad(lat - location.lat)
	const dLng = toRad(lng - location.lng)
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(location.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2
	return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

/** 获取定位，失败返回 null */
const getLocation = () =>
	new Promise<{ lat: number; lng: number } | null>((resolve) => {
		uni.getLocation({
			type: 'gcj02',
			success: (res) => resolve({ lat: res.latitude, lng: res.longitude }),
			fail: () => resolve(null)
		})
	})

/** 点击「+」添加商品：无规格直接加购，有规格弹出选择框 */
const openSpec = (dish: Dish) => {
	if (!vendor.value) return
	// 无规格：直接以商品基础价加入购物车
	if (!hasSpecs(dish)) {
		cartStore.addItem(
			vendor.value.id,
			{
				dishId: dish.id,
				dishName: dish.name,
				dishImage: dish.image,
				specId: null,
				specName: null,
				price: Number(dish.price)
			},
			1
		)
		uni.showToast({ title: '已加入购物车', icon: 'success' })
		return
	}
	// 有规格：弹出规格选择框
	specDish.value = dish
	specQuantity.value = 1
	selectedSpecId.value = dish.specs[0]?.id ?? null
	specVisible.value = true
}

/** 规格弹层里减少数量，减到 0 时自动关闭弹窗（取消加购） */
const decreaseSpecQuantity = () => {
	if (specQuantity.value <= 0) return
	specQuantity.value -= 1
	if (specQuantity.value <= 0) {
		specVisible.value = false
	}
}

/** 确认加入购物车 */
const confirmAddCart = () => {
	if (!specDish.value || !vendor.value) return
	const dish = specDish.value
	let spec: DishSpec | null = null
	let price = Number(dish.price)
	if (hasSpecs(dish)) {
		spec = dish.specs.find((s) => s.id === selectedSpecId.value) || null
		if (!spec) {
			uni.showToast({ title: '请选择规格', icon: 'none' })
			return
		}
		price = Number(spec.price)
	}
	cartStore.addItem(
		vendor.value.id,
		{
			dishId: dish.id,
			dishName: dish.name,
			dishImage: dish.image,
			specId: spec?.id ?? null,
			specName: spec?.name ?? null,
			price
		},
		specQuantity.value
	)
	specVisible.value = false
	uni.showToast({ title: '已加入购物车', icon: 'success' })
}

/** 切换购物车面板 */
const toggleCartPanel = () => {
	cartPanelVisible.value = !cartPanelVisible.value
}

/** 修改购物车项数量 */
const changeQuantity = (item: CartItem, delta: number) => {
	if (!vendor.value) return
	cartStore.updateQuantity(vendor.value.id, item.dishId, item.specId, item.quantity + delta)
}

/** 清空购物车 */
const handleClearCart = () => {
	if (!vendor.value) return
	uni.showModal({
		title: '提示',
		content: '确定清空购物车吗？',
		success: (res) => {
			if (res.confirm && vendor.value) {
				cartStore.clearCart(vendor.value.id)
				cartPanelVisible.value = false
			}
		}
	})
}

/** 去结算 */
const handleCheckout = () => {
	// 判断是否已登录
	if (!userStore.token) {
		uni.showToast({ title: '请先登录', icon: 'none' })
		setTimeout(() => uni.navigateTo({ url: '/pages/login/login' }), 500)
		return
	}
	if (totalCount.value === 0) {
		uni.showToast({ title: '请先选择商品', icon: 'none' })
		return
	}
	// 下单接口尚未接入，暂以 toast 提示
	uni.showToast({ title: '下单功能开发中', icon: 'none' })
}

/** 滚动到指定商品 */
const scrollToDish = (dishId: number) => {
	uni.createSelectorQuery()
		.select(`#dish-${dishId}`)
		.boundingClientRect()
		.selectViewport()
		.scrollOffset(() => {})
		.exec((res) => {
			const rect = res?.[0] as { top: number } | null
			const scroll = res?.[1] as { scrollTop: number } | null
			if (rect && scroll) {
				uni.pageScrollTo({
					scrollTop: rect.top + scroll.scrollTop - 20,
					duration: 300
				})
			}
		})
}

onLoad((query) => {
	const q = query as Record<string, string> | undefined
	const id = Number(q?.id)
	if (!id) {
		uni.showToast({ title: '参数错误', icon: 'none' })
		setTimeout(() => uni.navigateBack(), 500)
		return
	}
	if (q?.dishId) {
		targetDishId.value = Number(q.dishId)
	}
	loadVendor(id)
})
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
	background-color: #f5f5f5;
	box-sizing: border-box;
}

.page__loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding-top: 240rpx;
}

/* 顶部轮播 */
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

/* 摊位信息卡片 */
.shop-card {
	margin: -30rpx 24rpx 0;
	padding: 24rpx;
	background-color: #ffffff;
	border-radius: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
	position: relative;
	z-index: 2;
}

.shop-card__head {
	display: flex;
}

.shop-card__cover {
	width: 140rpx;
	height: 140rpx;
	flex-shrink: 0;
	border-radius: 14rpx;
}

.shop-card__cover--empty {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f0f2eb;
}

.shop-card__cover-text {
	font-size: 20rpx;
	color: #9aa093;
}

.shop-card__info {
	flex: 1;
	margin-left: 20rpx;
	overflow: hidden;
}

.shop-card__title {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.shop-card__name {
	flex: 1;
	font-size: 34rpx;
	font-weight: bold;
	color: #333333;
	word-break: break-all;
}

.shop-card__rating {
	flex-shrink: 0;
	margin-left: 12rpx;
	font-size: 24rpx;
	color: #fa8c16;
}

.shop-card__meta {
	display: flex;
	align-items: center;
	margin-top: 12rpx;
}

.shop-card__distance {
	font-size: 24rpx;
	color: #999999;
}

.shop-card__status {
	margin-left: 16rpx;
	padding: 4rpx 14rpx;
	font-size: 22rpx;
	border-radius: 18rpx;
}

.shop-card__status--open {
	color: #5c8a2a;
	background-color: #eef7e4;
}

.shop-card__status--rest {
	color: #9a9a9a;
	background-color: #f2f2f2;
}

.shop-card__notice {
	display: block;
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #888888;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

/* 商品列表 */
.goods-section {
	margin: 24rpx;
}

.goods-section__title {
	padding: 16rpx 0;
	font-size: 30rpx;
	font-weight: bold;
	color: #333333;
}

.goods-list {
	display: flex;
	flex-direction: column;
}

.goods-item {
	display: flex;
	padding: 24rpx;
	margin-bottom: 20rpx;
	background-color: #ffffff;
	border-radius: 16rpx;
}

.goods-item__image {
	width: 160rpx;
	height: 160rpx;
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
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	overflow: hidden;
}

.goods-item__name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333333;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.goods-item__desc {
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #999999;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.goods-item__bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 12rpx;
}

.goods-item__price-wrap {
	display: flex;
	align-items: baseline;
}

.goods-item__price {
	font-size: 32rpx;
	font-weight: bold;
	color: #f56c6c;
}

.goods-item__price-from {
	font-size: 22rpx;
	font-weight: normal;
}

.goods-item__spec-tag {
	margin-left: 12rpx;
	font-size: 22rpx;
	color: #999999;
}

.goods-item__add {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44rpx;
	height: 44rpx;
	background-color: #b8d98e;
	border-radius: 50%;
}

.goods-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 120rpx 0;
}

.goods-empty__text {
	font-size: 26rpx;
	color: #999999;
}

/* 底部结算栏 */
.settle-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	height: 110rpx;
	padding: 0 24rpx;
	padding-bottom: env(safe-area-inset-bottom);
	background-color: #ffffff;
	box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
	z-index: 100;
}

.settle-bar__cart {
	display: flex;
	align-items: center;
	flex: 1;
}

.settle-bar__cart-icon {
	position: relative;
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #fa8c16;
	border-radius: 50%;
}

.settle-bar__badge {
	position: absolute;
	top: -6rpx;
	right: -6rpx;
	min-width: 32rpx;
	height: 32rpx;
	padding: 0 8rpx;
	font-size: 20rpx;
	color: #ffffff;
	background-color: #f56c6c;
	border-radius: 16rpx;
	text-align: center;
	line-height: 32rpx;
	box-sizing: border-box;
}

.settle-bar__cart-text {
	display: flex;
	flex-direction: column;
	margin-left: 16rpx;
}

.settle-bar__price {
	font-size: 34rpx;
	font-weight: bold;
	color: #f56c6c;
}

.settle-bar__hint {
	font-size: 20rpx;
	color: #999999;
}

.settle-bar__btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 240rpx;
	height: 80rpx;
	font-size: 30rpx;
	font-weight: bold;
	color: #ffffff;
	background-color: #b8d98e;
	border-radius: 40rpx;
}

.settle-bar__btn--disabled {
	background-color: #cccccc;
}

/* 购物车面板 */
.cart-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.4);
	z-index: 200;
}

.cart-panel {
	position: fixed;
	left: 0;
	right: 0;
	bottom: calc(110rpx + env(safe-area-inset-bottom));
	padding-bottom: 100rpx;
	max-height: 60vh;
	background-color: #ffffff;
	border-radius: 24rpx 24rpx 0 0;
	z-index: 201;
	display: flex;
	flex-direction: column;
}

.cart-panel__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.cart-panel__title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333333;
}

.cart-panel__clear {
	font-size: 26rpx;
	color: #999999;
}

.cart-panel__list {
	flex: 1;
	max-height: 50vh;
}

.cart-item {
	display: flex;
	align-items: center;
	padding: 20rpx 24rpx;
}

.cart-item__image {
	width: 90rpx;
	height: 90rpx;
	border-radius: 10rpx;
	background-color: #f0f0f0;
	flex-shrink: 0;
}

.cart-item__main {
	flex: 1;
	margin-left: 16rpx;
	overflow: hidden;
}

.cart-item__name {
	display: block;
	font-size: 26rpx;
	color: #333333;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cart-item__spec {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #999999;
}

.cart-item__price {
	display: block;
	margin-top: 4rpx;
	font-size: 26rpx;
	font-weight: bold;
	color: #f56c6c;
}

.cart-item__stepper {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.cart-item__stepper-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
}

.cart-item__stepper-btn--minus {
	background-color: #f5f5f5;
}

.cart-item__stepper-btn--plus {
	background-color: #b8d98e;
}

.cart-item__stepper-num {
	width: 60rpx;
	text-align: center;
	font-size: 28rpx;
	color: #333333;
}

/* 规格弹层 */
.spec-popup {
	padding: 24rpx;
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.spec-popup__head {
	display: flex;
	position: relative;
	padding-bottom: 24rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.spec-popup__image {
	width: 160rpx;
	height: 160rpx;
	border-radius: 12rpx;
	background-color: #f0f0f0;
	flex-shrink: 0;
}

.spec-popup__info {
	flex: 1;
	margin-left: 20rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.spec-popup__name {
	font-size: 30rpx;
	font-weight: bold;
	color: #333333;
}

.spec-popup__price {
	margin-top: 12rpx;
	font-size: 34rpx;
	font-weight: bold;
	color: #f56c6c;
}

.spec-popup__close {
	position: absolute;
	top: 0;
	right: 0;
	width: 48rpx;
	height: 48rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.spec-popup__section {
	padding: 24rpx 0;
}

.spec-popup__section-title {
	display: block;
	font-size: 28rpx;
	font-weight: bold;
	color: #333333;
	margin-bottom: 16rpx;
}

.spec-popup__specs {
	display: flex;
	flex-wrap: wrap;
}

.spec-chip {
	padding: 12rpx 28rpx;
	margin-right: 16rpx;
	margin-bottom: 16rpx;
	font-size: 26rpx;
	color: #666666;
	background-color: #f5f5f5;
	border-radius: 28rpx;
}

.spec-chip--active {
	color: #5c8a2a;
	background-color: #eef7e4;
}

.spec-popup__stepper {
	display: flex;
	align-items: center;
}

.spec-popup__stepper-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	background-color: #f5f5f5;
}

.spec-popup__stepper-btn--disabled {
	background-color: #f5f5f5;
}

.spec-popup__stepper-btn--plus {
	background-color: #b8d98e;
}

.spec-popup__stepper-num {
	width: 80rpx;
	text-align: center;
	font-size: 30rpx;
	color: #333333;
}

.spec-popup__footer {
	margin-top: 24rpx;
}
</style>
