import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'

type MetricState = {
  temp: string
  humi: string
  co2: string
  water: string
  windSpeed: string
}

type StatusState = {
  led: string
  beep: string
  wet: string
  fan: string
  hot: string
}

export type ThresholdFieldKey = 'temp' | 'humi' | 'co2' | 'waterUpper' | 'waterLower'

type ThresholdState = Record<ThresholdFieldKey, string>

type QueryItem = {
  identifier?: string
  value?: string | number | null
}

type QueryResponse = {
  ok?: boolean
  data?: {
    code?: number
    msg?: string
    data?: QueryItem[]
  }
}

type SetResponse = {
  ok?: boolean
  data?: {
    code?: number
    msg?: string
  }
}

const BASE_URL = 'https://bwmd.net/api'
const DEV_PROXY_BASE_URL = '/onenet-api'
const USER_ID = '446693'
const ACCESS_KEY = 'T4EGDKlz4gxrZeceL4GeEUzO3grpBzHVtgeCdftnG7BRo+cl2ae4eSMQ95xdkSF9'
const PRODUCT_ID = 'Fd7DJI1lcQ'
const DEVICE_NAME = 'cigarettes_and_tobacco'
const POLL_INTERVAL = 3000

function buildHeaders(contentType?: string) {
  const headers: Record<string, string> = {
    'X-OneNET-User-Id': USER_ID,
    'X-OneNET-Access-Key': ACCESS_KEY,
  }

  if (contentType) {
    headers['content-type'] = contentType
  }

  return headers
}

function buildUrl(path: string) {
  return `${getApiBaseUrl()}${path}?product_id=${PRODUCT_ID}&device_name=${DEVICE_NAME}`
}

function getApiBaseUrl() {
  // #ifdef H5
  if (import.meta.env.DEV) {
    return DEV_PROXY_BASE_URL
  }
  // #endif
  return BASE_URL
}

function request<T>(options: UniApp.RequestOptions) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      ...options,
      success: (response) => resolve(response.data as T),
      fail: reject,
    })
  })
}

function toText(value: QueryItem['value']) {
  return value === null || value === undefined ? '' : String(value)
}

function toStatus(value: string, activeText: string, inactiveText: string) {
  if (!value) {
    return '--'
  }

  return value === '1' ? activeText : inactiveText
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'errMsg' in error && typeof error.errMsg === 'string') {
    return error.errMsg
  }

  return '网络请求失败'
}

export function useDeviceController() {
  const metrics = reactive<MetricState>({
    temp: '',
    humi: '',
    co2: '',
    water: '',
    windSpeed: '',
  })

  const status = reactive<StatusState>({
    led: '--',
    beep: '--',
    wet: '--',
    fan: '--',
    hot: '--',
  })

  const thresholds = reactive<ThresholdState>({
    temp: '',
    humi: '',
    co2: '',
    waterUpper: '',
    waterLower: '',
  })

  const loading = ref(false)
  const toastMessage = ref('参数已下发')
  const toastVisible = ref(false)
  const sendingField = ref<ThresholdFieldKey | ''>('')

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null
  let queryInFlight = false

  function clearToastTimer() {
    if (toastTimer !== null) {
      clearTimeout(toastTimer)
      toastTimer = null
    }
  }

  function showToast(message: string) {
    toastMessage.value = message
    toastVisible.value = true
    clearToastTimer()
    toastTimer = setTimeout(() => {
      toastVisible.value = false
      toastTimer = null
    }, 1500)
  }

  function applyQueryPayload(payload: QueryResponse) {
    if (!payload.ok || payload.data?.code !== 0 || !Array.isArray(payload.data?.data)) {
      throw new Error(payload.data?.msg || '接口返回异常')
    }

    const state = new Map<string, string>()

    payload.data.data.forEach((item) => {
      if (item.identifier) {
        state.set(item.identifier, toText(item.value))
      }
    })

    metrics.temp = state.get('temp') ?? ''
    metrics.humi = state.get('humi') ?? ''
    metrics.co2 = state.get('CO2') ?? ''
    metrics.water = state.get('water') ?? ''
    metrics.windSpeed = state.get('wind_speed') ?? ''

    status.led = toStatus(state.get('LED') ?? '', '开启', '关闭')
    status.beep = toStatus(state.get('BEEP') ?? '', '开启', '关闭')
    status.wet = toStatus(state.get('WET') ?? '', '运行', '关闭')
    status.fan = toStatus(state.get('FAN') ?? '', '运行', '关闭')
    status.hot = toStatus(state.get('HOT') ?? '', '开启', '关闭')

    thresholds.temp = state.get('temp_T') ?? ''
    thresholds.humi = state.get('humi_T') ?? ''
    thresholds.co2 = state.get('CO2_T') ?? ''
    thresholds.waterUpper = state.get('water_T') ?? ''
    thresholds.waterLower = state.get('water_F') ?? ''
  }

  async function refresh() {
    if (queryInFlight) {
      return false
    }

    queryInFlight = true
    loading.value = true

    try {
      const payload = await request<QueryResponse>({
        url: buildUrl('/query'),
        method: 'GET',
        header: buildHeaders(),
      })

      applyQueryPayload(payload)
      return true
    } catch (error) {
      console.warn('Query failed:', error)
      return false
    } finally {
      queryInFlight = false
      loading.value = false
    }
  }

  async function sendThreshold(identifier: string, value: string, field: ThresholdFieldKey) {
    const trimmed = value.trim()

    if (!trimmed) {
      showToast('请先输入阈值')
      return false
    }

    if (!/^\d+$/.test(trimmed)) {
      showToast('下发值必须是整数')
      return false
    }

    if (sendingField.value) {
      showToast('请等待当前请求完成')
      return false
    }

    sendingField.value = field

    try {
      const payload = await request<SetResponse>({
        url: buildUrl('/set'),
        method: 'POST',
        header: buildHeaders('application/json'),
        data: {
          params: {
            [identifier]: Number(trimmed),
          },
        },
      })

      if (!payload.ok || payload.data?.code !== 0) {
        showToast(`下发失败：${payload.data?.msg || '接口返回异常'}`)
        return false
      }

      showToast('参数已下发')
      await refresh()
      return true
    } catch (error) {
      showToast(`下发失败：${errorMessage(error)}`)
      return false
    } finally {
      sendingField.value = ''
    }
  }

  function stateColor(value: string) {
    if (value === '开启' || value === '运行') {
      return '#3f8750'
    }

    if (value === '待机') {
      return '#ab8740'
    }

    return '#8a5b50'
  }

  function displayValue(value: string) {
    return value || '--'
  }

  function startPolling() {
    if (pollTimer !== null) {
      return
    }

    void refresh()
    pollTimer = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  onMounted(() => {
    startPolling()
  })

  onShow(() => {
    startPolling()
  })

  onHide(() => {
    stopPolling()
  })

  onUnload(() => {
    stopPolling()
  })

  onUnmounted(() => {
    stopPolling()
    clearToastTimer()
  })

  return {
    metrics,
    status,
    thresholds,
    loading,
    toastMessage,
    toastVisible,
    sendingField,
    refresh,
    sendThreshold,
    stateColor,
    displayValue,
  }
}
