// pages/history/history.js
const app = getApp()
const { formatDate } = require('../../utils/util.js')

Page({
  data: {
    historyList: [],
    totalTests: 0,
    bestScore: 0,
    averageScore: 0,
    improvement: 0,
    trendData: [],
    currentFilter: 'all',
    playingId: null, // 正在播放的记录ID
    audioContext: null, // 音频上下文
    selectedItems: [], // 选中的记录用于对比
    showComparison: false, // 是否显示对比
    comparisonData: null // 对比数据
  },

  onLoad() {
    this.loadHistoryData()
  },

  onShow() {
    // 更新tabBar选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
    // 每次显示页面时刷新数据
    this.loadHistoryData()
  },

  // 加载历史数据
  loadHistoryData() {
    // 优先从本地存储加载，如果没有则从全局数据加载
    let history = []
    try {
      const localHistory = wx.getStorageSync('voice_evaluation_history')
      if (localHistory && localHistory.length > 0) {
        history = localHistory
        // 同步到全局数据
        app.globalData.mockHistory = history
      } else {
        history = app.globalData.mockHistory || []
      }
    } catch (e) {
      console.error('加载历史记录失败:', e)
      history = app.globalData.mockHistory || []
    }
    
    // 按时间戳排序（最新的在前）
    history.sort((a, b) => {
      const timeA = a.timestamp || (a.id || 0)
      const timeB = b.timestamp || (b.id || 0)
      return timeB - timeA
    })
    
    // 初始化选中状态
    history.forEach(item => {
      item.selected = false
    })
    
    this.setData({
      historyList: history
    })
    
    this.calculateStats(history)
    this.generateTrendData(history)
    this.analyzeChanges(history)
  },

  // 计算统计数据
  calculateStats(history) {
    if (history.length === 0) {
      this.setData({
        totalTests: 0,
        bestScore: 0,
        averageScore: 0,
        improvement: 0
      })
      return
    }

    const totalTests = history.length
    const scores = history.map(item => item.score || 0).filter(score => score > 0)
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
    
    // 计算进步幅度（最新分数 - 最早分数）
    let improvement = 0
    if (history.length > 1 && scores.length > 0) {
      const latestScore = scores[0]
      const earliestScore = scores[scores.length - 1]
      improvement = latestScore - earliestScore
    }

    this.setData({
      totalTests: totalTests,
      bestScore: bestScore,
      averageScore: averageScore,
      improvement: improvement
    })
  },

  // 生成趋势数据
  generateTrendData(history) {
    if (history.length < 2) {
      this.setData({
        trendData: []
      })
      return
    }

    // 取最近10条记录
    const recentHistory = history.slice(0, 10).reverse()
    const maxScore = Math.max(...recentHistory.map(item => item.score))
    
    const trendData = recentHistory.map(item => {
      const height = (item.score / maxScore) * 200 // 最大高度200rpx
      return {
        score: item.score,
        height: Math.max(height, 20), // 最小高度20rpx
        date: item.date.split('-').slice(1).join('/') // 只显示月/日
      }
    })

    this.setData({
      trendData: trendData
    })
  },

  // 查看详情
  viewDetail(e) {
    const item = e.currentTarget.dataset.item
    // 跳转到结果页面，传递数据
    wx.navigateTo({
      url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(item))}`
    })
  },

  // 播放录音
  playRecord(e) {
    e.stopPropagation() // 阻止事件冒泡
    const item = e.currentTarget.dataset.item
    const recordFilePath = item.recordFilePath
    
    if (!recordFilePath) {
      wx.showToast({
        title: '没有录音文件',
        icon: 'none'
      })
      return
    }

    // 如果正在播放同一条录音，则停止
    if (this.data.playingId === item.id && this.data.audioContext) {
      this.stopRecord()
      return
    }

    // 如果正在播放其他录音，先停止
    if (this.data.audioContext) {
      this.stopRecord()
    }

    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext()
    audioContext.src = recordFilePath
    audioContext.autoplay = true

    audioContext.onPlay(() => {
      this.setData({
        playingId: item.id,
        audioContext: audioContext
      })
    })

    audioContext.onEnded(() => {
      this.setData({
        playingId: null,
        audioContext: null
      })
      audioContext.destroy()
    })

    audioContext.onError((err) => {
      console.error('播放录音失败:', err)
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      })
      this.setData({
        playingId: null,
        audioContext: null
      })
      audioContext.destroy()
    })
  },

  // 停止播放
  stopRecord() {
    if (this.data.audioContext) {
      this.data.audioContext.stop()
      this.data.audioContext.destroy()
      this.setData({
        playingId: null,
        audioContext: null
      })
    }
  },

  // 分析变化趋势
  analyzeChanges(history) {
    if (history.length < 2) return

    // 计算最近几次的变化
    const recentChanges = []
    for (let i = 0; i < Math.min(5, history.length - 1); i++) {
      const current = history[i]
      const previous = history[i + 1]
      
      const change = {
        date: current.date,
        scoreChange: current.score - previous.score,
        pitchChange: current.pitch - previous.pitch,
        rhythmChange: current.rhythm - previous.rhythm,
        volumeChange: current.volume - previous.volume,
        timbreChange: current.timbre - previous.timbre
      }
      recentChanges.push(change)
    }

    // 保存到数据中（可以在UI中显示）
    this.setData({
      recentChanges: recentChanges
    })
  },

  // 选择记录进行对比
  selectForComparison(e) {
    e.stopPropagation()
    const item = e.currentTarget.dataset.item
    const selectedItems = this.data.selectedItems || []
    const historyList = this.data.historyList || []
    const index = selectedItems.findIndex(selected => selected.id === item.id)
    
    if (index > -1) {
      // 已选中，取消选中
      selectedItems.splice(index, 1)
      // 更新列表中的选中状态
      const itemIndex = historyList.findIndex(h => h.id === item.id)
      if (itemIndex > -1) {
        historyList[itemIndex].selected = false
      }
    } else {
      // 未选中，添加到选中列表（最多选2条进行对比）
      if (selectedItems.length >= 2) {
        wx.showToast({
          title: '最多选择2条记录对比',
          icon: 'none'
        })
        return
      }
      selectedItems.push(item)
      // 更新列表中的选中状态
      const itemIndex = historyList.findIndex(h => h.id === item.id)
      if (itemIndex > -1) {
        historyList[itemIndex].selected = true
      }
    }
    
    this.setData({
      selectedItems: selectedItems,
      historyList: historyList
    })
    
    // 如果选中了2条，自动显示对比
    if (selectedItems.length === 2) {
      this.showComparison(selectedItems)
    }
  },

  // 显示对比
  showComparison(selectedItems) {
    if (!selectedItems || selectedItems.length !== 2) {
      wx.showToast({
        title: '请选择2条记录进行对比',
        icon: 'none'
      })
      return
    }

    const [item1, item2] = selectedItems
    const comparison = {
      item1: item1,
      item2: item2,
      scoreDiff: item1.score - item2.score,
      pitchDiff: item1.pitch - item2.pitch,
      rhythmDiff: item1.rhythm - item2.rhythm,
      volumeDiff: item1.volume - item2.volume,
      timbreDiff: item1.timbre - item2.timbre,
      // 分析差异点
      improvements: [],
      regressions: [],
      keyDifferences: []
    }

    // 分析改进点
    if (item1.score > item2.score) {
      if (item1.pitch > item2.pitch) comparison.improvements.push('音准提升')
      if (item1.rhythm > item2.rhythm) comparison.improvements.push('节奏更稳定')
      if (item1.volume > item2.volume) comparison.improvements.push('音量更合适')
      if (item1.timbre > item2.timbre) comparison.improvements.push('音色更丰富')
    } else {
      if (item1.pitch < item2.pitch) comparison.regressions.push('音准下降')
      if (item1.rhythm < item2.rhythm) comparison.regressions.push('节奏不稳定')
      if (item1.volume < item2.volume) comparison.regressions.push('音量不合适')
      if (item1.timbre < item2.timbre) comparison.regressions.push('音色变差')
    }

    // 找出关键差异（变化最大的指标）
    const diffs = [
      { name: '音准', value: Math.abs(comparison.pitchDiff) },
      { name: '节奏', value: Math.abs(comparison.rhythmDiff) },
      { name: '音量', value: Math.abs(comparison.volumeDiff) },
      { name: '音色', value: Math.abs(comparison.timbreDiff) }
    ]
    diffs.sort((a, b) => b.value - a.value)
    comparison.keyDifferences = diffs.slice(0, 2).map(d => d.name)

    this.setData({
      showComparison: true,
      comparisonData: comparison
    })
  },

  // 关闭对比
  closeComparison() {
    const historyList = this.data.historyList || []
    // 清除所有选中状态
    historyList.forEach(item => {
      item.selected = false
    })
    
    this.setData({
      showComparison: false,
      comparisonData: null,
      selectedItems: [],
      historyList: historyList
    })
  },

  // 按歌曲分组对比
  compareBySong(songName) {
    const history = this.data.historyList || []
    const sameSongRecords = history.filter(item => item.song === songName)
    
    if (sameSongRecords.length < 2) {
      wx.showToast({
        title: '该歌曲只有1条记录',
        icon: 'none'
      })
      return
    }

    // 选择最近2条进行对比
    const recentTwo = sameSongRecords.slice(0, 2)
    this.showComparison(recentTwo)
  },

  // 分享记录
  shareRecord(e) {
    const item = e.currentTarget.dataset.item
    const shareData = {
      title: `我的声乐评测记录 - ${item.date} 得分：${item.score}分`,
      path: '/pages/index/index',
      imageUrl: '/images/share-record.png'
    }
    
    return shareData
  },

  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评测记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteRecordById(id)
        }
      }
    })
  },

  // 根据ID删除记录
  deleteRecordById(id) {
    const history = app.globalData.mockHistory || []
    const index = history.findIndex(item => item.id === id)
    
    if (index !== -1) {
      history.splice(index, 1)
      app.globalData.mockHistory = history
      
      // 同步到本地存储
      try {
        wx.setStorageSync('voice_evaluation_history', history)
      } catch (e) {
        console.error('保存历史记录失败:', e)
      }
      
      // 重新加载数据
      this.loadHistoryData()
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    }
  },

  onUnload() {
    // 页面卸载时停止播放
    this.stopRecord()
  },

  // 前往录音页面
  goToRecord() {
    wx.switchTab({
      url: '/pages/record/record'
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadHistoryData()
    wx.stopPullDownRefresh()
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的声乐评测历史',
      path: '/pages/history/history',
      imageUrl: '/images/share-history.png'
    }
  }
})
