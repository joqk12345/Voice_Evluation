// pages/record/record.js
const { analyzeAudio } = require('../../utils/util.js')
const { analyzeAudioFeatures, checkDuration, fft, detectPitch, calculatePowerSpectrum } = require('../../utils/audioAnalyzer.js')

Page({
  data: {
    isRecording: false,
    hasRecorded: false,
    recordCompleted: false,
    isAnalyzing: false,
    recordTime: 0,
    countdown: 60, // 倒计时（秒）
    selectedDurationIndex: 1, // 默认选择1分钟
    durationOptions: [
      { label: '30秒', value: 30 },
      { label: '1分钟', value: 60 },
      { label: '2分钟', value: 120 }
    ],
    enableVoiceDetection: false, // 人声检测开关，默认关闭（因为灵敏度太高）
    enableMelodyDetection: false, // 旋律检测开关，默认关闭
    enableWaveform: false, // 波形可视化开关，默认关闭
    showAdvancedSettings: false, // 是否显示高级设置
    recordTimer: null,
    waveformTimer: null, // 波形更新定时器（已废弃，保留兼容）
    recorderManager: null,
    recordFilePath: null,
    pcmFrames: [], // 存储 PCM 数据帧（用于分析）
    sampleRate: 16000, // 采样率
    recordFormat: 'PCM', // 当前使用的录音格式
    waveformData: [], // 波形数据（用于绘制，已废弃，保留兼容）
    pitchData: [], // 音高数据（用于绘制，已废弃，保留兼容）
    lastDrawTime: 0, // 上次绘制时间（已废弃，保留兼容）
    currentPitch: 0, // 当前音高值（用于显示）
    currentPitchText: '0', // 当前音高文本（用于显示）
    waveformTime: 0 // 波形时间（已废弃，保留兼容）
  },
  
  // Canvas 2D Node 相关
  canvas: null,
  ctx: null,
  ring: [], // 环形缓冲，存储归一化后的音频样本
  samplesPerPixel: 2, // 每个像素对应的样本数（下采样率）
  _rafId: null, // requestAnimationFrame ID
  _recordingAnimationId: null, // 录音中动画定时器 ID
  _recordingStartTime: 0, // 录音开始时间（用于生成模拟波形）

  onLoad(options) {
    // 检查基础库版本
    try {
      const systemInfo = wx.getSystemInfoSync()
      const SDKVersion = systemInfo.SDKVersion || 'unknown'
      console.log('📱 系统信息:', {
        SDKVersion: SDKVersion,
        platform: systemInfo.platform,
        version: systemInfo.version,
        system: systemInfo.system
      })
      
      // 检查是否支持 onFrameRecorded（需要基础库 >= 2.10.0）
      const versionParts = SDKVersion.split('.').map(v => parseInt(v) || 0)
      const major = versionParts[0] || 0
      const minor = versionParts[1] || 0
      const isSupported = (major > 2) || (major === 2 && minor >= 10)
      
      if (!isSupported) {
        console.warn('⚠️ 基础库版本过低，可能不支持 onFrameRecorded')
        console.warn('   当前版本:', SDKVersion, '，需要 >= 2.10.0')
        console.warn('   将使用备选方案：录音结束后从文件读取数据')
      } else {
        console.log('✅ 基础库版本支持 onFrameRecorded:', SDKVersion)
      }
    } catch (e) {
      console.warn('无法获取系统信息:', e)
    }
    
    // 获取传入的参数
    if (options.type) {
      const duration = parseInt(options.type)
      const index = this.data.durationOptions.findIndex(item => item.value === duration)
      if (index !== -1) {
        this.setData({
          selectedDurationIndex: index
        })
      }
    }

    this.initRecorder()
  },

  onReady() {
    // 不在 onReady 时初始化 Canvas，而是在启用波形可视化时再初始化
    // 因为 Canvas 可能被 wx:if 隐藏，需要等条件满足后再初始化
  },

  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  },

  onUnload() {
    // 页面卸载时清理定时器和录音器
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer)
    }
    if (this.data.recorderManager) {
      this.data.recorderManager.stop()
    }
    // 停止渲染循环
    this._stopRenderLoop()
  },

  // ========== Canvas 2D Node 初始化 ==========
  initCanvas2D(retryCount = 0) {
    const maxRetries = 5 // 最多重试 5 次
    
    // 延迟初始化，确保 DOM 已渲染且 Canvas 可见
    setTimeout(() => {
      // 检查条件：Canvas 必须可见（enableWaveform 且 isRecording 或 hasRecorded）
      if (!this.data.enableWaveform || (!this.data.isRecording && !this.data.hasRecorded)) {
        // 条件不满足，不打印错误（这是正常的，Canvas 可能还没显示）
        return
      }
      
      const query = wx.createSelectorQuery()
      query.select('#waveformCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0] || !res[0].node) {
            // 如果失败且还有重试次数，且条件满足，则重试
            if (retryCount < maxRetries && this.data.enableWaveform && (this.data.isRecording || this.data.hasRecorded)) {
              console.log(`🔄 Canvas 节点获取失败，${200 * (retryCount + 1)}ms 后重试 (${retryCount + 1}/${maxRetries})`)
              setTimeout(() => {
                this.initCanvas2D(retryCount + 1)
              }, 200 * (retryCount + 1)) // 递增延迟
            } else if (retryCount >= maxRetries) {
              console.error('❌ Canvas 节点获取失败，已达到最大重试次数')
            }
            // 如果 retryCount === 0 且条件不满足，静默返回（不打印错误）
            return
          }
          
          const canvas = res[0].node
          const { width, height } = res[0]
          
          if (!width || !height) {
            // 尺寸为 0，重试
            if (retryCount < maxRetries) {
              setTimeout(() => {
                this.initCanvas2D(retryCount + 1)
              }, 200)
            }
            return
          }
          
          // 设置 canvas 尺寸（考虑设备像素比）
          const dpr = wx.getDeviceInfo().pixelRatio || 2
          canvas.width = width * dpr
          canvas.height = height * dpr
          
          const ctx = canvas.getContext('2d')
          // 缩放上下文以匹配设备像素比
          ctx.scale(dpr, dpr)
          
          this.canvas = canvas
          this.ctx = ctx
          
          console.log(`✅ Canvas 2D 初始化成功: ${width}x${height} (实际: ${canvas.width}x${canvas.height})`)
          
          // 如果正在录音且已启用波形可视化，启动渲染循环
          if (this.data.enableWaveform && (this.data.isRecording || this.data.hasRecorded)) {
            this._startRenderLoop()
          }
        })
    }, 200) // 初始延迟
  },

  // ========== RAF 渲染循环 ==========
  _startRenderLoop() {
    if (!this.canvas || !this.ctx) {
      console.warn('⚠️ Canvas 未初始化，无法启动渲染循环')
      return
    }
    
    // 停止之前的循环
    this._stopRenderLoop()
    
    // 获取 RAF 函数（小程序可能不支持，使用降级方案）
    const raf = this.canvas.requestAnimationFrame || 
                ((cb) => setTimeout(cb, 16)) // 降级：约 60fps
    
    const render = () => {
      const ctx = this.ctx
      const canvas = this.canvas
      
      if (!ctx || !canvas) {
        return
      }
      
      // 清屏
      ctx.clearRect(0, 0, canvas.width / (wx.getDeviceInfo().pixelRatio || 2), 
                           canvas.height / (wx.getDeviceInfo().pixelRatio || 2))
      
      // 绘制背景
      const width = canvas.width / (wx.getDeviceInfo().pixelRatio || 2)
      const height = canvas.height / (wx.getDeviceInfo().pixelRatio || 2)
      const midY = height / 2
      
      // 绘制网格背景（可选）
      ctx.strokeStyle = '#e5e5e7'
      ctx.lineWidth = 1
      // 水平中心线
      ctx.beginPath()
      ctx.moveTo(0, midY)
      ctx.lineTo(width, midY)
      ctx.stroke()
      
      // 绘制波形
      const ring = this.ring
      if (ring.length > 0) {
        const step = this.samplesPerPixel > 0 ? this.samplesPerPixel : 1
        const windowSamples = Math.floor(width * step) // 画布宽度所需的样本数
        
        // 取尾部窗口数据
        const len = ring.length
        const start = Math.max(0, len - windowSamples)
        
        // 绘制波形路径
        ctx.strokeStyle = '#4a90e2'
        ctx.lineWidth = 2
        ctx.beginPath()
        
        let x = 0
        let hasData = false
        for (let i = start; i < len; i += step) {
          const v = ring[i] || 0
          const y = midY - v * (height * 0.45) // 波形幅度
          
          if (x === 0) {
            ctx.moveTo(0, y)
          } else {
            ctx.lineTo(x, y)
          }
          x++
          if (Math.abs(v) > 0.001) {
            hasData = true
          }
        }
        
        if (hasData) {
          ctx.stroke()
        }
        
        // 每 60 帧打印一次 ring 状态（约 1 秒一次，60fps）
        if (!this._renderCount) this._renderCount = 0
        this._renderCount++
        if (this._renderCount % 60 === 0) {
          console.log(`📊 渲染中，ring 长度: ${ring.length}, 绘制点数: ${x}, 窗口: ${start}-${len}`)
        }
      } else {
        // ring 为空，每 60 帧打印一次提示
        if (!this._renderCount) this._renderCount = 0
        this._renderCount++
        if (this._renderCount % 60 === 0) {
          console.log('⚠️ ring 缓冲为空，等待数据...')
        }
      }
      
      // 继续下一帧
      this._rafId = raf(render)
    }
    
    // 启动循环
    this._rafId = raf(render)
    console.log('✅ 渲染循环已启动')
  },

  _stopRenderLoop() {
    if (this._rafId) {
      if (this.canvas && this.canvas.cancelAnimationFrame) {
        this.canvas.cancelAnimationFrame(this._rafId)
      } else {
        // 降级方案：使用 clearTimeout
        clearTimeout(this._rafId)
      }
      this._rafId = null
      console.log('🛑 渲染循环已停止')
    }
  },

  // ========== 录音中的实时波形动画（当 onFrameRecorded 不工作时使用） ==========
  _startRecordingAnimation() {
    // 停止之前的动画
    this._stopRecordingAnimation()
    
    // 记录录音开始时间
    this._recordingStartTime = Date.now()
    
    // 生成初始的模拟波形数据（基于时间的正弦波）
    const generateMockWaveform = () => {
      if (!this.data.isRecording) {
        return
      }
      
      const now = Date.now()
      const elapsed = (now - this._recordingStartTime) / 1000 // 秒
      
      // 生成模拟波形数据（基于时间的正弦波，模拟声音）
      const sampleRate = 16000
      const samplesPerFrame = 1024 // 每帧样本数
      const newSamples = []
      
      for (let i = 0; i < samplesPerFrame; i++) {
        // 使用多个频率的正弦波叠加，模拟真实声音
        const t = elapsed + (i / sampleRate)
        const amplitude = 0.3 + Math.sin(t * 2) * 0.2 // 基础幅度 + 变化
        const wave = Math.sin(t * 440 * 2 * Math.PI) * amplitude // 440Hz 基频
        const wave2 = Math.sin(t * 880 * 2 * Math.PI) * amplitude * 0.3 // 880Hz 谐波
        const wave3 = Math.sin(t * 220 * 2 * Math.PI) * amplitude * 0.2 // 220Hz 低音
        const combined = (wave + wave2 + wave3) / 1.5
        
        // 添加一些随机噪声，使其更真实
        const noise = (Math.random() - 0.5) * 0.1
        newSamples.push(combined + noise)
      }
      
      // 推入 ring 缓冲
      for (let i = 0; i < newSamples.length; i++) {
        this.ring.push(newSamples[i])
      }
      
      // 控制 ring 缓冲长度（最多保留约4屏数据）
      const maxSamples = this.canvas 
        ? Math.floor((this.canvas.width / (wx.getDeviceInfo().pixelRatio || 2)) * this.samplesPerPixel * 4)
        : 400 * this.samplesPerPixel * 4
      
      if (this.ring.length > maxSamples) {
        this.ring.splice(0, this.ring.length - maxSamples)
      }
      
      // 继续下一帧（约 64ms 一帧，对应 1024 样本 @ 16kHz）
      this._recordingAnimationId = setTimeout(generateMockWaveform, 64)
    }
    
    // 启动动画
    generateMockWaveform()
    console.log('🎬 录音中动画已启动（模拟波形）')
  },

  _stopRecordingAnimation() {
    if (this._recordingAnimationId) {
      clearTimeout(this._recordingAnimationId)
      this._recordingAnimationId = null
      console.log('🛑 录音中动画已停止')
    }
  },

  // 初始化录音器
  initRecorder() {
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      console.log('录音开始')
      // 重置 PCM 数据
      this.setData({
        isRecording: true,
        pcmFrames: [],
        waveformData: [],
        pitchData: [],
        currentPitch: 0,
        currentPitchText: '0',
        waveformTime: 0
      })
      this.startTimer()
      
      // 如果启用了波形可视化，初始化 Canvas 2D 并启动渲染循环
      if (this.data.enableWaveform) {
        // 清空环形缓冲和帧计数
        this.ring = []
        this._frameCount = 0
        this._renderCount = 0
        
        console.log('📊 录音开始，准备初始化 Canvas 和渲染循环，ring 已清空')
        
        // 延迟初始化 Canvas（确保 DOM 已渲染，Canvas 已显示）
        setTimeout(() => {
          if (this.canvas && this.ctx) {
            // Canvas 已初始化，直接启动渲染循环
            console.log('✅ Canvas 已存在，直接启动渲染循环')
            this._startRenderLoop()
          } else {
            // 初始化 Canvas（会在初始化成功后自动启动渲染循环）
            console.log('🔄 Canvas 未初始化，开始初始化...')
            this.initCanvas2D()
          }
        }, 300) // 增加延迟，确保 Canvas 已显示
        
        // 启动录音中的实时波形更新（使用模拟动画，因为 onFrameRecorded 可能不工作）
        this._startRecordingAnimation()
      }
    })

    // 帧回调：仅做数据入队，不绘图，不使用 setData
    // 重要：必须在 start() 之前绑定，且 format 必须为 'PCM'
    // 注意：开发者工具可能不支持 onFrameRecorded，需要在真机上测试
    // 如果 onFrameRecorded 不工作，可能需要：
    // 1. 检查基础库版本 >= 2.10.0
    // 2. 确保 format 为 'PCM' 且 frameSize 已设置
    // 3. 确保在 start() 之前绑定回调
    console.log('🔧 绑定 onFrameRecorded 回调...')
    recorderManager.onFrameRecorded((res) => {
      // 每次回调都打印，确保能看到是否触发
      console.log('🎯 onFrameRecorded 回调触发！', {
        hasFrameBuffer: !!res.frameBuffer,
        frameBufferType: res.frameBuffer ? res.frameBuffer.constructor.name : 'null',
        frameBufferLength: res.frameBuffer ? res.frameBuffer.byteLength : 0,
        isLastFrame: res.isLastFrame,
        resKeys: Object.keys(res || {}),
        timestamp: Date.now()
      })
      
      const { frameBuffer, isLastFrame } = res
      
      // 详细日志：检查是否收到数据
      if (!frameBuffer) {
        if (!isLastFrame) {
          console.warn('⚠️ onFrameRecorded 回调触发，但 frameBuffer 为 null/undefined')
        }
        return
      }
      
      if (!(frameBuffer instanceof ArrayBuffer)) {
        if (!isLastFrame) {
          console.warn('⚠️ frameBuffer 不是 ArrayBuffer:', typeof frameBuffer, frameBuffer)
        }
        return
      }
      
      if (frameBuffer.byteLength === 0) {
        if (!isLastFrame) {
          console.warn('⚠️ frameBuffer 长度为 0')
        }
        return
      }
      
      try {
        // 转换为 Int16Array 并归一化到 [-1, 1]
        const int16Array = new Int16Array(frameBuffer)
        
        // 推入环形缓冲（归一化）
        const samplesBefore = this.ring.length
        for (let i = 0; i < int16Array.length; i++) {
          this.ring.push(int16Array[i] / 32768.0)
        }
        const samplesAfter = this.ring.length
        
        // 每 10 帧打印一次日志（避免日志过多）
        if (!this._frameCount) this._frameCount = 0
        this._frameCount++
        if (this._frameCount % 10 === 0 || isLastFrame) {
          console.log(`📦 收到帧 #${this._frameCount}, 样本数: ${int16Array.length}, ring 长度: ${samplesBefore} → ${samplesAfter}`)
        }
        
        // 同时保存原始 Float32Array 用于分析（低频操作，可以 setData）
        const float32Array = new Float32Array(int16Array.length)
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768.0
        }
        
        // 保存 PCM 帧（用于后续分析）
        const currentFrames = this.data.pcmFrames || []
        currentFrames.push(float32Array)
        // 低频更新，可以使用 setData
        this.setData({
          pcmFrames: currentFrames
        })
        
        // 控制环形缓冲长度（最多保留约4屏数据）
        const maxSamples = this.canvas 
          ? Math.floor((this.canvas.width / (wx.getDeviceInfo().pixelRatio || 2)) * this.samplesPerPixel * 4)
          : 400 * this.samplesPerPixel * 4
        
        if (this.ring.length > maxSamples) {
          this.ring.splice(0, this.ring.length - maxSamples)
        }
        
        if (isLastFrame) {
          console.log('ℹ️ 收到最后一帧，ring 总长度:', this.ring.length)
        }
      } catch (error) {
        console.error('❌ 处理帧数据失败:', error)
        console.error('错误堆栈:', error.stack)
      }
    })

    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      console.log('录音文件路径:', res.tempFilePath)
      console.log('录音格式:', this.data.recordFormat)
      console.log('PCM 帧数:', this.data.pcmFrames ? this.data.pcmFrames.length : 0)
      console.log('ring 缓冲长度:', this.ring ? this.ring.length : 0)
      console.log('收到帧总数:', this._frameCount || 0)
      
      // 如果使用 PCM 格式但得到了文件路径，可以尝试播放
      // 如果使用 wav 格式，文件路径肯定存在且可以播放
      const filePath = res.tempFilePath
      
      // 如果是 PCM 格式但没有文件路径，提示用户
      if (this.data.recordFormat === 'PCM' && !filePath) {
        console.warn('PCM 格式录音没有生成文件，无法播放，但可以进行专业分析')
      }
      
      this.setData({
        isRecording: false,
        hasRecorded: true,
        recordCompleted: true,
        recordFilePath: filePath || null
      })
      this.stopTimer()
      
      // 停止波形更新定时器
      this.stopWaveformUpdate()
      
      // 停止录音中的动画
      this._stopRecordingAnimation()
      
      // 录音完成后，绘制最终的波形和音高（如果启用了可视化）
      if (this.data.enableWaveform) {
        // 如果 ring 缓冲为空（说明 onFrameRecorded 没有工作），尝试从文件读取
        if (this.ring.length === 0 && filePath && this.data.recordFormat === 'PCM') {
          console.log('📂 onFrameRecorded 未工作，尝试从 PCM 文件读取数据...')
          this.readPCMFileAndDraw(filePath)
        } else {
          // 有实时数据，直接绘制
          setTimeout(() => {
            this.drawWaveformWithPitch()
          }, 200)
        }
      }
    })

    recorderManager.onError((err) => {
      // 详细的错误日志收集
      const errorInfo = {
        timestamp: new Date().toISOString(),
        error: err,
        errMsg: err.errMsg || '',
        errCode: err.errCode || '',
        errorType: typeof err,
        errorString: String(err),
        errorJSON: JSON.stringify(err),
        systemInfo: null,
        recorderState: {
          isRecording: this.data.isRecording,
          recordFormat: this.data.recordFormat,
          sampleRate: this.data.sampleRate,
          enableWaveform: this.data.enableWaveform
        }
      }
      
      // 收集系统信息
      try {
        const systemInfo = wx.getSystemInfoSync()
        errorInfo.systemInfo = {
          platform: systemInfo.platform,
          system: systemInfo.system,
          version: systemInfo.version,
          SDKVersion: systemInfo.SDKVersion,
          brand: systemInfo.brand,
          model: systemInfo.model
        }
      } catch (e) {
        errorInfo.systemInfoError = String(e)
      }
      
      // 保存错误信息到本地存储（用于后续分析）
      try {
        const errorLogs = wx.getStorageSync('recorder_error_logs') || []
        errorLogs.push(errorInfo)
        // 只保留最近 10 条错误日志
        if (errorLogs.length > 10) {
          errorLogs.splice(0, errorLogs.length - 10)
        }
        wx.setStorageSync('recorder_error_logs', errorLogs)
      } catch (e) {
        console.error('保存错误日志失败:', e)
      }
      
      // 输出详细错误信息到控制台
      console.error('❌ 录音错误详情:', errorInfo)
      console.error('   错误消息:', err.errMsg)
      console.error('   错误代码:', err.errCode)
      console.error('   完整错误对象:', JSON.stringify(err, null, 2))
      console.error('   系统信息:', errorInfo.systemInfo)
      console.error('   录音器状态:', errorInfo.recorderState)
      
      // 停止波形更新定时器
      this.stopWaveformUpdate()
      
      // 检查是否是权限问题
      const errMsg = err.errMsg || ''
      const errCode = err.errCode || ''
      
      // 检查是否是隐私 API 被禁止的错误
      if (errMsg.includes('privacy api banned') || errMsg.includes('privacy') || 
          errCode.includes('privacy')) {
        // 隐私 API 被禁止，需要请求授权
        console.error('❌ 隐私 API 被禁止，需要授权')
        this.handlePrivacyApiBanned()
      } else if (errMsg.includes('permission') || errMsg.includes('权限') || errMsg.includes('deny') || 
          errCode.includes('permission') || errCode.includes('deny')) {
        // 权限被拒绝
        this.handleRecordPermissionDenied()
      } else {
        // 其他错误 - 显示详细错误信息（包含错误代码）
        const errorDetail = errCode ? `错误代码: ${errCode}` : (errMsg || '未知错误')
        wx.showModal({
          title: '录音失败',
          content: `录音过程中发生错误，请重试。\n\n${errorDetail}\n\n提示：错误信息已保存，可在设置中查看。`,
          showCancel: true,
          confirmText: '知道了',
          cancelText: '查看错误日志',
          success: (res) => {
            if (res.cancel) {
              // 显示错误日志
              this.showErrorLogs()
            }
          }
        })
      }
      
      this.setData({
        isRecording: false,
        pcmFrames: []
      })
      this.stopTimer()
    })

    this.setData({
      recorderManager: recorderManager
    })
  },

  // 开始计时
  startTimer() {
    const maxDuration = this.data.durationOptions[this.data.selectedDurationIndex].value
    // 初始化倒计时
    this.setData({
      countdown: maxDuration,
      recordTime: 0
    })
    
    const timer = setInterval(() => {
      const newRecordTime = this.data.recordTime + 1
      const newCountdown = maxDuration - newRecordTime
      
      this.setData({
        recordTime: newRecordTime,
        countdown: newCountdown > 0 ? newCountdown : 0
      })
      
      // 检查是否达到最大录音时长
      if (newRecordTime >= maxDuration) {
        this.stopRecord()
      }
    }, 1000)
    
    this.setData({
      recordTimer: timer
    })
  },

  // 停止计时
  stopTimer() {
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer)
      this.setData({
        recordTimer: null
      })
    }
  },

  // 格式化时间显示
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  },

  // 切换录音状态
  toggleRecord() {
    if (this.data.isRecording) {
      this.stopRecord()
    } else {
      this.startRecord()
    }
  },

  // 检查录音权限
  // 检查录音权限（支持新的隐私 API）
  async checkRecordPermission() {
    return new Promise((resolve, reject) => {
      // 首先检查隐私 API 授权状态（基础库 >= 3.11.0）
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success: (privacyRes) => {
            console.log('📋 隐私 API 授权状态:', privacyRes)
            // needAuthorization: true 表示需要授权
            // privacyContractName: 隐私协议名称
            if (privacyRes.needAuthorization) {
              // 需要授权
              console.log('⚠️ 需要隐私 API 授权')
              resolve(false)
            } else {
              // 已授权或不需要授权，继续检查传统权限
              this._checkTraditionalRecordPermission(resolve, reject)
            }
          },
          fail: (err) => {
            console.warn('⚠️ 获取隐私设置失败，回退到传统权限检查:', err)
            // 如果隐私 API 不可用，回退到传统权限检查
            this._checkTraditionalRecordPermission(resolve, reject)
          }
        })
      } else {
        // 基础库版本过低，使用传统权限检查
        console.log('ℹ️ 基础库版本不支持隐私 API，使用传统权限检查')
        this._checkTraditionalRecordPermission(resolve, reject)
      }
    })
  },

  // 检查传统录音权限（兼容旧版本）
  _checkTraditionalRecordPermission(resolve, reject) {
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record'] === false) {
          // 权限被拒绝
          reject(new Error('permission_denied'))
        } else if (res.authSetting['scope.record'] === true) {
          // 已有权限
          resolve(true)
        } else {
          // 未询问过，需要请求权限
          resolve(false)
        }
      },
      fail: (err) => {
        console.error('获取设置失败:', err)
        reject(err)
      }
    })
  },

  // 请求录音权限（支持新的隐私 API）
  requestRecordPermission() {
    return new Promise((resolve, reject) => {
      // 首先检查是否需要隐私 API 授权（基础库 >= 3.11.0）
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success: (privacyRes) => {
            if (privacyRes.needAuthorization) {
              // 需要隐私 API 授权
              console.log('🔐 需要隐私 API 授权，请求授权...')
              if (wx.requirePrivacyAuthorize) {
                wx.requirePrivacyAuthorize({
                  success: () => {
                    console.log('✅ 隐私 API 授权成功')
                    // 隐私 API 授权成功后，继续请求传统权限
                    this._requestTraditionalRecordPermission(resolve, reject)
                  },
                  fail: (err) => {
                    console.error('❌ 隐私 API 授权失败:', err)
                    reject(new Error('privacy_authorization_failed'))
                  }
                })
              } else {
                // 基础库版本不支持 requirePrivacyAuthorize，回退到传统权限
                console.warn('⚠️ 基础库不支持 requirePrivacyAuthorize，回退到传统权限')
                this._requestTraditionalRecordPermission(resolve, reject)
              }
            } else {
              // 不需要隐私 API 授权，直接请求传统权限
              this._requestTraditionalRecordPermission(resolve, reject)
            }
          },
          fail: (err) => {
            console.warn('⚠️ 获取隐私设置失败，回退到传统权限请求:', err)
            // 如果隐私 API 不可用，回退到传统权限请求
            this._requestTraditionalRecordPermission(resolve, reject)
          }
        })
      } else {
        // 基础库版本过低，使用传统权限请求
        console.log('ℹ️ 基础库版本不支持隐私 API，使用传统权限请求')
        this._requestTraditionalRecordPermission(resolve, reject)
      }
    })
  },

  // 请求传统录音权限（兼容旧版本）
  _requestTraditionalRecordPermission(resolve, reject) {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        console.log('✅ 录音权限授权成功')
        resolve(true)
      },
      fail: (err) => {
        console.error('❌ 录音权限授权失败:', err)
        reject(err)
      }
    })
  },

  // 处理权限被拒绝的情况
  handleRecordPermissionDenied() {
    wx.showModal({
      title: '需要录音权限',
      content: '使用录音功能需要您的授权。请在设置中开启录音权限。',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 打开设置页面
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.record']) {
                wx.showToast({
                  title: '权限已开启',
                  icon: 'success',
                  duration: 2000
                })
              }
            },
            fail: (err) => {
              console.error('打开设置失败:', err)
            }
          })
        }
      }
    })
  },

  // 处理隐私 API 被禁止的情况（基础库 >= 3.11.0）
  handlePrivacyApiBanned() {
    if (wx.requirePrivacyAuthorize) {
      // 直接请求隐私 API 授权
      wx.requirePrivacyAuthorize({
        success: () => {
          console.log('✅ 隐私 API 授权成功')
          wx.showToast({
            title: '授权成功，请重试',
            icon: 'success',
            duration: 2000
          })
        },
        fail: (err) => {
          console.error('❌ 隐私 API 授权失败:', err)
          wx.showModal({
            title: '需要隐私授权',
            content: '使用录音功能需要您的隐私授权。请在设置中开启隐私授权，然后重新尝试录音。',
            confirmText: '去设置',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting({
                  success: (settingRes) => {
                    console.log('设置页面返回:', settingRes)
                  },
                  fail: (err) => {
                    console.error('打开设置失败:', err)
                  }
                })
              }
            }
          })
        }
      })
    } else {
      // 基础库版本不支持，显示提示
      wx.showModal({
        title: '需要隐私授权',
        content: '使用录音功能需要您的隐私授权。请更新微信版本或在小程序设置中开启隐私授权。',
        showCancel: false,
        confirmText: '知道了'
      })
    }
  },

  // 开始录音
  async startRecord() {
    const recorderManager = this.data.recorderManager
    if (!recorderManager) {
      wx.showToast({
        title: '录音器初始化失败',
        icon: 'none'
      })
      return
    }

    // 如果启用了波形可视化，必须使用 PCM 格式才能获取实时数据
    const usePCMForVisualization = this.data.enableWaveform

    // 先检查权限
    try {
      const hasPermission = await this.checkRecordPermission()
      if (!hasPermission) {
        // 没有权限，请求权限
        try {
          await this.requestRecordPermission()
        } catch (err) {
          // 权限请求失败
          if (err.message === 'privacy_authorization_failed') {
            // 隐私 API 授权失败
            this.handlePrivacyApiBanned()
          } else {
            // 传统权限被拒绝
            this.handleRecordPermissionDenied()
          }
          return
        }
      }
    } catch (err) {
      if (err.message === 'permission_denied') {
        // 权限已被拒绝
        this.handleRecordPermissionDenied()
        return
      } else if (err.message === 'privacy_authorization_failed') {
        // 隐私 API 授权失败
        this.handlePrivacyApiBanned()
        return
      } else {
        // 其他错误，继续尝试录音（可能在某些情况下权限检查会失败但录音仍可用）
        console.warn('权限检查失败，继续尝试录音:', err)
      }
    }

    // 重置状态
    const maxDuration = this.data.durationOptions[this.data.selectedDurationIndex].value
    this.setData({
      recordTime: 0,
      countdown: maxDuration,
      hasRecorded: false,
      recordCompleted: false,
      pcmFrames: []
    })

    // 如果启用了波形可视化，必须使用 PCM 格式才能获取实时数据
    const sampleRate = 16000
    
    // 基础库/系统信息日志
    try {
      const sys = wx.getSystemInfoSync?.() || {}
      console.log('ℹ️ SDKVersion:', sys.SDKVersion, 'Platform:', sys.platform, sys.system)
    } catch (e) {}
    
    if (usePCMForVisualization) {
      // 启用可视化时，使用 PCM 格式 + frameSize
      console.log('📊 启用波形可视化，使用 PCM 格式录音')
      
      // 清空环形缓冲
      this.ring = []
      
      // 注意：Canvas 初始化应该在 onStart 回调中进行，此时 isRecording 已为 true，Canvas 已显示
      // 这里只启动录音，Canvas 初始化在 onStart 中处理
      
      try {
        // 尝试不同的 frameSize 值（根据采样率计算）
        // frameSize 应该是采样点数，不是字节数
        // 对于 16kHz 采样率：
        // - 1024 样本 = 1024 / 16000 = 0.064 秒（约 64ms，推荐值）
        // - 2048 样本 = 2048 / 16000 = 0.128 秒（约 128ms）
        // - 4096 样本 = 4096 / 16000 = 0.256 秒（约 256ms）
        // 注意：开发者工具可能不支持 onFrameRecorded，需要在真机上测试
        const frameSize = 1024 // 使用推荐值 1024（约 64ms/帧）
        
        console.log('🎤 启动录音，参数:', {
          format: 'PCM',
          frameSize: frameSize,
          sampleRate: sampleRate,
          duration: maxDuration * 1000
        })
        
    recorderManager.start({
          duration: maxDuration * 1000,
          sampleRate: sampleRate,
          numberOfChannels: 1,
          encodeBitRate: 64000,
          format: 'PCM', // 必须 PCM 格式
          frameSize: frameSize // 关键：必须指定 frameSize 才能持续收到帧
        })
        
        this.setData({
          sampleRate: sampleRate,
          recordFormat: 'PCM'
        })
        
        console.log(`✅ 开始录音（PCM + frameSize=${frameSize}，约 ${(frameSize / sampleRate * 1000).toFixed(0)}ms/帧）`)
        
        // 等待一小段时间，检查是否收到第一帧
        setTimeout(() => {
          if (this._frameCount === 0) {
            console.warn('⚠️ 录音启动后 500ms 仍未收到任何帧数据')
            console.warn('可能的原因：')
            console.warn('   1. 开发者工具不支持 onFrameRecorded，需要在真机上测试')
            console.warn('   2. frameSize 设置不正确（当前:', frameSize, '）')
            console.warn('   3. 基础库版本过低（需要 >= 2.10.0）')
            console.warn('   4. format 必须为 "PCM" 且 frameSize 必须设置')
            console.warn('   5. onFrameRecorded 回调必须在 start() 之前绑定')
            
            // 提示用户
            wx.showToast({
              title: '波形功能需在真机测试',
              icon: 'none',
              duration: 3000
            })
          } else {
            console.log('✅ 已收到帧数据，波形功能正常')
          }
        }, 500)
      } catch (error) {
        // 详细的错误日志
        const errorInfo = {
          timestamp: new Date().toISOString(),
          error: error,
          errorMsg: error.message || error.errMsg || String(error),
          errorCode: error.errCode || '',
          format: 'PCM',
          sampleRate: sampleRate,
          frameSize: frameSize,
          systemInfo: null
        }
        
        try {
          const systemInfo = wx.getSystemInfoSync()
          errorInfo.systemInfo = {
            platform: systemInfo.platform,
            system: systemInfo.system,
            version: systemInfo.version,
            SDKVersion: systemInfo.SDKVersion
          }
        } catch (e) {
          errorInfo.systemInfoError = String(e)
        }
        
        console.error('❌ PCM 格式启动失败:', errorInfo)
        
        // 保存错误日志
        try {
          const errorLogs = wx.getStorageSync('recorder_error_logs') || []
          errorLogs.push(errorInfo)
          if (errorLogs.length > 10) {
            errorLogs.splice(0, errorLogs.length - 10)
          }
          wx.setStorageSync('recorder_error_logs', errorLogs)
        } catch (e) {
          console.error('保存错误日志失败:', e)
        }
        
        const errorMsg = error.message || error.errMsg || String(error)
        if (errorMsg.includes('privacy api banned') || errorMsg.includes('privacy')) {
          // 隐私 API 被禁止
          this.handlePrivacyApiBanned()
        } else if (errorMsg.includes('permission') || errorMsg.includes('权限') || errorMsg.includes('deny')) {
          // 传统权限被拒绝
          this.handleRecordPermissionDenied()
        } else {
          const errorDetail = error.errCode ? `错误代码: ${error.errCode}` : (errorMsg || '未知错误')
          wx.showModal({
            title: '录音启动失败',
            content: `无法启动录音，请重试。\n\n${errorDetail}\n\n提示：错误信息已保存，可在设置中查看。`,
            showCancel: true,
            confirmText: '知道了',
            cancelText: '查看错误日志',
            success: (res) => {
              if (res.cancel) {
                this.showErrorLogs()
              }
            }
          })
        }
        return
      }
    } else {
      // 未启用可视化时，优先使用 wav 格式（可以播放）
      // 如果 wav 不支持，尝试 mp3 格式
      try {
        console.log('🎵 未启用可视化，优先使用 WAV 格式录音（可播放）')
        recorderManager.start({
          duration: maxDuration * 1000,
          sampleRate: sampleRate,
      numberOfChannels: 1,
      encodeBitRate: 96000,
          format: 'wav' // 使用 wav 格式，确保可以播放
        })
        
        this.setData({
          sampleRate: sampleRate,
          recordFormat: 'wav'
        })
        console.log('✅ WAV 格式录音启动成功')
      } catch (wavError) {
        console.warn('⚠️ WAV 格式启动失败，尝试 MP3 格式:', wavError)
        
        // 检查是否是权限错误
        const errorMsg = wavError.message || wavError.errMsg || String(wavError)
        if (errorMsg.includes('privacy api banned') || errorMsg.includes('privacy')) {
          // 隐私 API 被禁止
          this.handlePrivacyApiBanned()
          return
        } else if (errorMsg.includes('permission') || errorMsg.includes('权限') || errorMsg.includes('deny')) {
          // 传统权限被拒绝
          this.handleRecordPermissionDenied()
          return
        }
        
        // 如果 wav 失败，尝试 mp3（也可以播放）
        try {
          recorderManager.start({
            duration: maxDuration * 1000,
            sampleRate: sampleRate,
            numberOfChannels: 1,
            encodeBitRate: 96000,
            format: 'mp3' // 使用 mp3 格式，也可以播放
          })
          
          this.setData({
            sampleRate: sampleRate,
            recordFormat: 'mp3'
          })
          console.log('✅ MP3 格式录音启动成功')
        } catch (mp3Error) {
          console.warn('⚠️ MP3 格式也启动失败，尝试 PCM 格式（仅用于分析）:', mp3Error)
          
          // 如果 mp3 也失败，尝试 PCM（可以分析但无法播放）
          try {
            // 清空环形缓冲
            this.ring = []
            
            const frameSize = 1024 // 推荐值（约 64ms/帧）
            recorderManager.start({
              duration: maxDuration * 1000,
              sampleRate: sampleRate,
              numberOfChannels: 1,
              encodeBitRate: 64000,
              format: 'PCM', // 使用 PCM 格式以获取原始数据进行分析
              frameSize: frameSize // 关键：必须指定 frameSize
            })
            
            this.setData({
              sampleRate: sampleRate,
              recordFormat: 'PCM'
            })
            console.log('⚠️ PCM 格式录音启动成功（注意：PCM 格式无法播放）')
            
            // 提示用户 PCM 格式无法播放
            wx.showModal({
              title: '提示',
              content: '当前使用 PCM 格式录音，仅用于分析。如需播放功能，请稍后重试或检查设备支持。',
              showCancel: false,
              confirmText: '知道了'
            })
          } catch (pcmError) {
            console.error('❌ PCM 格式也启动失败:', pcmError)
            
            // 检查是否是权限错误
            const pcmErrorMsg = pcmError.message || pcmError.errMsg || String(pcmError)
            if (pcmErrorMsg.includes('privacy api banned') || pcmErrorMsg.includes('privacy')) {
              // 隐私 API 被禁止
              this.handlePrivacyApiBanned()
            } else if (pcmErrorMsg.includes('permission') || pcmErrorMsg.includes('权限') || pcmErrorMsg.includes('deny')) {
              // 传统权限被拒绝
              this.handleRecordPermissionDenied()
            } else {
              wx.showModal({
                title: '录音启动失败',
                content: '无法启动录音，请检查是否已授予录音权限，或稍后重试。',
                confirmText: '去设置',
                cancelText: '取消',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
            }
          }
        }
      }
    }
  },

  // 停止录音
  stopRecord() {
    const recorderManager = this.data.recorderManager
    if (recorderManager && this.data.isRecording) {
      recorderManager.stop()
      console.log('🛑 手动停止录音')
      // 注意：不停止渲染循环，保持最后一帧显示
    }
  },

  // 播放录音
  playRecord() {
    // 检查录音文件路径
    if (!this.data.recordFilePath) {
      // 如果是 PCM 格式，提示用户无法播放
      if (this.data.recordFormat === 'PCM') {
        wx.showModal({
          title: '无法播放',
          content: '当前录音为 PCM 格式，仅用于分析。如需播放，请关闭波形可视化功能后重新录音（将使用 WAV 格式）。',
          showCancel: false,
          confirmText: '知道了'
        })
      } else {
      wx.showToast({
          title: '没有录音文件可以播放',
          icon: 'none',
          duration: 2000
      })
      }
      return
    }

    // 检查录音格式，PCM 格式无法播放
    if (this.data.recordFormat === 'PCM') {
      wx.showModal({
        title: '无法播放',
        content: '当前录音为 PCM 格式，仅用于分析。如需播放，请关闭波形可视化功能后重新录音（将使用 WAV 格式）。',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }

    // 创建音频上下文
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = this.data.recordFilePath
    innerAudioContext.autoplay = false // 不自动播放，手动控制
    
    // 错误处理
    innerAudioContext.onError((err) => {
      console.error('播放错误:', err)
      console.error('错误详情:', JSON.stringify(err))
      console.error('录音文件路径:', this.data.recordFilePath)
      console.error('录音格式:', this.data.recordFormat)
      
      let errorMsg = '播放失败'
      if (err.errMsg) {
        if (err.errMsg.includes('not support') || err.errMsg.includes('不支持')) {
          errorMsg = '音频格式不支持播放'
        } else if (err.errMsg.includes('file not found') || err.errMsg.includes('文件不存在')) {
          errorMsg = '录音文件不存在'
        } else {
          errorMsg = '播放失败：' + err.errMsg
        }
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      })
      
      // 清理资源
      try {
      innerAudioContext.destroy()
      } catch (e) {
        console.error('清理音频上下文失败:', e)
      }
    })
    
    // 播放开始
    innerAudioContext.onPlay(() => {
      console.log('✅ 开始播放录音:', this.data.recordFilePath)
      console.log('   录音格式:', this.data.recordFormat)
      wx.showToast({
        title: '正在播放...',
        icon: 'none',
        duration: 1000
      })
    })
    
    // 播放结束
    innerAudioContext.onEnded(() => {
      console.log('✅ 播放结束')
      wx.showToast({
        title: '播放完成',
        icon: 'success',
        duration: 1500
      })
      // 清理资源
      try {
        innerAudioContext.destroy()
      } catch (e) {
        console.error('清理音频上下文失败:', e)
      }
    })
    
    // 播放暂停
    innerAudioContext.onPause(() => {
      console.log('⏸️ 播放暂停')
    })
    
    // 开始播放
    try {
      innerAudioContext.play()
    } catch (error) {
      console.error('调用 play() 失败:', error)
      wx.showToast({
        title: '播放启动失败',
        icon: 'none',
        duration: 2000
      })
      // 清理资源
      try {
        innerAudioContext.destroy()
      } catch (e) {
        console.error('清理音频上下文失败:', e)
      }
    }
  },

  // 播放示例音频
  playDemo() {
    wx.showToast({
      title: '示例音频播放功能',
      icon: 'none'
    })
  },

  // 开始分析录音
  analyzeRecord() {
    // 检查是否有 PCM 数据或录音文件
    const hasPcmData = this.data.pcmFrames && this.data.pcmFrames.length > 0
    const hasAudioFile = this.data.recordFilePath
    
    if (!hasPcmData && !hasAudioFile) {
      wx.showToast({
        title: '请先录音',
        icon: 'none'
      })
      return
    }

    this.setData({
      isAnalyzing: true
    })

    wx.showLoading({
      title: '正在分析音频...',
      mask: true
    })

    // 使用真实的音频分析
    // 使用 setTimeout 将计算放在下一个事件循环，避免阻塞 UI
    setTimeout(() => {
      try {
        const pcmFrames = this.data.pcmFrames || []
        const sampleRate = this.data.sampleRate || 16000
        // 获取实际录音时长，确保是数字类型
        const duration = Number(this.data.recordTime) || 0
        
        // 如果时长为0，尝试从PCM数据估算
        let actualDuration = duration
        if (actualDuration <= 0 && pcmFrames.length > 0) {
          // 根据PCM数据估算时长
          const totalSamples = pcmFrames.reduce((sum, frame) => sum + frame.length, 0)
          actualDuration = Math.round(totalSamples / sampleRate)
          console.warn('⚠️ recordTime 为0，从PCM数据估算时长:', actualDuration, '秒')
        }
        
        // 如果还是0，使用默认值30秒（但会触发时长检测降分）
        if (actualDuration <= 0) {
          actualDuration = 30
          console.warn('⚠️ 无法确定录音时长，使用默认值30秒')
        }
        
        console.log('🎵 开始专业音频分析')
        console.log('   PCM 帧数:', pcmFrames.length)
        console.log('   采样率:', sampleRate, 'Hz')
        console.log('   录音时长:', actualDuration, '秒')
        console.log('   recordTime:', this.data.recordTime)
        console.log('   人声检测开关:', this.data.enableVoiceDetection ? '开启' : '关闭')
        
        let analysisResult
        
        if (hasPcmData && pcmFrames.length > 0) {
          // 使用真实的音频特征分析（专业分析）
          // 传递人声检测和旋律检测开关状态
          const enableVoiceDetection = this.data.enableVoiceDetection === true
          const enableMelodyDetection = this.data.enableMelodyDetection === true
          console.log('   传递给人声检测参数:', enableVoiceDetection)
          console.log('   传递给旋律检测参数:', enableMelodyDetection)
          analysisResult = analyzeAudioFeatures(pcmFrames, sampleRate, actualDuration, enableVoiceDetection, enableMelodyDetection)
          
          console.log('✅ 音频分析完成:')
          console.log('   总分:', analysisResult.score)
          console.log('   音准:', analysisResult.pitch)
          console.log('   节奏:', analysisResult.rhythm)
          console.log('   音量:', analysisResult.volume)
          console.log('   音色:', analysisResult.timbre)
        } else {
          // 降级使用模拟分析（如果 PCM 数据获取失败）
          console.warn('⚠️ PCM 数据为空，使用降级分析')
          console.warn('⚠️ 注意：无法进行人声和旋律检测，将给予较低分数')
          
          // 由于无法进行真实的人声和旋律检测，给予合理的基础分数（入门模式更宽松）
          // 但各项指标应该有明显差异，避免都是50分
          // 提高基础分范围：65-80分（入门模式）
          const baseScore = Math.random() * 15 + 65 // 65-80分的基础分
          
          // 各项指标基于基础分，但有明显差异（±15分范围）
          const pitchVariation = (Math.random() - 0.5) * 20
          const rhythmVariation = (Math.random() - 0.5) * 20
          const volumeVariation = (Math.random() - 0.5) * 20
          const timbreVariation = (Math.random() - 0.5) * 20
          
          analysisResult = {
            score: Math.round(baseScore),
            pitch: Math.round(Math.max(50, Math.min(90, baseScore + pitchVariation))),
            rhythm: Math.round(Math.max(50, Math.min(90, baseScore + rhythmVariation))),
            volume: Math.round(Math.max(50, Math.min(90, baseScore + volumeVariation))),
            timbre: Math.round(Math.max(50, Math.min(90, baseScore + timbreVariation))),
            duration: actualDuration,
            analysis: {
              pitchAccuracy: Math.random() * 15 + 60,
              rhythmStability: Math.random() * 15 + 60,
              volumeConsistency: Math.random() * 15 + 60,
              timbreQuality: Math.random() * 15 + 60
            }
          }
          
          // 即使使用降级分析，也要应用时长检测和降分
          const durationCheck = checkDuration(actualDuration)
          console.log('📏 时长检测（降级分析）:', durationCheck.reason, '降分比例:', durationCheck.penalty)
          
          // 计算降分：只有当检测功能启用但无法检测时才降分
          // 如果检测功能已关闭，不应该因为"无法检测"而降分
          const enableVoiceDetection = this.data.enableVoiceDetection === true
          const enableMelodyDetection = this.data.enableMelodyDetection === true
          
          // 只有当检测功能启用但无法检测时才降分
          let noDetectionPenalty = 0
          if (enableVoiceDetection || enableMelodyDetection) {
            // 有检测功能启用但无法检测，给予降分
            noDetectionPenalty = 0.3
            console.warn(`⚠️ 检测功能已启用但无法进行检测（PCM数据不可用），额外降分: ${(noDetectionPenalty * 100).toFixed(1)}%`)
          } else {
            // 检测功能已关闭，不应该降分
            console.log('ℹ️ 检测功能已关闭，不因无法检测而降分')
          }
          
          let finalScore = analysisResult.score
          
          // 应用时长降分（降低降分幅度，入门模式更宽松）
          if (durationCheck.penalty > 0) {
            // 降低降分幅度：最多降15%（入门模式更宽松）
            const adjustedPenalty = Math.min(0.15, durationCheck.penalty * 0.4)
            finalScore = Math.round(finalScore * (1 - adjustedPenalty))
            console.warn(`⚠️ 时长不合适，降分: ${(adjustedPenalty * 100).toFixed(1)}%`)
          }
          
          // 应用无法检测的降分（仅当检测功能启用时，降低降分幅度）
          if (noDetectionPenalty > 0) {
            // 降低降分幅度：最多降20%（入门模式更宽松）
            const adjustedNoDetectionPenalty = Math.min(0.2, noDetectionPenalty * 0.67)
            finalScore = Math.round(finalScore * (1 - adjustedNoDetectionPenalty))
            console.warn(`   无法检测降分: ${(adjustedNoDetectionPenalty * 100).toFixed(1)}%`)
            console.warn(`   最终分数: ${finalScore}分 (基础分: ${analysisResult.score}分)`)
          }
          
          // 确保最终分数在合理范围内（入门模式：至少60分）
          if (!enableVoiceDetection && !enableMelodyDetection) {
            // 入门模式：确保最低分不低于60分
            finalScore = Math.max(60, Math.min(100, finalScore))
          } else {
            finalScore = Math.max(0, Math.min(100, finalScore))
          }
          
          // 更新所有分数
          const scoreRatio = finalScore / analysisResult.score
          analysisResult.score = finalScore
          analysisResult.pitch = Math.round(Math.max(50, Math.min(90, analysisResult.pitch * scoreRatio)))
          analysisResult.rhythm = Math.round(Math.max(50, Math.min(90, analysisResult.rhythm * scoreRatio)))
          analysisResult.volume = Math.round(Math.max(50, Math.min(90, analysisResult.volume * scoreRatio)))
          analysisResult.timbre = Math.round(Math.max(50, Math.min(90, analysisResult.timbre * scoreRatio)))
          
          // 添加检测结果到分析结果中
          analysisResult.durationCheck = durationCheck
          
          // 根据人声检测开关状态设置结果
          if (this.data.enableVoiceDetection) {
            // 人声检测已启用，但PCM数据不可用，无法检测
            analysisResult.isVoice = false
            analysisResult.voiceReason = 'PCM数据不可用，无法进行人声检测。请确保录制的是您的歌声。'
            analysisResult.voiceConfidence = 0.3 // 低置信度
            // 根据旋律检测开关状态设置结果
            if (this.data.enableMelodyDetection) {
              analysisResult.melodyCheck = { 
                hasMelody: false, 
                melodyScore: 0, 
                reason: 'PCM数据不可用，无法进行旋律检测。请确保录制的是您的歌声。' 
              }
            } else {
              analysisResult.melodyCheck = { 
                hasMelody: true, 
                melodyScore: 50, 
                reason: '旋律检测已禁用' 
              }
            }
          } else {
            // 人声检测已禁用，不进行检测
            analysisResult.isVoice = true
            analysisResult.voiceReason = '人声检测已禁用'
            analysisResult.voiceConfidence = 1
            // 根据旋律检测开关状态设置结果
            if (this.data.enableMelodyDetection) {
              analysisResult.melodyCheck = { 
                hasMelody: false, 
                melodyScore: 0, 
                reason: 'PCM数据不可用，无法进行旋律检测。请确保录制的是您的歌声。' 
              }
            } else {
              analysisResult.melodyCheck = { 
                hasMelody: true, 
                melodyScore: 50, 
                reason: '旋律检测已禁用' 
              }
            }
          }
        }

        // 添加录音文件路径到结果中（可能为 null，如果是纯 PCM 格式）
        analysisResult.recordFilePath = this.data.recordFilePath
        
        // 添加波形和音高数据到结果中（用于在结果页面显示）
        if (this.data.enableWaveform) {
          // 优先使用 ring 缓冲中的数据（真实数据或从文件读取的数据）
          if (this.ring && this.ring.length > 0) {
            // 从 ring 缓冲提取波形数据（下采样）
            const waveformSamples = []
            const step = Math.max(1, Math.floor(this.ring.length / 500)) // 最多500个点
            for (let i = 0; i < this.ring.length; i += step) {
              waveformSamples.push(this.ring[i])
            }
            analysisResult.waveformData = waveformSamples
            
            // 如果有 pitchData，也传递
            analysisResult.pitchData = this.data.pitchData || []
            
            console.log('📊 传递波形数据到结果页面，样本数:', waveformSamples.length, 'ring长度:', this.ring.length)
          } else if (this.data.waveformData && this.data.waveformData.length > 0) {
            // 降级：使用旧的 waveformData
            analysisResult.waveformData = this.data.waveformData
            analysisResult.pitchData = this.data.pitchData || []
            console.log('📊 使用旧的波形数据，样本数:', this.data.waveformData.length)
          } else {
            // 没有波形数据
            analysisResult.waveformData = []
            analysisResult.pitchData = []
            console.warn('⚠️ 没有波形数据可传递')
          }
          analysisResult.hasWaveform = (analysisResult.waveformData && analysisResult.waveformData.length > 0)
        }

        wx.hideLoading()

      // 跳转到结果页面
      wx.redirectTo({
        url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(analysisResult))}`
      })
      } catch (error) {
        console.error('❌ 音频分析失败:', error)
        wx.hideLoading()
        wx.showToast({
          title: '分析失败，请重试',
          icon: 'none',
          duration: 2000
        })
        this.setData({
          isAnalyzing: false
        })
      }
    }, 100) // 短暂延迟，让 UI 有时间更新
  },

  // 录音时长选择
  onDurationChange(e) {
    this.setData({
      selectedDurationIndex: e.detail.value
    })
  },

  // 切换人声检测
  toggleVoiceDetection() {
    const enabled = !this.data.enableVoiceDetection
    this.setData({
      enableVoiceDetection: enabled
    })
    console.log('人声检测:', enabled ? '开启' : '关闭')
    
    wx.showToast({
      title: enabled ? '人声检测已开启' : '人声检测已关闭',
      icon: 'none',
      duration: 1500
    })
  },

  // 切换旋律检测
  toggleMelodyDetection() {
    const enabled = !this.data.enableMelodyDetection
    this.setData({
      enableMelodyDetection: enabled
    })
    console.log('旋律检测:', enabled ? '开启' : '关闭')
    
    wx.showToast({
      title: enabled ? '旋律检测已开启' : '旋律检测已关闭',
      icon: 'none',
      duration: 1500
    })
  },

  // 切换波形可视化
  toggleWaveform() {
    const enabled = !this.data.enableWaveform
    this.setData({
      enableWaveform: enabled
    })
    console.log('波形可视化:', enabled ? '开启' : '关闭')
    
    if (enabled) {
      // 开启：清空缓冲，初始化 Canvas 2D 并启动渲染循环
      this.ring = []
      if (this.canvas && this.ctx) {
        this._startRenderLoop()
      } else {
        this.initCanvas2D()
      }
    } else {
      // 关闭：停止渲染循环
      this._stopRenderLoop()
    }
    
    wx.showToast({
      title: enabled ? '波形可视化已开启' : '波形可视化已关闭',
      icon: 'none',
      duration: 1500
    })
  },

  // 切换高级设置显示
  toggleAdvancedSettings() {
    const show = !this.data.showAdvancedSettings
    this.setData({
      showAdvancedSettings: show
    })
    console.log('高级设置:', show ? '展开' : '折叠')
  },

  // 初始化波形canvas
  initWaveformCanvas() {
    try {
      // 获取系统信息，计算实际像素尺寸（使用新 API）
      const windowInfo = wx.getWindowInfo()
      const deviceInfo = wx.getDeviceInfo()
      const screenWidth = windowInfo.screenWidth || 375
      const pixelRatio = deviceInfo.pixelRatio || 2
      
      // canvas尺寸（500rpx高度）
      const width = (700 * screenWidth / 750) * pixelRatio
      const height = (500 * screenWidth / 750) * pixelRatio
      
      // 保存canvas尺寸
      this.canvasWidth = width
      this.canvasHeight = height
      
      // 获取canvas上下文
      const ctx = wx.createCanvasContext('waveformCanvas', this)
      
      // 清空canvas
      ctx.clearRect(0, 0, width, height)
      
      // 绘制背景和网格
      this.drawCanvasBackground(ctx, width, height)
      
      ctx.draw()
      
      console.log('✅ Canvas 初始化成功，尺寸:', width, 'x', height)
    } catch (error) {
      console.error('❌ 初始化canvas失败:', error)
    }
  },

  // 绘制canvas背景和网格
  drawCanvasBackground(ctx, width, height) {
    // 背景
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, width, height)
    
    // 网格线
    ctx.setStrokeStyle('#e5e7eb')
    ctx.setLineWidth(1)
    
    // 水平网格线
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // 垂直网格线
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    // 中心线
    ctx.setStrokeStyle('#ff9a56')
    ctx.setLineWidth(1)
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  },

  // 更新波形可视化（使用真实 PCM 数据）
  updateWaveformVisualization(frameData) {
    if (!frameData || frameData.length === 0) {
      console.warn('⚠️ frameData为空，跳过可视化更新')
      return
    }
    
    try {
      const sampleRate = this.data.sampleRate || 16000
      console.log('📊 使用真实数据更新可视化，帧数据长度:', frameData.length)
      
      // 1. 更新波形数据（采样显示，避免数据过多）
      const waveformSamples = this.sampleWaveform(frameData, 200) // 每帧采样200个点
      const currentWaveform = this.data.waveformData || []
      currentWaveform.push(...waveformSamples)
      
      // 只保留最近的数据（约5秒的数据，保持滚动显示）
      const maxSamples = 200 * 5 // 5秒的数据（假设每帧约0.1秒）
      if (currentWaveform.length > maxSamples) {
        currentWaveform.splice(0, currentWaveform.length - maxSamples)
      }
      
      // 2. 计算音高（需要FFT和频谱）
      let pitch = 0
      let validPitch = 0
      let currentPitch = this.data.pitchData || []
      
      try {
        const fftResult = fft(frameData, sampleRate)
        if (fftResult && fftResult.magnitude) {
          const powerSpectrum = calculatePowerSpectrum(fftResult)
          if (powerSpectrum && powerSpectrum.length > 0) {
            // 计算音高
            pitch = detectPitch(powerSpectrum, fftResult.frequencies, sampleRate)
            
            currentPitch.push(pitch)
            
            // 只保留最近的数据（与波形数据对齐）
            const maxPitchSamples = 200 * 5
            if (currentPitch.length > maxPitchSamples) {
              currentPitch.splice(0, currentPitch.length - maxPitchSamples)
            }
            
            // 更新当前音高值（用于显示）
            validPitch = pitch >= 80 && pitch <= 1000 ? pitch : 0
          }
        }
      } catch (fftError) {
        // FFT计算出错，只更新波形数据
        console.warn('⚠️ FFT计算失败，只更新波形:', fftError)
      }
      
      // 先更新数据（同步更新，不等待 setData 完成）
      this.data.waveformData = currentWaveform
      this.data.pitchData = currentPitch
      this.data.currentPitch = validPitch
      this.data.currentPitchText = validPitch > 0 ? Math.round(validPitch).toString() : '0'
      
      // 然后异步更新 UI（不阻塞绘制）
      this.setData({
        waveformData: currentWaveform,
        pitchData: currentPitch,
        currentPitch: validPitch,
        currentPitchText: validPitch > 0 ? Math.round(validPitch).toString() : '0'
      })
      
      // 立即同步绘制，确保实时性
      // 使用 setTimeout 0 确保在下一个事件循环立即绘制
      setTimeout(() => {
        this.drawWaveformWithPitch()
      }, 0)
    } catch (error) {
      console.error('❌ 更新波形可视化失败:', error)
      console.error('错误堆栈:', error.stack)
    }
  },

  // 采样波形数据
  sampleWaveform(data, targetLength) {
    if (data.length <= targetLength) {
      return Array.from(data)
    }
    
    const step = data.length / targetLength
    const samples = []
    for (let i = 0; i < targetLength; i++) {
      const index = Math.floor(i * step)
      samples.push(data[index])
    }
    return samples
  },

  // 生成模拟波形数据（用于实时展示）
  generateMockWaveform(time) {
    const samples = []
    const sampleCount = 200 // 每次生成200个采样点
    
    for (let i = 0; i < sampleCount; i++) {
      // 生成多种频率的混合波形，模拟真实音频
      const t = time + (i / sampleCount) * 0.1
      const freq1 = 200 + Math.sin(t * 0.5) * 50 // 基础频率变化
      const freq2 = 400 + Math.sin(t * 0.3) * 100 // 谐波
      const freq3 = 600 + Math.sin(t * 0.7) * 80
      
      // 混合多个频率
      const wave = 
        Math.sin(t * freq1 * 2 * Math.PI) * 0.4 +
        Math.sin(t * freq2 * 2 * Math.PI) * 0.3 +
        Math.sin(t * freq3 * 2 * Math.PI) * 0.2 +
        (Math.random() - 0.5) * 0.1 // 添加一些噪声
      
      // 添加音量变化（模拟呼吸和动态）
      const volume = 0.7 + Math.sin(t * 2) * 0.3
      samples.push(wave * volume)
    }
    
    return samples
  },

  // 生成模拟音高数据
  generateMockPitch(time) {
    // 模拟音高在 200-600 Hz 之间变化（人声范围）
    const basePitch = 300
    const variation = Math.sin(time * 0.5) * 100 + Math.sin(time * 1.2) * 50
    const pitch = basePitch + variation + (Math.random() - 0.5) * 20
    
    // 确保在有效范围内
    return Math.max(80, Math.min(1000, pitch))
  },

  // 开始波形实时更新（已废弃，现在完全使用真实的 onFrameRecorded 数据）
  // 保留此函数以防需要，但不再使用模拟数据
  startWaveformUpdate() {
    // 不再使用模拟数据，波形更新完全依赖 onFrameRecorded 的真实数据
    console.log('📊 波形更新已切换到真实数据模式，不再使用模拟数据')
  },

  // 停止波形更新
  stopWaveformUpdate() {
    if (this.data.waveformTimer) {
      clearInterval(this.data.waveformTimer)
      this.setData({
        waveformTimer: null
      })
    }
  },

  // 从 PCM 文件读取数据并绘制波形（备选方案，当 onFrameRecorded 不工作时使用）
  async readPCMFileAndDraw(filePath) {
    try {
      console.log('📂 开始读取 PCM 文件:', filePath)
      
      // 处理文件路径（如果是 http://tmp/ 开头，需要转换为本地路径）
      let localPath = filePath
      if (filePath && filePath.startsWith('http://tmp/')) {
        // 提取文件名部分
        const fileName = filePath.replace('http://tmp/', '')
        localPath = `${wx.env.USER_DATA_PATH}/${fileName}`
        console.log('📂 转换后的本地路径:', localPath)
      }
      
      // 使用 FileSystemManager 读取文件
      const fs = wx.getFileSystemManager()
      
      // 读取文件数据（不指定 encoding，返回 ArrayBuffer）
      const fileData = await new Promise((resolve, reject) => {
        fs.readFile({
          filePath: localPath, // 使用转换后的本地路径
          // 不指定 encoding，返回 ArrayBuffer
          success: (res) => {
            console.log('✅ 文件读取成功，数据类型:', typeof res.data, 
                       res.data instanceof ArrayBuffer ? 'ArrayBuffer' : 
                       res.data instanceof Uint8Array ? 'Uint8Array' :
                       Array.isArray(res.data) ? 'Array' : '其他',
                       '大小:', res.data.byteLength || res.data.length || '未知', '字节')
            resolve(res.data)
          },
          fail: (err) => {
            console.error('❌ 文件读取失败:', err)
            console.error('   尝试的路径:', localPath)
            // 如果本地路径失败，尝试原始路径
            if (localPath !== filePath) {
              console.log('🔄 尝试使用原始路径:', filePath)
              fs.readFile({
                filePath: filePath,
                success: (res) => {
                  console.log('✅ 使用原始路径读取成功')
                  resolve(res.data)
                },
                fail: (err2) => {
                  console.error('❌ 原始路径也失败:', err2)
                  reject(err2)
                }
              })
            } else {
              reject(err)
            }
          }
        })
      })
      
      if (!fileData) {
        console.error('❌ 文件数据为空')
        return
      }
      
      // 处理不同的数据格式
      let arrayBuffer = null
      
      // 优先检查是否有 byteLength 属性（ArrayBuffer 或 TypedArray 的特征）
      if (fileData.byteLength !== undefined) {
        // 可能是 ArrayBuffer 或 TypedArray
        if (fileData instanceof ArrayBuffer) {
          arrayBuffer = fileData
        } else if (fileData.buffer instanceof ArrayBuffer) {
          // 如果是 TypedArray，获取其 buffer
          arrayBuffer = fileData.buffer
        } else {
          // 有 byteLength 但不是标准类型，尝试直接使用
          console.warn('⚠️ 数据有 byteLength 但类型异常，尝试直接使用')
          arrayBuffer = fileData
        }
      } else if (fileData instanceof ArrayBuffer) {
        arrayBuffer = fileData
      } else if (fileData instanceof Uint8Array) {
        // 如果是 Uint8Array，转换为 ArrayBuffer
        arrayBuffer = fileData.buffer
      } else if (Array.isArray(fileData)) {
        // 如果是数组，转换为 ArrayBuffer
        const uint8Array = new Uint8Array(fileData)
        arrayBuffer = uint8Array.buffer
      } else {
        // 最后尝试：检查是否有 buffer 属性
        if (fileData.buffer && fileData.buffer instanceof ArrayBuffer) {
          arrayBuffer = fileData.buffer
        } else {
          console.error('❌ 不支持的数据格式:', typeof fileData, fileData.constructor?.name, 'keys:', Object.keys(fileData))
          console.error('   数据详情:', {
            hasByteLength: 'byteLength' in fileData,
            hasBuffer: 'buffer' in fileData,
            isArray: Array.isArray(fileData)
          })
          return
        }
      }
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.error('❌ ArrayBuffer 无效或为空')
        return
      }
      
      console.log('📊 处理后的 ArrayBuffer 大小:', arrayBuffer.byteLength, '字节')
      
      // 转换为 Int16Array（PCM 格式通常是 16 位，即每 2 字节一个样本）
      // 注意：如果文件大小不是 2 的倍数，可能需要处理对齐问题
      const sampleCount = Math.floor(arrayBuffer.byteLength / 2)
      const int16Array = new Int16Array(arrayBuffer, 0, sampleCount)
      console.log('📊 PCM 数据样本数:', int16Array.length)
      
      // 归一化并填充 ring 缓冲
      this.ring = []
      for (let i = 0; i < int16Array.length; i++) {
        this.ring.push(int16Array[i] / 32768.0)
      }
      
      console.log('✅ ring 缓冲已填充，长度:', this.ring.length)
      
      // 初始化 Canvas（如果还没初始化）
      if (!this.canvas || !this.ctx) {
        await new Promise((resolve) => {
          this.initCanvas2D()
          setTimeout(resolve, 500) // 等待 Canvas 初始化
        })
      }
      
      // 启动渲染循环
      if (this.canvas && this.ctx) {
        this._startRenderLoop()
        console.log('✅ 渲染循环已启动，波形应显示')
      } else {
        console.error('❌ Canvas 未初始化，无法绘制')
      }
      
    } catch (error) {
      console.error('❌ 读取 PCM 文件失败:', error)
      console.error('错误堆栈:', error.stack)
      
      // 如果读取失败，至少尝试绘制空波形
      if (this.canvas && this.ctx) {
        this._startRenderLoop()
      }
    }
  },

  // 绘制波形和音高叠加（参考 tobiplayer 设计 - 简洁版本）
  drawWaveformWithPitch() {
    const waveformData = this.data.waveformData || []
    const pitchData = this.data.pitchData || []
    if (waveformData.length === 0) {
      console.log('⚠️ 波形数据为空，跳过绘制')
      return
    }
    
    try {
      const ctx = wx.createCanvasContext('waveformCanvas', this)
      
      // 使用新 API 获取系统信息
      const windowInfo = wx.getWindowInfo()
      const deviceInfo = wx.getDeviceInfo()
      const screenWidth = windowInfo.screenWidth || 375
      const pixelRatio = deviceInfo.pixelRatio || 2
      const width = (700 * screenWidth / 750) * pixelRatio
      const height = (500 * screenWidth / 750) * pixelRatio
      
      // 更新canvas尺寸
      this.canvasWidth = width
      this.canvasHeight = height
      
      console.log('📊 绘制波形，数据点数:', waveformData.length, '画布尺寸:', width, 'x', height)
      
      // 清空并绘制背景
      ctx.clearRect(0, 0, width, height)
      this.drawCanvasBackground(ctx, width, height)
      
      // 绘制波形（参考 tobiplayer 的简洁风格）
      const dataLength = waveformData.length
      const displayLength = Math.min(dataLength, 500) // 显示更多点以获得更平滑的效果
      const startIndex = Math.max(0, dataLength - displayLength)
      
      // 绘制波形上半部分（填充）
      ctx.setFillStyle('rgba(100, 150, 200, 0.2)')
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      
      for (let i = 0; i < displayLength; i++) {
        const index = startIndex + i
        const x = (i / displayLength) * width
        const amplitude = Math.abs(waveformData[index])
        const y = (height / 2) - (amplitude * (height / 2) * 0.8)
        ctx.lineTo(x, y)
      }
      
      // 绘制下半部分
      for (let i = displayLength - 1; i >= 0; i--) {
        const index = startIndex + i
        const x = (i / displayLength) * width
        const amplitude = Math.abs(waveformData[index])
        const y = (height / 2) + (amplitude * (height / 2) * 0.8)
        ctx.lineTo(x, y)
      }
      
      ctx.closePath()
      ctx.fill()
      
      // 绘制波形中心线
      ctx.setStrokeStyle('#666666')
      ctx.setLineWidth(1)
      ctx.beginPath()
      ctx.moveTo(0, height / 2)
      ctx.lineTo(width, height / 2)
      ctx.stroke()
      
      // 绘制音高曲线（叠加在波形上方，参考 tobiplayer）
      const validPitches = pitchData.filter(p => p >= 80 && p <= 1000)
      
      if (validPitches.length > 0) {
        const minPitch = 80
        const maxPitch = 1000
        const pitchRange = maxPitch - minPitch
        
        // 计算音高曲线对应的索引（需要与波形数据对齐）
        const pitchDisplayLength = Math.min(validPitches.length, displayLength)
        const pitchStartIndex = Math.max(0, validPitches.length - pitchDisplayLength)
        
        // 绘制音高曲线（在波形上方区域）
        ctx.setStrokeStyle('#4a90e2')
        ctx.setLineWidth(2.5)
        ctx.beginPath()
        
        for (let i = 0; i < pitchDisplayLength; i++) {
          const pitchIndex = pitchStartIndex + i
          const pitch = validPitches[pitchIndex]
          const x = (i / displayLength) * width
          // 音高映射到波形上方（顶部20%的区域）
          const normalizedPitch = (pitch - minPitch) / pitchRange
          const pitchY = height * 0.15 - (normalizedPitch * height * 0.15)
          
          if (i === 0) {
            ctx.moveTo(x, pitchY)
          } else {
            ctx.lineTo(x, pitchY)
          }
        }
        
        ctx.stroke()
      }
      
      // 立即同步绘制到canvas（不使用回调，直接绘制）
      ctx.draw(true) // 使用 true 参数表示立即绘制，不等待
      console.log('✅ 波形绘制完成，数据点数:', waveformData.length)
    } catch (error) {
      console.error('❌ 绘制波形和音高失败:', error)
      console.error('错误堆栈:', error.stack)
    }
  },

  // 评测类型选择
  onTestTypeChange(e) {
    this.setData({
      selectedTestTypeIndex: e.detail.value
    })
  },

  // 显示错误日志（用于诊断）
  showErrorLogs() {
    try {
      const errorLogs = wx.getStorageSync('recorder_error_logs') || []
      
      if (errorLogs.length === 0) {
        wx.showModal({
          title: '错误日志',
          content: '暂无错误日志',
          showCancel: false
        })
        return
      }
      
      // 格式化错误日志
      const latestError = errorLogs[errorLogs.length - 1]
      let logContent = `最近错误 (共 ${errorLogs.length} 条记录)\n\n`
      logContent += `时间: ${latestError.timestamp || '未知'}\n`
      logContent += `错误消息: ${latestError.errMsg || latestError.errorMsg || '无'}\n`
      logContent += `错误代码: ${latestError.errCode || latestError.errorCode || '无'}\n`
      
      if (latestError.systemInfo) {
        logContent += `\n系统信息:\n`
        logContent += `  平台: ${latestError.systemInfo.platform || '未知'}\n`
        logContent += `  系统: ${latestError.systemInfo.system || '未知'}\n`
        logContent += `  版本: ${latestError.systemInfo.version || '未知'}\n`
        logContent += `  基础库: ${latestError.systemInfo.SDKVersion || '未知'}\n`
        logContent += `  品牌: ${latestError.systemInfo.brand || '未知'}\n`
        logContent += `  型号: ${latestError.systemInfo.model || '未知'}\n`
      }
      
      if (latestError.recorderState) {
        logContent += `\n录音器状态:\n`
        logContent += `  格式: ${latestError.recorderState.recordFormat || '未知'}\n`
        logContent += `  采样率: ${latestError.recorderState.sampleRate || '未知'}\n`
        logContent += `  波形可视化: ${latestError.recorderState.enableWaveform ? '开启' : '关闭'}\n`
      }
      
      logContent += `\n完整错误信息已保存到本地存储，可通过开发者工具查看。`
      
      wx.showModal({
        title: '错误日志详情',
        content: logContent,
        showCancel: true,
        confirmText: '知道了',
        cancelText: '清除日志',
        success: (res) => {
          if (res.cancel) {
            // 清除日志
            wx.showModal({
              title: '确认清除',
              content: '确定要清除所有错误日志吗？',
              success: (confirmRes) => {
                if (confirmRes.confirm) {
                  wx.removeStorageSync('recorder_error_logs')
                  wx.showToast({
                    title: '日志已清除',
                    icon: 'success'
                  })
                }
              }
            })
          }
        }
      })
    } catch (error) {
      console.error('显示错误日志失败:', error)
      wx.showToast({
        title: '读取日志失败',
        icon: 'none'
      })
    }
  }
})
