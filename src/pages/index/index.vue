<template>
  <view class="page">
    <view class="frame">
      <view class="header-card">
        <text class="header-card__title">烟草环境监测</text>
        <view class="header-card__meta">
          <view class="header-card__dot" :class="{ 'header-card__dot--active': loading }" />
          <text class="header-card__status">{{ loading ? '同步中' : '3秒刷新' }}</text>
        </view>
      </view>

      <view class="section-card">
        <text class="section-card__title">显示数据</text>
        <view class="metric-grid">
          <view
            v-for="item in metricCards"
            :key="item.key"
            class="metric-card"
            :class="{ 'metric-card--wide': item.wide }"
          >
            <text class="metric-card__label">{{ item.label }}</text>
            <text class="metric-card__value">{{ item.value }}</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <text class="section-card__title">组件状态</text>
        <view class="status-grid">
          <view
            v-for="item in statusCards"
            :key="item.key"
            class="status-card"
            :class="{ 'status-card--wide': item.wide }"
          >
            <text class="status-card__label">{{ item.label }}</text>
            <view class="status-pill" :style="{ backgroundColor: stateColor(item.state) }">
              <text class="status-pill__text">{{ item.state }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section-card">
        <text class="section-card__title">下发数据</text>
        <view
          v-for="item in thresholdRows"
          :key="item.key"
          class="threshold-row"
        >
          <text class="threshold-row__label">{{ item.label }}</text>
          <view class="threshold-row__input-wrap">
            <input
              v-model="form[item.key]"
              class="threshold-row__input"
              type="number"
              confirm-type="done"
              :disabled="sendingField === item.key"
              :placeholder="thresholdPlaceholder(item.key)"
              placeholder-class="threshold-row__placeholder"
            />
          </view>
          <view
            class="threshold-row__button"
            :class="{ 'threshold-row__button--disabled': sendingField === item.key }"
            hover-class="threshold-row__button--active"
            @tap="handleSend(item.key, item.identifier)"
          >
            <text class="threshold-row__button-text">
              {{ sendingField === item.key ? '发送中' : '下发' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="toastVisible" class="toast">
      <text class="toast__text">{{ toastMessage }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  type ThresholdFieldKey,
  useDeviceController,
} from '../../composables/useDeviceController'

const {
  metrics,
  status,
  thresholds,
  loading,
  toastMessage,
  toastVisible,
  sendingField,
  sendThreshold,
  stateColor,
  displayValue,
} = useDeviceController()

const form = reactive<Record<ThresholdFieldKey, string>>({
  temp: '',
  humi: '',
  co2: '',
  waterUpper: '',
  waterLower: '',
})

const metricCards = computed(() => [
  { key: 'temp', label: '温度', value: displayValue(metrics.temp), wide: false },
  { key: 'humi', label: '湿度', value: displayValue(metrics.humi), wide: false },
  { key: 'co2', label: '二氧化碳', value: displayValue(metrics.co2), wide: false },
  { key: 'water', label: '含水量', value: displayValue(metrics.water), wide: false },
  { key: 'windSpeed', label: '风速', value: displayValue(metrics.windSpeed), wide: true },
])

const statusCards = computed(() => [
  { key: 'led', label: '灯光', state: status.led, wide: false },
  { key: 'beep', label: '蜂鸣器', state: status.beep, wide: false },
  { key: 'wet', label: '加湿', state: status.wet, wide: false },
  { key: 'fan', label: '除湿', state: status.fan, wide: false },
  { key: 'hot', label: '加热模块', state: status.hot, wide: true },
])

const thresholdRows = [
  { key: 'temp', label: '温度', identifier: 'temp_T' },
  { key: 'humi', label: '湿度', identifier: 'humi_T' },
  { key: 'co2', label: 'CO2', identifier: 'CO2_T' },
  { key: 'waterUpper', label: '含水上限', identifier: 'water_T' },
  { key: 'waterLower', label: '含水下限', identifier: 'water_F' },
] as const satisfies ReadonlyArray<{
  key: ThresholdFieldKey
  label: string
  identifier: string
}>

function thresholdPlaceholder(key: ThresholdFieldKey) {
  const currentValue = thresholds[key]

  if (currentValue) {
    return `当前 ${currentValue}`
  }

  if (key === 'waterUpper') {
    return '输入上限'
  }

  if (key === 'waterLower') {
    return '输入下限'
  }

  return '输入阈值'
}

async function handleSend(key: ThresholdFieldKey, identifier: string) {
  const success = await sendThreshold(identifier, form[key], key)

  if (success) {
    form[key] = ''
  }
}
</script>

<style lang="scss">
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, $ciga-bg-top 0%, $ciga-bg-bottom 100%);
}

.frame {
  width: 100%;
  max-width: 690rpx;
  margin: 0 auto;
}

.header-card,
.section-card {
  border: 2rpx solid $ciga-border;
  box-shadow: 0 20rpx 50rpx rgba(76, 53, 35, 0.08);
}

.header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
  padding: 30rpx 34rpx;
  border-color: rgba(109, 79, 59, 0.08);
  border-radius: 48rpx;
  background: $ciga-primary;
}

.header-card__title {
  color: #fff8ec;
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.header-card__meta {
  display: flex;
  align-items: center;
}

.header-card__dot {
  width: 14rpx;
  height: 14rpx;
  margin-right: 10rpx;
  border-radius: 999rpx;
  background: rgba(234, 215, 191, 0.45);
}

.header-card__dot--active {
  background: #f7efe2;
  box-shadow: 0 0 0 10rpx rgba(247, 239, 226, 0.14);
}

.header-card__status {
  color: #ead7bf;
  font-size: 24rpx;
}

.section-card {
  margin-bottom: 18rpx;
  padding: 20rpx;
  border-radius: 36rpx;
  background: $ciga-panel;
}

.section-card__title {
  display: block;
  margin-bottom: 14rpx;
  color: #442f24;
  font-size: 30rpx;
  font-weight: 700;
}

.metric-grid,
.status-grid {
  display: flex;
  flex-wrap: wrap;
  margin: -6rpx;
}

.metric-card,
.status-card {
  width: calc(50% - 12rpx);
  margin: 6rpx;
  padding: 20rpx;
  border: 2rpx solid $ciga-border;
  border-radius: 28rpx;
  background: $ciga-panel-inner;
}

.metric-card--wide,
.status-card--wide {
  width: calc(100% - 12rpx);
}

.metric-card {
  min-height: 138rpx;
}

.metric-card__label {
  display: block;
  margin-bottom: 20rpx;
  color: $ciga-text-subtle;
  font-size: 24rpx;
}

.metric-card__value {
  color: $ciga-text-main;
  font-size: 42rpx;
  font-weight: 700;
  line-height: 1.1;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 92rpx;
}

.status-card__label {
  flex: 1;
  padding-right: 12rpx;
  color: #4b3528;
  font-size: 25rpx;
  font-weight: 700;
}

.status-pill {
  min-width: 98rpx;
  height: 48rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-pill__text {
  color: #fff9f0;
  font-size: 22rpx;
  font-weight: 700;
}

.threshold-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.threshold-row:last-child {
  margin-bottom: 0;
}

.threshold-row__label {
  width: 132rpx;
  color: #5d4332;
  font-size: 25rpx;
  font-weight: 700;
}

.threshold-row__input-wrap {
  flex: 1;
  height: 76rpx;
  padding: 0 24rpx;
  border: 2rpx solid $ciga-border;
  border-radius: 24rpx;
  background: $ciga-panel-inner;
  display: flex;
  align-items: center;
}

.threshold-row__input {
  width: 100%;
  height: 100%;
  color: $ciga-text-main;
  font-size: 26rpx;
}

.threshold-row__placeholder {
  color: $ciga-text-muted;
  font-size: 26rpx;
}

.threshold-row__button {
  width: 118rpx;
  height: 76rpx;
  margin-left: 12rpx;
  border-radius: 24rpx;
  background: $ciga-primary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.threshold-row__button--active {
  background: $ciga-primary-dark;
}

.threshold-row__button--disabled {
  background: rgba(109, 79, 59, 0.6);
}

.threshold-row__button-text {
  color: #fff8ec;
  font-size: 25rpx;
  font-weight: 700;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  max-width: calc(100vw - 96rpx);
  padding: 18rpx 28rpx;
  border-radius: 30rpx;
  background: rgba(60, 44, 32, 0.95);
  box-shadow: 0 18rpx 36rpx rgba(60, 44, 32, 0.18);
}

.toast__text {
  color: #fff7ea;
  font-size: 28rpx;
  font-weight: 700;
}
</style>
