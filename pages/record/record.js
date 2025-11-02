// pages/record/record.js
const { analyzeAudio } = require('../../utils/util.js')

Page({
  data: {
    isRecording: false,
    hasRecorded: false,
    recordCompleted: false,
    isAnalyzing: false,
    recordTime: 0,
    recordTip: '请选择一个安静的环境，准备开始录音',
    selectedDurationIndex: 1, // 默认选择1分钟
    selectedTestTypeIndex: 0,
    durationOptions: [
      { label: '30秒', value: 30 },
      { label: '1分钟', value: 60 },
      { label: '2分钟', value: 120 }
    ],
    testTypes: [
      { name: '综合评测', value: 'comprehensive' },
      { name: '音准测试', value: 'pitch' },
      { name: '节奏测试', value: 'rhythm' },
      { name: '音色测试', value: 'timbre' }
    ],
    waveData: [20, 40, 60, 80, 100, 80, 60, 40, 20, 30, 50, 70, 90, 70, 50, 30],
    recordTimer: null,
    recorderManager: null
  },

  onLoad(options) {
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
  },

  // 初始化录音器
  initRecorder() {
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      console.log('录音开始')
      this.setData({
        isRecording: true,
        recordTip: '正在录音中，请保持稳定...'
      })
      this.startTimer()
    })

    recorderManager.onStop((res) => {
      console.log('录音结束', res)
      this.setData({
        isRecording: false,
        hasRecorded: true,
        recordCompleted: true,
        recordTip: '录音完成！点击开始分析'
      })
      this.stopTimer()
      
      // 保存录音文件路径
      this.setData({
        recordFilePath: res.tempFilePath
      })
    })

    recorderManager.onError((err) => {
      console.error('录音错误', err)
      wx.showToast({
        title: '录音失败，请重试',
        icon: 'none'
      })
      this.setData({
        isRecording: false
      })
      this.stopTimer()
    })

    this.setData({
      recorderManager: recorderManager
    })
  },

  // 开始计时
  startTimer() {
    const timer = setInterval(() => {
      this.setData({
        recordTime: this.data.recordTime + 1
      })
      
      // 检查是否达到最大录音时长
      const maxDuration = this.data.durationOptions[this.data.selectedDurationIndex].value
      if (this.data.recordTime >= maxDuration) {
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

  // 开始录音
  startRecord() {
    const recorderManager = this.data.recorderManager
    if (!recorderManager) {
      wx.showToast({
        title: '录音器初始化失败',
        icon: 'none'
      })
      return
    }

    // 重置状态
    this.setData({
      recordTime: 0,
      hasRecorded: false,
      recordCompleted: false
    })

    // 开始录音
    recorderManager.start({
      duration: this.data.durationOptions[this.data.selectedDurationIndex].value * 1000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    })
  },

  // 停止录音
  stopRecord() {
    const recorderManager = this.data.recorderManager
    if (recorderManager && this.data.isRecording) {
      recorderManager.stop()
    }
  },

  // 播放录音
  playRecord() {
    if (!this.data.recordFilePath) {
      wx.showToast({
        title: '没有录音文件',
        icon: 'none'
      })
      return
    }

    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.src = this.data.recordFilePath
    innerAudioContext.play()
    
    innerAudioContext.onEnd(() => {
      innerAudioContext.destroy()
    })
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
    if (!this.data.recordFilePath) {
      wx.showToast({
        title: '请先录音',
        icon: 'none'
      })
      return
    }

    this.setData({
      isAnalyzing: true
    })

    // 模拟音频分析过程
    setTimeout(() => {
      // 模拟分析结果
      const analysisResult = analyzeAudio({
        duration: this.data.recordTime,
        filePath: this.data.recordFilePath
      })

      // 跳转到结果页面
      wx.redirectTo({
        url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(analysisResult))}`
      })
    }, 3000)
  },

  // 录音时长选择
  onDurationChange(e) {
    this.setData({
      selectedDurationIndex: e.detail.value
    })
  },

  // 评测类型选择
  onTestTypeChange(e) {
    this.setData({
      selectedTestTypeIndex: e.detail.value
    })
  }
})
