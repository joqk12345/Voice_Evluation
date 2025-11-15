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
    recordFilePath: null, // 录音文件路径
    isPlaying: false, // 是否正在播放
    audioContext: null, // 音频上下文
    isVoice: true, // 是否检测到人声
    voiceReason: '', // 人声检测原因
    durationCheck: null, // 时长检测结果
    melodyCheck: null, // 旋律检测结果
    hasWaveform: false, // 是否有波形数据
    waveformData: [], // 波形数据
    pitchData: [] // 音高数据
  },

  onLoad(options) {
    // 获取传入的评测数据
    if (options.data) {
      try {
        const resultData = JSON.parse(decodeURIComponent(options.data))
        this.setData({
          resultData: resultData,
          currentDate: formatDate(new Date()),
          recordFilePath: resultData.recordFilePath || null,
          hasWaveform: resultData.hasWaveform || false,
          waveformData: resultData.waveformData || [],
          pitchData: resultData.pitchData || []
        })
        this.processResultData(resultData)
        
        // 如果有波形数据，绘制波形和音高
        if (resultData.hasWaveform && resultData.waveformData && resultData.waveformData.length > 0) {
          setTimeout(() => {
            this.drawWaveformWithPitch()
          }, 300)
        }
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

  onUnload() {
    // 页面卸载时停止播放并销毁音频
    if (this.data.audioContext) {
      this.data.audioContext.stop()
      this.data.audioContext.destroy()
      this.setData({
        audioContext: null,
        isPlaying: false
      })
    }
  },

  // 处理评测数据
  processResultData(data) {
    // 检查是否检测到人声（只有当人声检测启用且检测到非人声时才显示提示）
    if (data.isVoice === false && data.voiceReason && !data.voiceReason.includes('已禁用')) {
      // 非人声音频，显示提示
      wx.showModal({
        title: '检测到非人声音频',
        content: data.voiceReason || '未检测到人声，请确保录制的是您的歌声。',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          // 继续显示结果，但分数会很低
        }
      })
    }
    
    // 获取评分等级
    const scoreLevel = getScoreLevel(data.score)
    
    // 构建指标列表
    const metricsList = [
      {
        name: '音准',
        score: data.pitch || 0,
        icon: '🎵',
        advice: this.getPitchAdvice(data.pitch || 0, data.isVoice)
      },
      {
        name: '节奏',
        score: data.rhythm || 0,
        icon: '🎼',
        advice: this.getRhythmAdvice(data.rhythm || 0, data.isVoice)
      },
      {
        name: '音量',
        score: data.volume || 0,
        icon: '🔊',
        advice: this.getVolumeAdvice(data.volume || 0, data.isVoice)
      },
      {
        name: '音色',
        score: data.timbre || 0,
        icon: '🎤',
        advice: this.getTimbreAdvice(data.timbre || 0, data.isVoice)
      }
    ]

    // 获取改进建议
    let adviceList = getEvaluationAdvice(data)

    // 如果不是人声且人声检测已启用，添加特殊建议
    if (data.isVoice === false && data.voiceReason && !data.voiceReason.includes('已禁用')) {
      adviceList = [
        '⚠️ 未检测到人声，请确保录制的是您的歌声',
        '请避免录制背景音乐、环境噪音等非人声音频',
        '建议在安静的环境中，对着麦克风清晰歌唱',
        ...adviceList
      ]
    }
    
    // 添加时长检测建议
    if (data.durationCheck && data.durationCheck.penalty > 0) {
      adviceList.unshift(data.durationCheck.reason)
    }
    
    // 添加旋律检测建议
    if (data.melodyCheck && !data.melodyCheck.hasMelody) {
      adviceList.unshift(data.melodyCheck.reason)
    } else if (data.melodyCheck && data.melodyCheck.melodyScore < 50) {
      adviceList.unshift('旋律变化不够明显，建议增加音高变化')
    }

    this.setData({
      scoreLevel: scoreLevel,
      metricsList: metricsList,
      adviceList: adviceList,
      isVoice: data.isVoice !== false, // 默认为 true
      voiceReason: data.voiceReason || '',
      durationCheck: data.durationCheck || null,
      melodyCheck: data.melodyCheck || null
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
  getPitchAdvice(score, isVoice = true) {
    if (isVoice === false) {
      return '未检测到人声，无法评估音准'
    }
    if (score >= 90) return '音准很棒！继续保持 💪'
    if (score >= 80) return '音准不错，偶尔有偏差很正常'
    if (score >= 70) return '多练习音阶，会越来越好 🌱'
    if (score >= 60) return '可以尝试用调音器辅助练习'
    return '从基础音阶开始，慢慢来会进步的 ✨'
  },

  // 获取节奏建议
  getRhythmAdvice(score, isVoice = true) {
    if (isVoice === false) {
      return '未检测到人声，无法评估节奏'
    }
    if (score >= 90) return '节奏感很强！继续保持 🎯'
    if (score >= 80) return '节奏感不错，基本跟上节拍了'
    if (score >= 70) return '多听节拍器练习会有帮助'
    if (score >= 60) return '从简单的节拍开始练习'
    return '多跟着节拍器练习，节奏感会提升的 💪'
  },

  // 获取音量建议
  getVolumeAdvice(score, isVoice = true) {
    if (isVoice === false) {
      return '未检测到人声，无法评估音量'
    }
    if (score >= 90) return '音量控制很棒！强弱变化自然 🎵'
    if (score >= 80) return '音量控制不错，气息运用得当'
    if (score >= 70) return '多练习气息控制会更好'
    if (score >= 60) return '注意气息的运用，慢慢改善'
    return '加强气息训练，音量控制会进步的 🌱'
  },

  // 获取音色建议
  getTimbreAdvice(score, isVoice = true) {
    if (isVoice === false) {
      return '未检测到人声，无法评估音色'
    }
    if (score >= 90) return '音色优美！共鸣运用很棒 🎤'
    if (score >= 80) return '音色不错，声音圆润动听'
    if (score >= 70) return '可以练习让声音更加圆润'
    if (score >= 60) return '多练习共鸣技巧会改善音色'
    return '从共鸣训练开始，音色会慢慢变好的 ✨'
  },

  // 获取结果标题（情绪化）
  getResultTitle(score) {
    if (score >= 90) return '太棒了！🎉'
    if (score >= 80) return '表现不错！👍'
    if (score >= 70) return '继续加油！💪'
    if (score >= 60) return '还有进步空间 🌱'
    return '多练习会更好 ✨'
  },

  // 获取等级描述
  getLevelDescription(score) {
    if (score >= 90) return '您的声乐水平已经达到专业级别，非常优秀！'
    if (score >= 80) return '您的声乐水平很好，继续保持练习'
    if (score >= 70) return '您的声乐水平中等，还有很大的提升空间'
    if (score >= 60) return '您的声乐水平需要加强练习，多唱会越来越好'
    return '建议从基础开始系统学习，坚持练习会有进步'
  },

  // 保存到历史记录
  saveToHistory(data) {
    const history = app.globalData.mockHistory || []
    const newRecord = {
      id: Date.now(),
      date: formatDate(new Date()),
      timestamp: Date.now(), // 添加时间戳用于排序和对比
      score: data.score,
      pitch: data.pitch,
      rhythm: data.rhythm,
      volume: data.volume,
      timbre: data.timbre,
      song: data.song || '自定义评测', // 支持歌曲名称
      duration: data.duration || 60,
      recordFilePath: this.data.recordFilePath || null, // 保存录音文件路径
      hasWaveform: this.data.hasWaveform || false,
      waveformData: this.data.waveformData || [],
      pitchData: this.data.pitchData || [],
      // 保存详细分析数据用于对比
      analysis: data.analysis || {}
    }
    
    // 添加到历史记录开头
    history.unshift(newRecord)
    
    // 限制历史记录数量（增加到50条，支持更多对比）
    if (history.length > 50) {
      history.splice(50)
    }
    
    app.globalData.mockHistory = history
    
    // 同时保存到本地存储（持久化）
    try {
      wx.setStorageSync('voice_evaluation_history', history)
    } catch (e) {
      console.error('保存历史记录到本地存储失败:', e)
    }
    
    // 更新用户统计
    const user = app.globalData.mockUser
    user.totalTests = history.length
    if (data.score > user.bestScore) {
      user.bestScore = data.score
    }
  },

  // 播放录音
  playRecord() {
    const recordFilePath = this.data.recordFilePath
    
    if (!recordFilePath) {
      wx.showToast({
        title: '没有录音文件',
        icon: 'none'
      })
      return
    }

    // 如果正在播放，则停止
    if (this.data.isPlaying && this.data.audioContext) {
      this.stopRecord()
      return
    }

    // 创建音频上下文
    const audioContext = wx.createInnerAudioContext()
    audioContext.src = recordFilePath
    audioContext.autoplay = true

    // 播放开始
    audioContext.onPlay(() => {
      console.log('开始播放录音')
      this.setData({
        isPlaying: true,
        audioContext: audioContext
      })
    })

    // 播放结束
    audioContext.onEnded(() => {
      console.log('播放结束')
      this.setData({
        isPlaying: false
      })
      audioContext.destroy()
      this.setData({
        audioContext: null
      })
    })

    // 播放错误
    audioContext.onError((err) => {
      console.error('播放错误:', err)
    wx.showToast({
        title: '播放失败，请重试',
      icon: 'none'
    })
      this.setData({
        isPlaying: false
      })
      audioContext.destroy()
      this.setData({
        audioContext: null
      })
    })

    // 播放暂停
    audioContext.onPause(() => {
      this.setData({
        isPlaying: false
      })
    })
  },

  // 停止播放
  stopRecord() {
    if (this.data.audioContext) {
      this.data.audioContext.stop()
      this.data.audioContext.destroy()
      this.setData({
        audioContext: null,
        isPlaying: false
      })
    }
  },

  // 查看推荐
  viewRecommend() {
    wx.navigateTo({
      url: '/pages/recommend/recommend'
    })
  },

  // 显示分享菜单
  showShareMenu() {
    const score = this.data.resultData.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    
    wx.showActionSheet({
      itemList: ['分享给微信好友', '分享到朋友圈', '生成分享图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 分享给微信好友
          this.shareToFriend()
        } else if (res.tapIndex === 1) {
          // 分享到朋友圈
          this.shareToTimeline()
        } else if (res.tapIndex === 2) {
          // 生成分享图片
          this.shareResult()
        }
      },
      fail: (err) => {
        console.error('显示分享菜单失败:', err)
      }
    })
  },

  // 分享给微信好友
  shareToFriend() {
    const score = this.data.resultData.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    
    wx.showToast({
      title: '请点击右上角菜单分享',
      icon: 'none',
      duration: 2000
    })
    
    // 提示用户使用右上角菜单
    setTimeout(() => {
      wx.showModal({
        title: '分享给好友',
        content: '请点击右上角"..."按钮，选择"转发"即可分享给微信好友',
        showCancel: false,
        confirmText: '我知道了'
    })
    }, 500)
  },

  // 分享到朋友圈
  shareToTimeline() {
    const score = this.data.resultData.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    
    wx.showToast({
      title: '请点击右上角菜单分享',
      icon: 'none',
      duration: 2000
    })
    
    // 提示用户使用右上角菜单
    setTimeout(() => {
      wx.showModal({
        title: '分享到朋友圈',
        content: '请点击右上角"..."按钮，选择"分享到朋友圈"即可',
        showCancel: false,
        confirmText: '我知道了'
      })
    }, 500)
  },

  // 生成分享图片
  generateShareImage() {
    wx.showLoading({
      title: '正在生成图片...',
      mask: true
    })

    const data = this.data.resultData
    const score = data.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    
    // 优先使用旧版 API，更稳定可靠
    try {
      this.drawShareImageOld()
    } catch (error) {
      console.error('使用旧版 API 失败，尝试新版 API:', error)
      // 如果旧版失败，尝试新版
      this.drawShareImageNew(score, scoreLevel, data)
    }
  },

  // 使用新版 Canvas API
  drawShareImageNew(score, scoreLevel, data) {
    const query = wx.createSelectorQuery().in(this)
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('无法获取 Canvas node，使用旧版 API')
          wx.hideLoading()
          this.drawShareImageOld()
          return
        }
        
        try {
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            throw new Error('无法获取 Canvas 上下文')
          }
          
          const dpr = wx.getSystemInfoSync().pixelRatio || 1
          const width = 750
          const height = 1334
          
          canvas.width = width * dpr
          canvas.height = height * dpr
          ctx.scale(dpr, dpr)
          
          // 绘制内容
          this.drawShareImageContent(ctx, score, scoreLevel, data)
          
          // 等待绘制完成后再转换
          setTimeout(() => {
            wx.canvasToTempFilePath({
              canvas: canvas,
              success: (res) => {
                wx.hideLoading()
                this.saveImageToAlbum(res.tempFilePath)
              },
              fail: (err) => {
                console.error('生成图片失败:', err)
                wx.hideLoading()
                wx.showToast({
                  title: '生成图片失败：' + (err.errMsg || '未知错误'),
                  icon: 'none',
                  duration: 3000
                })
              }
            })
          }, 300) // 等待 300ms 确保绘制完成
        } catch (error) {
          console.error('新版 Canvas API 错误:', error)
          wx.hideLoading()
          // 降级使用旧版 API
          this.drawShareImageOld()
        }
      })
  },

  // 使用旧版Canvas API绘制图片（更稳定可靠）
  drawShareImageOld() {
    try {
      const ctx = wx.createCanvasContext('shareCanvas', this)
      const data = this.data.resultData
      const score = data.score || 0
      const scoreLevel = this.data.scoreLevel.level || '初级'
      
      this.drawShareImageContentOld(ctx, score, scoreLevel, data)
      
      // 使用回调确保绘制完成
      ctx.draw(false, () => {
        // 等待绘制完成后再转换
        setTimeout(() => {
          this.saveCanvasToAlbum()
        }, 500)
      })
    } catch (error) {
      console.error('旧版 Canvas API 绘制失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '生成图片失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 绘制分享图片内容（旧版API）
  drawShareImageContentOld(ctx, score, scoreLevel, data) {
    const width = 750
    const height = 1334
    
    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#fef7ed')
    gradient.addColorStop(1, '#ffffff')
    ctx.setFillStyle(gradient)
    ctx.fillRect(0, 0, width, height)
    
    // 绘制标题
    ctx.setFillStyle('#1f2937')
    ctx.setFontSize(48)
    ctx.setTextAlign('center')
    ctx.fillText('声乐评测结果', width / 2, 120)
    
    // 绘制分数圆形
    const centerX = width / 2
    const scoreY = 280
    const radius = 120
    
    // 圆形背景渐变
    const scoreGradient = ctx.createCircularGradient(centerX, scoreY, radius)
    scoreGradient.addColorStop(0, '#ffad70')
    scoreGradient.addColorStop(1, '#ff9a56')
    ctx.setFillStyle(scoreGradient)
    ctx.beginPath()
    ctx.arc(centerX, scoreY, radius, 0, Math.PI * 2)
    ctx.fill()
    
    // 绘制分数
    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(80)
    ctx.setTextAlign('center')
    ctx.fillText(score.toString(), centerX, scoreY + 25)
    
    // 绘制"分"字
    ctx.setFontSize(32)
    ctx.fillText('分', centerX, scoreY + 65)
    
    // 绘制等级
    ctx.setFillStyle('#ff9a56')
    ctx.setFontSize(40)
    ctx.fillText(scoreLevel, centerX, scoreY + 120)
    
    // 绘制指标
    const metrics = [
      { name: '音准', score: data.pitch || 0 },
      { name: '节奏', score: data.rhythm || 0 },
      { name: '音量', score: data.volume || 0 },
      { name: '音色', score: data.timbre || 0 }
    ]
    
    let startY = 500
    metrics.forEach((metric, index) => {
      const y = startY + index * 120
      
      // 绘制指标名称
      ctx.setFillStyle('#1f2937')
      ctx.setFontSize(32)
      ctx.setTextAlign('left')
      ctx.fillText(metric.name, 80, y)
      
      // 绘制分数
      ctx.setFillStyle('#ff9a56')
      ctx.setFontSize(36)
      ctx.setTextAlign('right')
      ctx.fillText(`${metric.score}分`, width - 80, y)
      
      // 绘制进度条
      const barWidth = width - 160
      const barHeight = 8
      const barX = 80
      const barY = y + 40
      
      // 背景
      ctx.setFillStyle('#f3f4f6')
      ctx.fillRect(barX, barY, barWidth, barHeight)
      
      // 进度
      const progressWidth = (metric.score / 100) * barWidth
      ctx.setFillStyle('#ff9a56')
      ctx.fillRect(barX, barY, progressWidth, barHeight)
    })
    
    // 绘制日期
    ctx.setFillStyle('#6b7280')
    ctx.setFontSize(24)
    ctx.setTextAlign('center')
    ctx.fillText(this.data.currentDate, width / 2, height - 100)
    
    // 绘制小程序码提示
    ctx.setFillStyle('#9ca3af')
    ctx.setFontSize(22)
    ctx.fillText('扫码体验声乐评测', width / 2, height - 60)
  },


  // 绘制分享图片内容
  drawShareImageContent(ctx, score, scoreLevel, data) {
    const width = 750
    const height = 1334
    
    // 绘制背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#fef7ed')
    gradient.addColorStop(1, '#ffffff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // 绘制标题
    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('声乐评测结果', width / 2, 120)
    
    // 绘制分数圆形
    const centerX = width / 2
    const scoreY = 280
    const radius = 120
    
    // 圆形背景渐变
    const scoreGradient = ctx.createRadialGradient(centerX, scoreY, 0, centerX, scoreY, radius)
    scoreGradient.addColorStop(0, '#ffad70')
    scoreGradient.addColorStop(1, '#ff9a56')
    ctx.fillStyle = scoreGradient
    ctx.beginPath()
    ctx.arc(centerX, scoreY, radius, 0, Math.PI * 2)
    ctx.fill()
    
    // 绘制分数
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 80px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(score.toString(), centerX, scoreY + 25)
    
    // 绘制"分"字
    ctx.font = '32px sans-serif'
    ctx.fillText('分', centerX, scoreY + 65)
    
    // 绘制等级
    ctx.fillStyle = '#ff9a56'
    ctx.font = 'bold 40px sans-serif'
    ctx.fillText(scoreLevel, centerX, scoreY + 120)
    
    // 绘制指标
    const metrics = [
      { name: '音准', score: data.pitch || 0, icon: '🎵' },
      { name: '节奏', score: data.rhythm || 0, icon: '🎼' },
      { name: '音量', score: data.volume || 0, icon: '🔊' },
      { name: '音色', score: data.timbre || 0, icon: '🎤' }
    ]
    
    let startY = 500
    metrics.forEach((metric, index) => {
      const y = startY + index * 120
      
      // 绘制指标名称
      ctx.fillStyle = '#1f2937'
      ctx.font = '32px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${metric.icon} ${metric.name}`, 80, y)
      
      // 绘制分数
      ctx.fillStyle = '#ff9a56'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${metric.score}分`, width - 80, y)
      
      // 绘制进度条
      const barWidth = width - 160
      const barHeight = 8
      const barX = 80
      const barY = y + 40
      
      // 背景
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(barX, barY, barWidth, barHeight)
      
      // 进度
      const progressWidth = (metric.score / 100) * barWidth
      const barGradient = ctx.createLinearGradient(barX, barY, barX + progressWidth, barY)
      barGradient.addColorStop(0, '#ff9a56')
      barGradient.addColorStop(1, '#ffad70')
      ctx.fillStyle = barGradient
      ctx.fillRect(barX, barY, progressWidth, barHeight)
    })
    
    // 绘制日期
    ctx.fillStyle = '#6b7280'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(this.data.currentDate, width / 2, height - 100)
    
    // 绘制小程序码提示
    ctx.fillStyle = '#9ca3af'
    ctx.font = '22px sans-serif'
    ctx.fillText('扫码体验声乐评测', width / 2, height - 60)
  },

  // 保存Canvas到相册（旧版API）
  saveCanvasToAlbum() {
    try {
      wx.canvasToTempFilePath({
        canvasId: 'shareCanvas',
        success: (res) => {
          console.log('Canvas 转图片成功:', res.tempFilePath)
          if (res.tempFilePath) {
            this.saveImageToAlbum(res.tempFilePath)
          } else {
            wx.hideLoading()
            wx.showToast({
              title: '生成图片路径为空',
              icon: 'none'
            })
          }
        },
        fail: (err) => {
          console.error('Canvas 转图片失败:', err)
          wx.hideLoading()
          wx.showToast({
            title: '生成图片失败：' + (err.errMsg || '未知错误'),
            icon: 'none',
            duration: 3000
          })
        }
      }, this)
    } catch (error) {
      console.error('保存 Canvas 到相册异常:', error)
      wx.hideLoading()
      wx.showToast({
        title: '生成图片异常，请重试',
        icon: 'none'
      })
    }
  },

  // 保存图片到相册
  saveImageToAlbum(filePath) {
    if (!filePath) {
      wx.hideLoading()
      wx.showToast({
        title: '图片路径无效',
        icon: 'none'
      })
      return
    }

    console.log('准备保存图片到相册:', filePath)
    
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.hideLoading()
        wx.showModal({
          title: '保存成功',
          content: '图片已保存到相册，您可以前往相册分享到朋友圈或发送给微信好友',
          showCancel: false,
          confirmText: '我知道了'
        })
      },
      fail: (err) => {
        console.error('保存图片到相册失败:', err)
        wx.hideLoading()
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存图片需要访问相册权限，请在设置中开启',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          wx.showToast({
            title: '保存失败：' + (err.errMsg || '未知错误'),
            icon: 'none',
            duration: 3000
          })
        }
      }
    })
  },

  // 绘制波形和音高（参考 tobiplayer 设计）
  drawWaveformWithPitch() {
    const waveformData = this.data.waveformData || []
    const pitchData = this.data.pitchData || []
    
    console.log('📊 开始绘制结果页面波形，数据点数:', waveformData.length, '音高点数:', pitchData.length)
    
    if (waveformData.length === 0) {
      console.warn('⚠️ 波形数据为空，无法绘制')
      return
    }
    
    try {
      const ctx = wx.createCanvasContext('resultWaveformCanvas', this)
      
      // 使用新 API 获取系统信息（避免 deprecated 警告）
      let screenWidth = 375
      let pixelRatio = 2
      try {
        const windowInfo = wx.getWindowInfo()
        const deviceInfo = wx.getDeviceInfo()
        screenWidth = windowInfo.screenWidth || 375
        pixelRatio = deviceInfo.pixelRatio || 2
      } catch (e) {
        // 降级：使用旧 API
        const systemInfo = wx.getSystemInfoSync()
        screenWidth = systemInfo.screenWidth || 375
        pixelRatio = systemInfo.pixelRatio || 2
      }
      const width = (700 * screenWidth / 750) * pixelRatio
      const height = (500 * screenWidth / 750) * pixelRatio
      
      // 清空并绘制背景
      ctx.clearRect(0, 0, width, height)
      this.drawCanvasBackground(ctx, width, height)
      
      // 绘制波形
      const dataLength = waveformData.length
      const displayLength = Math.min(dataLength, 500)
      const startIndex = Math.max(0, dataLength - displayLength)
      
      // 绘制波形填充
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
      
      // 绘制音高曲线
      const validPitches = pitchData.filter(p => p >= 80 && p <= 1000)
      
      if (validPitches.length > 0) {
        const minPitch = 80
        const maxPitch = 1000
        const pitchRange = maxPitch - minPitch
        
        const pitchDisplayLength = Math.min(validPitches.length, displayLength)
        const pitchStartIndex = Math.max(0, validPitches.length - pitchDisplayLength)
        
        ctx.setStrokeStyle('#4a90e2')
        ctx.setLineWidth(2.5)
        ctx.beginPath()
        
        for (let i = 0; i < pitchDisplayLength; i++) {
          const pitchIndex = pitchStartIndex + i
          const pitch = validPitches[pitchIndex]
          const x = (i / displayLength) * width
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
      
      ctx.draw()
    } catch (error) {
      console.error('绘制波形和音高失败:', error)
    }
  },

  // 绘制canvas背景和网格
  drawCanvasBackground(ctx, width, height) {
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, width, height)
    
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

  // 分享给微信好友（小程序右上角菜单触发）
  onShareAppMessage() {
    const score = this.data.resultData.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    const title = this.getResultTitle(score)
    
    return {
      title: `${title} 我的声乐评测得分：${score}分（${scoreLevel}）`,
      path: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(this.data.resultData))}`,
      imageUrl: '/images/share-card.png' // 可以使用生成的分享图片
    }
  },

  // 分享到朋友圈（小程序右上角菜单触发）
  onShareTimeline() {
    const score = this.data.resultData.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    
    return {
      title: `🎤 我的声乐评测得分：${score}分（${scoreLevel}）`,
      query: `data=${encodeURIComponent(JSON.stringify(this.data.resultData))}`,
      imageUrl: '/images/share-card.png' // 可以使用生成的分享图片
    }
  }
})
