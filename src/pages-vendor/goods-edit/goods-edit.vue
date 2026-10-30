<template>
	<view class="page">
		<view class="card">
			<view class="form-item">
				<text class="label">商品图片</text>
				<xy-upload
					v-model="images"
					:max-count="3"
					tip="最多上传 3 张，第一张作为商品封面"
				/>
			</view>

			<view class="form-item">
				<text class="label">商品名称</text>
				<up-input
					v-model="form.name"
					placeholder="请输入商品名称"
					:maxlength="50"
					border="none"
					clearable
				/>
			</view>

			<view class="form-item">
				<text class="label">价格（元）</text>
				<up-input
					v-model="form.price"
					type="digit"
					placeholder="请输入价格"
					border="none"
					clearable
				/>
			</view>

			<view class="form-item">
				<text class="label">库存</text>
				<up-input
					v-model="form.stock"
					type="number"
					placeholder="请输入库存数量"
					border="none"
					clearable
				/>
			</view>

			<view class="form-item">
				<view class="spec-head">
					<text class="label">商品规格</text>
					<text class="spec-add" @click="addSpec">+ 添加规格</text>
				</view>
				<view v-for="(spec, index) in specs" :key="index" class="spec-row">
					<view class="spec-field spec-field--name">
						<up-input
							v-model="spec.name"
							placeholder="规格名称，如：中份"
							:maxlength="50"
							border="none"
						/>
					</view>
					<view class="spec-field spec-field--price">
						<up-input
							v-model="spec.price"
							type="digit"
							placeholder="0.00"
							prefix="¥"
							border="none"
						/>
					</view>
					<view class="spec-delete" @click="removeSpec(index)">
						<text class="spec-delete__text">✕</text>
					</view>
				</view>
				<text v-if="!specs.length" class="spec-tip">不配置规格时，按上方商品价格售卖</text>
			</view>

			<view class="form-item">
				<text class="label">商品描述</text>
				<up-textarea
					v-model="form.description"
					placeholder="选填，简单介绍下商品"
					:maxlength="255"
					height="140"
					count
				/>
			</view>

			<view class="form-item form-item--row">
				<text class="label">立即上架</text>
				<up-switch
					v-model="form.status"
					:active-value="1"
					:inactive-value="0"
					active-color="#b8d98e"
					inactive-color="#dddddd"
				/>
			</view>
		</view>

		<view class="footer">
			<up-button
				shape="circle"
				color="#b8d98e"
				:text="isEdit ? '保存修改' : '添加商品'"
				:loading="submitting"
				custom-style="width:600rpx"
				@click="handleSubmit"
			/>
		</view>
	</view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createDish, getDishDetail, updateDish } from '@/api/dish'

/** 编辑态的商品 id，新增时为空 */
const dishId = ref<number | null>(null)
const isEdit = ref(false)
const submitting = ref(false)
/** 商品图片地址，交给 xy-upload 上传后回填 */
const images = ref<string[]>([])

const form = reactive({
	name: '',
	price: '',
	stock: '',
	description: '',
	/** 1 上架 0 下架 */
	status: 1
})

/** 规格列表，名称 + 价格，最多 10 个 */
const specs = ref<Array<{ name: string; price: string }>>([])

const addSpec = () => {
	if (specs.value.length >= 10) {
		toast('最多添加 10 个规格')
		return
	}
	specs.value.push({ name: '', price: '' })
}

const removeSpec = (index: number) => {
	specs.value.splice(index, 1)
}

const toast = (title: string) => uni.showToast({ title, icon: 'none' })

/** 编辑态：根据 id 拉取商品详情回填表单 */
onLoad(async (query) => {
	const id = Number((query as Record<string, string> | undefined)?.id)
	if (!id) return
	dishId.value = id
	isEdit.value = true
	uni.setNavigationBarTitle({ title: '编辑商品' })
	try {
		const detail = await getDishDetail(id)
		form.name = detail.name
		form.price = String(detail.price)
		form.stock = String(detail.stock)
		form.description = detail.description || ''
		form.status = detail.status
		images.value = detail.images || []
		// 规格回填：价格转成字符串供输入框使用
		specs.value = (detail.specs || []).map((spec) => ({
			name: spec.name,
			price: String(spec.price)
		}))
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	}
})

/** 提交：新增或保存修改 */
const handleSubmit = async () => {
	if (submitting.value) return

	const name = form.name.trim()
	if (!name) {
		toast('请输入商品名称')
		return
	}

	// 只保留填写了内容的规格行
	const specRows = specs.value.filter(
		(spec) => spec.name.trim() || String(spec.price).trim()
	)
	for (const spec of specRows) {
		if (!spec.name.trim()) {
			toast('请填写规格名称')
			return
		}
		if (!(Number(spec.price) > 0)) {
			toast('请填写正确的规格价格')
			return
		}
	}
	const specNames = specRows.map((spec) => spec.name.trim())
	if (new Set(specNames).size !== specNames.length) {
		toast('规格名称不能重复')
		return
	}
	const specPayload = specRows.map((spec) => ({
		name: spec.name.trim(),
		price: Number(Number(spec.price).toFixed(2))
	}))

	// 未填基础价时，用最低规格价作为起价
	const priceInput = Number(form.price)
	const price = priceInput > 0
		? priceInput
		: specPayload.length
			? Math.min(...specPayload.map((spec) => spec.price))
			: 0
	if (!(price > 0)) {
		toast('请输入正确的价格')
		return
	}

	const stock = Number(form.stock)
	if (!Number.isInteger(stock) || stock < 0) {
		toast('请输入正确的库存数量')
		return
	}

	submitting.value = true
	try {
		const payload = {
			name,
			price: Number(price.toFixed(2)),
			images: images.value,
			description: form.description.trim() || null,
			stock,
			status: form.status,
			specs: specPayload
		}
		if (dishId.value) {
			await updateDish(dishId.value, payload)
		} else {
			await createDish(payload)
		}
		toast(isEdit.value ? '保存成功' : '添加成功')
		// 返回列表页，列表页 onShow 会自动刷新
		setTimeout(() => uni.navigateBack(), 300)
	} catch (err) {
		// 错误信息已由 request 的响应拦截统一 toast
	} finally {
		submitting.value = false
	}
}
</script>

<style lang="scss" scoped>
page {
	background-color: #f5f5f5;
}

.page {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding: 24rpx 24rpx calc(180rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;

	.card {
		background-color: #ffffff;
		border-radius: 16rpx;
		padding: 8rpx 30rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

		.form-item {
			padding: 24rpx 0;
			border-bottom: 1rpx solid #f5f5f5;

			&:last-child {
				border-bottom: none;
			}

			.label {
				display: block;
				font-size: 28rpx;
				font-weight: 500;
				color: #333;
				margin-bottom: 12rpx;
			}

			&--row {
				display: flex;
				align-items: center;
				justify-content: space-between;

				.label {
					margin-bottom: 0;
				}
			}

			.spec-head {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 8rpx;

				.label {
					margin-bottom: 0;
				}
			}

			.spec-add {
				font-size: 26rpx;
				color: #8bc34a;
			}

			.spec-row {
				display: flex;
				align-items: center;
				margin-top: 16rpx;

				.spec-field {
					display: flex;
					align-items: center;
					height: 88rpx;
					padding: 0 20rpx;
					background-color: #f7f8f5;
					border: 1rpx solid #e2e5dd;
					border-radius: 12rpx;
					box-sizing: border-box;

					&--name {
						flex: 1;
					}

					&--price {
						width: 210rpx;
						margin-left: 16rpx;
						background-color: #fffaf3;
						border-color: #f0e0c8;
					}
				}

				.spec-delete {
					display: flex;
					align-items: center;
					justify-content: center;
					width: 56rpx;
					height: 56rpx;
					margin-left: 16rpx;
					border-radius: 50%;
					background-color: #fdecec;
					flex-shrink: 0;

					&__text {
						font-size: 28rpx;
						color: #f56c6c;
						line-height: 1;
					}
				}
			}

			.spec-tip {
				display: block;
				font-size: 24rpx;
				color: #999999;
				margin-top: 12rpx;
			}
		}
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
}
</style>
