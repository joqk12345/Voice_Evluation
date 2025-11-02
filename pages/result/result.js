// pages/result/result.js
const app = getApp()
const { formatDate, getScoreLevel, getEvaluationAdvice } = require('../../utils/util.js')

Page({
  data: {
    resultData: {},
    scoreLevel: {},
    currentDate: '',
    metricsList: [],
    adviceList: [],
    hasHistory: false,
    comparisonData: []
  },

  onLoad(options) {
    // 获取传入的评测数据
    if (options.data) {
      try {
        const resultData = JSON.parse(decodeURIComponent(options.data))
        this.setData({
          resultData: resultData,
          currentDate: formatDate(new Date())
        })
        this.processResultData(resultData)
      } catch (error) {
        console.error('解析评测数据失败:', error)
        wx.showToast({
          title: '数据解析失败',
          icon: 'none'
        })
      }
    } else {
      // 如果没有数据，使用模拟数据
      this.loadMockData()
    }
  },

  // 处理评测数据
  processResultData(data) {
    // 获取评分等级
    const scoreLevel = getScoreLevel(data.score)
    
    // 构建指标列表
    const metricsList = [
      {
        name: '音准',
        description: '音高准确性',
        score: data.pitch,
        icon: '🎵',
        color: '#4CAF50',
        advice: this.getPitchAdvice(data.pitch)
      },
      {
        name: '节奏',
        description: '节拍稳定性',
        score: data.rhythm,
        icon: '🎼',
        color: '#2196F3',
        advice: this.getRhythmAdvice(data.rhythm)
      },
      {
        name: '音量',
        description: '声音强度控制',
        score: data.volume,
        icon: '🔊',
        color: '#FF9800',
        advice: this.getVolumeAdvice(data.volume)
      },
      {
        name: '音色',
        description: '声音质量',
        score: data.timbre,
        icon: '🎤',
        color: '#9C27B0',
        advice: this.getTimbreAdvice(data.timbre)
      }
    ]

    // 获取改进建议
    const adviceList = getEvaluationAdvice(data)

    // 检查是否有历史数据
    const history = app.globalData.mockHistory
    const hasHistory = history && history.length > 1

    // 构建对比数据
    let comparisonData = []
    if (hasHistory) {
      const previousResult = history[1] // 上一次的评测结果
      comparisonData = [
        {
          label: '音准',
          current: data.pitch,
          previous: previousResult.pitch
        },
        {
          label: '节奏',
          current: data.rhythm,
          previous: previousResult.rhythm
        },
        {
          label: '音量',
          current: data.volume,
          previous: previousResult.volume
        },
        {
          label: '音色',
          current: data.timbre,
          previous: previousResult.timbre
        }
      ]
    }

    this.setData({
      scoreLevel: scoreLevel,
      metricsList: metricsList,
      adviceList: adviceList,
      hasHistory: hasHistory,
      comparisonData: comparisonData
    })

    // 保存到历史记录
    this.saveToHistory(data)
  },

  // 加载模拟数据
  loadMockData() {
    const mockData = {
      score: 85,
      pitch: 88,
      rhythm: 82,
      volume: 90,
      timbre: 80,
      duration: 60
    }
    
    this.setData({
      resultData: mockData,
      currentDate: formatDate(new Date())
    })
    
    this.processResultData(mockData)
  },

  // 获取音准建议
  getPitchAdvice(score) {
    if (score >= 90) return '音准表现优秀，音高控制非常准确'
    if (score >= 80) return '音准良好，偶尔有轻微偏差'
    if (score >= 70) return '音准中等，建议多练习音阶和音程'
    if (score >= 60) return '音准需要加强，建议使用调音器辅助练习'
    return '音准较差，建议从基础音阶开始系统练习'
  },

  // 获取节奏建议
  getRhythmAdvice(score) {
    if (score >= 90) return '节奏感很强，节拍稳定准确'
    if (score >= 80) return '节奏感良好，基本能跟上节拍'
    if (score >= 70) return '节奏感中等，建议多听节拍器练习'
    if (score >= 60) return '节奏感需要提高，建议从简单节拍开始'
    return '节奏感较弱，建议加强节拍训练'
  },

  // 获取音量建议
  getVolumeAdvice(score) {
    if (score >= 90) return '音量控制优秀，强弱变化自然'
    if (score >= 80) return '音量控制良好，气息运用得当'
    if (score >= 70) return '音量控制中等，建议练习气息控制'
    if (score >= 60) return '音量控制需要改善，注意气息的运用'
    return '音量控制较差，建议加强气息训练'
  },

  // 获取音色建议
  getTimbreAdvice(score) {
    if (score >= 90) return '音色优美，共鸣运用恰当'
    if (score >= 80) return '音色良好，声音圆润动听'
    if (score >= 70) return '音色中等，可以更加圆润'
    if (score >= 60) return '音色需要改善，建议练习共鸣技巧'
    return '音色较差，建议加强共鸣训练'
  },

  // 获取等级描述
  getLevelDescription(score) {
    if (score >= 90) return '您的声乐水平已经达到专业级别'
    if (score >= 80) return '您的声乐水平很好，继续保持'
    if (score >= 70) return '您的声乐水平中等，还有提升空间'
    if (score >= 60) return '您的声乐水平需要加强练习'
    return '建议从基础开始系统学习声乐'
  },

  // 保存到历史记录
  saveToHistory(data) {
    const history = app.globalData.mockHistory || []
    const newRecord = {
      id: Date.now(),
      date: formatDate(new Date()),
      score: data.score,
      pitch: data.pitch,
      rhythm: data.rhythm,
      volume: data.volume,
      timbre: data.timbre,
      song: '自定义评测',
      duration: data.duration || 60
    }
    
    // 添加到历史记录开头
    history.unshift(newRecord)
    
    // 限制历史记录数量
    if (history.length > 20) {
      history.splice(20)
    }
    
    app.globalData.mockHistory = history
    
    // 更新用户统计
    const user = app.globalData.mockUser
    user.totalTests = history.length
    if (data.score > user.bestScore) {
      user.bestScore = data.score
    }
  },

  // 播放录音
  playRecord() {
    wx.showToast({
      title: '播放录音功能',
      icon: 'none'
    })
  },

  // 查看推荐
  viewRecommend() {
    wx.navigateTo({
      url: '/pages/recommend/recommend'
    })
  },

  // 分享结果
  shareResult() {
    // 保存当前评测结果到全局数据
    app.globalData.currentEvaluationResult = this.data.resultData
    
    // 跳转到分享页面
    wx.navigateTo({
      url: '/pages/share/share'
    })
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `我的声乐评测得分：${this.data.resultData.score}分`,
      imageUrl: '/images/share-result.png'
    }
  }
})
