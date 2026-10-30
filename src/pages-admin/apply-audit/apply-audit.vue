<template>
	<view class="page">
		<!-- 固定顶部：搜索框 + 状态分类 -->
		<view class="header">
			<view class="header__search">
				<up-search
					v-model="keyword"
					placeholder="搜索摊位名称 / 手机号"
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

		<!-- 审核列表 -->
		<view class="list">
			<view v-for="item in list" :key="item.id" class="audit-item">
				<view class="audit-item__head">
					<text class="stall-name">{{ item.stallName }}</text>
					<text class="status" :class="`status--${item.status}`">
						{{ statusText(item.status) }}
					</text>
				</view>

				<view class="info-row">
					<text class="info-label">手&ensp;机&ensp;号：</text>
					<text class="info-value">{{ item.phone || '-' }}</text>
				</view>
				<view class="info-row" v-if="item.status === 'rejected'">
					<text class="info-label">失败原因：</text>
					<text class="info-value">{{ item.rejectReason || '-' }}</text>
				</view>

				<view class="info-row">
					<text class="info-label">图&emsp;&emsp;片：</text>
					<view class="photos">
						<xy-image
							v-for="(url, index) in (item.stallPhotos || []).slice(0, 3)"
							:key="index"
							class="photo"
							:src="url"
							mode="aspectFill"
						/>
						<text v-if="!item.stallPhotos || !item.stallPhotos.length" class="info-value">
							暂无
						</text>
					</view>
				</view>

				<!-- 待审核才展示通过 / 拒绝 -->
				<view v-if="item.status === 'pending'" class="audit-item__actions">
					<up-button
						size="small"
						shape="circle"
						color="#b8d98e"
						text="通过"
						:loading="auditingId === item.id && auditingAction === 'approved'"
						@click="handleAudit(item, 'approved')"
					/>
					<view class="actions-gap" />
					<up-button
						size="small"
						shape="circle"
						color="#f56c6c"
						text="拒绝"
						:loading="auditingId === item.id && auditingAction === 'rejected'"
						@click="handleAudit(item, 'rejected')"
					/>
				</view>
			</view>

			<view v-if="isEmpty" class="empty">
				<text class="empty__text">暂无审核申请</text>
			</view>

			<xy-loading :status="loadStatus" @click="handleLoadMore" />
		</view>

		<!-- 拒绝原因弹窗 -->
		<up-popup :safeAreaInsetBottom="false" :show="rejectVisible" mode="center" round="16" @close="closeReject">
			<view class="reject-panel">
				<text class="reject-title">拒绝原因</text>
				<up-textarea
					v-model="rejectReason"
					placeholder="请填写拒绝原因（非必填）"
					:maxlength="100"
					height="160"
					count
				/>
				<view class="reject-actions">
					<up-button
						size="small"
						shape="circle"
						plain
						color="#999999"
						text="取消"
						custom-style="width:220rpx"
						@click="closeReject"
					/>
					<up-button
						size="small"
						shape="circle"
						color="#f56c6c"
						text="确定拒绝"
						custom-style="width:220rpx;margin-left:24rpx"
						@click="confirmReject"
					/>
				</view>
			</view>
		</up-popup>
	</view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'
import { auditVendorApplication, getVendorApplicationList } from '@/api/vendorApplication'
import type { VendorApplication, VendorApplicationStatus } from '@/api/vendorApplication'

const PAGE_SIZE = 10

interface TabItem {
	name: string
	/** 空字符串表示「全部」 */
	value: VendorApplicationStatus | ''
}

const tabs: TabItem[] = [
	{ name: '全部', value: '' },
	{ name: '待审核', value: 'pending' },
	{ name: '审核通过', value: 'approved' },
	{ name: '审核失败', value: 'rejected' }
]

const STATUS_TEXT: Record<VendorApplicationStatus, string> = {
	pending: '待审核',
	approved: '审核通过',
	rejected: '审核失败',
	'': '全部'
}

const keyword = ref('')
const currentTab = ref(0)
const currentStatus = computed(() => tabs[currentTab.value].value)

const list = ref<VendorApplication[]>([])
const page = ref(1)
const finished = ref(false)
const loading = ref(false)
const loaded = ref(false)

/** 正在审核的申请 id 与操作，用于按钮 loading */
const auditingId = ref<number | null>(null)
const auditingAction = ref<'' | 'approved' | 'rejected'>('')

const statusText = (status: VendorApplicationStatus) => STATUS_TEXT[status] || '未知'

/** 底部上拉加载状态 */
const loadStatus = computed(() => {
	if (loading.value) return list.value.length ? 'loading' : 'idle'
	if (!list.value.length) return 'idle'
	return finished.value ? 'noMore' : 'more'
})

const isEmpty = computed(() => loaded.value && !loading.value && !list.value.length)

/** 拉取列表，reset 为 true 时从第一页重新查询 */
const fetchList = async (reset = false) => {
	if (loading.value) return
	if (!reset && finished.value) return

	if (reset) {
		page.value = 1
		finished.value = false
	}
	loading.value = true
	try {
		const res = await getVendorApplicationList({
			page: page.value,
			pageSize: PAGE_SIZE,
			status: currentStatus.value || '',
			keyword: keyword.value.trim() || ''
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

/** 拒绝原因弹窗 */
const rejectVisible = ref(false)
const rejectReason = ref('')
const rejectingItem = ref<VendorApplication | null>(null)

/** 提交审核结果 */
const submitAudit = async (
	item: VendorApplication,
	status: 'approved' | 'rejected',
	auditReason?: string
) => {
	if (auditingId.value !== null) return
	auditingId.value = item.id
	auditingAction.value = status
	try {
		await auditVendorApplication(item.id, status, auditReason)
		uni.showToast({ title: status === 'approved' ? '已通过' : '已拒绝', icon: 'none' })
		// 审核后该条状态已变化，重新查询当前分类
		fetchList(true)
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		auditingId.value = null
		auditingAction.value = ''
	}
}

/** 审核入口：通过需二次确认，拒绝弹窗填写原因（非必填） */
const handleAudit = (item: VendorApplication, status: 'approved' | 'rejected') => {
	if (auditingId.value !== null) return
	if (status === 'rejected') {
		rejectingItem.value = item
		rejectReason.value = ''
		rejectVisible.value = true
		return
	}
	uni.showModal({
		title: '提示',
		content: `确定通过「${item.stallName}」的摊主申请吗？`,
		success: (res) => {
			if (res.confirm) submitAudit(item, 'approved')
		}
	})
}

const closeReject = () => {
	rejectVisible.value = false
	rejectingItem.value = null
}

const confirmReject = () => {
	const item = rejectingItem.value
	if (!item) return
	const reason = rejectReason.value.trim()
	rejectVisible.value = false
	rejectingItem.value = null
	submitAudit(item, 'rejected', reason || undefined)
}

onReachBottom(() => {
	if (!loading.value && !finished.value && list.value.length) fetchList()
})

fetchList(true)
</script>

<style lang="scss" scoped>
page {
	background-color: #f5f5f5;
}

.page {
	min-height: 100vh;
	background-color: #f5f5f5;

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

		&__search {
			margin-bottom: 0;
		}
	}

	.list {
		padding: 197rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
		box-sizing: border-box;

		.audit-item {
			background-color: #ffffff;
			border-radius: 16rpx;
			padding: 30rpx;
			box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

			& + .audit-item {
				margin-top: 24rpx;
			}

			&__head {
				display: flex;
				align-items: center;
				justify-content: space-between;

				.stall-name {
					flex: 1;
					font-size: 32rpx;
					font-weight: bold;
					color: #333333;
					margin-right: 16rpx;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}

				.status {
					flex-shrink: 0;
					font-size: 22rpx;
					padding: 4rpx 16rpx;
					border-radius: 8rpx;

					&--pending {
						color: #fa8c16;
						background-color: #fff3e0;
					}

					&--approved {
						color: #7bb662;
						background-color: #f2f8e9;
					}

					&--rejected {
						color: #f56c6c;
						background-color: #fdecea;
					}
				}
			}

			.info-row {
				display: flex;
				margin-top: 20rpx;

				.info-label {
					font-size: 26rpx;
					color: #999999;
					flex-shrink: 0;
				}

				.info-value {
					font-size: 26rpx;
					color: #333333;
				}

				.photos {
					display: flex;
					flex-wrap: wrap;

					.photo {
						width: 140rpx;
						height: 140rpx;
						border-radius: 8rpx;
						margin-right: 16rpx;
						background-color: #f0f0f0;
					}
				}
			}

			&__actions {
				display: flex;
				justify-content: flex-end;
				align-items: center;
				margin-top: 24rpx;
				padding-top: 24rpx;
				border-top: 1rpx solid #f0f0f0;

				.actions-gap {
					width: 16rpx;
					height: 1rpx;
				}
			}
		}

		.empty {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 120rpx 0;

			&__text {
				font-size: 26rpx;
				color: #999999;
			}
		}
	}

	.reject-panel {
		width: 80vw;
		box-sizing: border-box;
		padding: 40rpx;
		background-color: #ffffff;
		border-radius: 16rpx;

		.reject-title {
			display: block;
			font-size: 30rpx;
			font-weight: bold;
			color: #333333;
			margin-bottom: 20rpx;
		}

		.reject-actions {
			display: flex;
			align-items: center;
			justify-content: center;
			margin-top: 32rpx;
		}
	}
}
</style>
