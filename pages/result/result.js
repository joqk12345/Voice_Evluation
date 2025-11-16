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
    pitchData: [], // 音高数据
    // 新增：沉浸式分享页面数据
    animatedScore: 0, // 动画分数（从0到最终分数）
    personalizedMessage: '', // 个性化文案
    comparisonPercent: 0, // 超过XX%用户
    achievements: [] // 成就徽章列表
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
        // 处理数据（会应用分数梯度设置）
        this.processResultData(resultData)
        
        // 使用处理后的数据（从setData中获取更新后的resultData）
        const processedData = this.data.resultData
        
        // 启动分数动画（使用调整后的分数）
        this.animateScore(processedData.score)
        
        // 生成个性化文案（使用调整后的分数）
        this.generatePersonalizedMessage(processedData.score)
        
        // 计算数据对比（使用调整后的分数）
        this.calculateComparison(processedData.score)
        
        // 生成成就徽章（使用调整后的数据）
        this.generateAchievements(processedData)
        
        // 如果有波形数据，绘制波形和音高
        if (resultData.hasWaveform && resultData.waveformData && resultData.waveformData.length > 0) {
          setTimeout(() => {
            this.drawWaveformWithPitch()
          }, 300)
        }
        
        // 绘制分数圆环（使用调整后的分数）
        setTimeout(() => {
          this.drawScoreRing(processedData.score)
        }, 500)
        
        // 绘制声波形进度条
        setTimeout(() => {
          this.drawWaveformBars()
        }, 800)
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
    
    // 应用分数梯度设置（增加用户后续提升学习欲望）
    const adjustedScores = this.applyScoreGradient({
      pitch: data.pitch || 0,
      rhythm: data.rhythm || 0,
      volume: data.volume || 0,
      timbre: data.timbre || 0
    })
    
    // 获取评分等级（使用调整后的总分）
    const adjustedTotalScore = Math.round(
      adjustedScores.pitch * 0.3 + 
      adjustedScores.rhythm * 0.25 + 
      adjustedScores.volume * 0.25 + 
      adjustedScores.timbre * 0.2
    )
    const scoreLevel = getScoreLevel(adjustedTotalScore)
    
    // 构建指标列表（使用调整后的分数）
    const metricsList = [
      {
        name: '音准',
        score: adjustedScores.pitch,
        icon: '🎵',
        advice: this.getPitchAdvice(adjustedScores.pitch, data.isVoice),
        isHighScore: adjustedScores.pitch >= 70 // 用于视觉对比
      },
      {
        name: '节奏',
        score: adjustedScores.rhythm,
        icon: '🎼',
        advice: this.getRhythmAdvice(adjustedScores.rhythm, data.isVoice),
        isHighScore: adjustedScores.rhythm >= 70
      },
      {
        name: '音量',
        score: adjustedScores.volume,
        icon: '🔊',
        advice: this.getVolumeAdvice(adjustedScores.volume, data.isVoice),
        isHighScore: adjustedScores.volume >= 70
      },
      {
        name: '音色',
        score: adjustedScores.timbre,
        icon: '🎤',
        advice: this.getTimbreAdvice(adjustedScores.timbre, data.isVoice),
        isHighScore: adjustedScores.timbre >= 70
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

    // 更新总分（使用调整后的分数）
    const updatedData = {
      ...data,
      score: adjustedTotalScore,
      pitch: adjustedScores.pitch,
      rhythm: adjustedScores.rhythm,
      volume: adjustedScores.volume,
      timbre: adjustedScores.timbre
    }

    this.setData({
      resultData: updatedData,
      scoreLevel: scoreLevel,
      metricsList: metricsList,
      adviceList: adviceList,
      isVoice: data.isVoice !== false, // 默认为 true
      voiceReason: data.voiceReason || '',
      durationCheck: data.durationCheck || null,
      melodyCheck: data.melodyCheck || null
    })

    // 保存到历史记录（使用调整后的数据）
    this.saveToHistory(updatedData)
  },

  // 应用分数梯度设置（根据建议：30%概率1个50分+3个70分+，20%概率4个70分+，10%概率2个50分+2个70分，40%正常分布）
  applyScoreGradient(originalScores) {
    const random = Math.random()
    const scores = { ...originalScores }
    const scoreKeys = ['pitch', 'rhythm', 'volume', 'timbre']
    
    // 随机打乱顺序，确保每次应用梯度的指标不同
    const shuffledKeys = [...scoreKeys].sort(() => Math.random() - 0.5)
    
    if (random < 0.3) {
      // 30%概率: 1个50分左右, 3个70分+
      const lowScoreIndex = Math.floor(Math.random() * 4)
      scores[shuffledKeys[lowScoreIndex]] = Math.round(45 + Math.random() * 10) // 45-55分
      for (let i = 0; i < 4; i++) {
        if (i !== lowScoreIndex) {
          scores[shuffledKeys[i]] = Math.round(70 + Math.random() * 25) // 70-95分
        }
      }
    } else if (random < 0.5) {
      // 20%概率: 4个70分以上
      for (let i = 0; i < 4; i++) {
        scores[shuffledKeys[i]] = Math.round(70 + Math.random() * 25) // 70-95分
      }
    } else if (random < 0.6) {
      // 10%概率: 2个50分, 2个70分
      for (let i = 0; i < 2; i++) {
        scores[shuffledKeys[i]] = Math.round(45 + Math.random() * 10) // 45-55分
      }
      for (let i = 2; i < 4; i++) {
        scores[shuffledKeys[i]] = Math.round(70 + Math.random() * 20) // 70-90分
      }
    }
    // 剩余40%概率：保持原分数（不做调整）
    
    // 确保分数在0-100范围内
    for (const key of scoreKeys) {
      scores[key] = Math.max(0, Math.min(100, scores[key]))
    }
    
    return scores
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
    
    // 处理数据（会应用分数梯度设置）
    this.processResultData(mockData)
    
    // 使用处理后的数据（从setData中获取更新后的resultData）
    const processedData = this.data.resultData
    
    // 启动分数动画（使用调整后的分数）
    this.animateScore(processedData.score)
    
    // 生成个性化文案（使用调整后的分数）
    this.generatePersonalizedMessage(processedData.score)
    
    // 计算数据对比（使用调整后的分数）
    this.calculateComparison(processedData.score)
    
    // 生成成就徽章（使用调整后的数据）
    this.generateAchievements(processedData)
    
    // 绘制分数圆环（使用调整后的分数）
    setTimeout(() => {
      this.drawScoreRing(processedData.score)
    }, 500)
    
    // 绘制声波形进度条
    setTimeout(() => {
      this.drawWaveformBars()
    }, 800)
  },

  // ========== 沉浸式分享页面功能 ==========
  
  // 分数动画（0→最终分数，1.2s内）
  animateScore(finalScore) {
    const duration = 1200 // 1.2秒
    const steps = 60 // 60帧
    const stepTime = duration / steps
    const increment = finalScore / steps
    let currentScore = 0
    let step = 0
    
    const timer = setInterval(() => {
      step++
      currentScore = Math.min(finalScore, Math.round(increment * step))
      
      this.setData({
        animatedScore: currentScore
      })
      
      if (step >= steps || currentScore >= finalScore) {
        clearInterval(timer)
        this.setData({
          animatedScore: finalScore
        })
      }
    }, stepTime)
  },

  // 生成个性化文案（根据得分段）
  generatePersonalizedMessage(score) {
    let message = ''
    
    if (score < 70) {
      // 鼓励类
      const messages = [
        '每一次发声都是进步的开始 ✨',
        '你的声音有无限可能，继续加油 💪',
        '坚持练习，声音会越来越美 🌱',
        '今天的你比昨天更棒了！',
        '声音的成长需要时间，你已经很棒了'
      ]
      message = messages[Math.floor(Math.random() * messages.length)]
    } else if (score >= 70 && score < 85) {
      // 积极类
      const messages = [
        '你的声音温柔而有力量 💫',
        '表现不错，继续努力会更好',
        '你的声音很有潜力，加油！',
        '每一次练习都在进步 🌟',
        '你的声音正在发光发热'
      ]
      message = messages[Math.floor(Math.random() * messages.length)]
    } else {
      // 荣耀类
      const messages = [
        '你的声音如天籁之音 🎵',
        '完美的表现，你就是声音之星！',
        '你的声音征服了所有人 ✨',
        '专业级别的表现，太棒了！',
        '你的声音就是最美的旋律 🎤'
      ]
      message = messages[Math.floor(Math.random() * messages.length)]
    }
    
    this.setData({
      personalizedMessage: message
    })
  },

  // 计算数据对比（超过XX%用户）
  calculateComparison(score) {
    // 模拟数据：基于近30天全体平均值
    // 实际项目中应该从后端获取统计数据
    const mockAverageScores = [65, 68, 72, 70, 75, 73, 69, 71, 74, 76, 78, 80, 82, 79, 77, 75, 73, 71, 69, 67, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88]
    const averageScore = mockAverageScores.reduce((a, b) => a + b, 0) / mockAverageScores.length
    
    // 计算超过的用户百分比
    // 假设分数分布：score越高，超过的用户越多
    let comparisonPercent = 0
    if (score >= 90) {
      comparisonPercent = 95 + Math.random() * 5 // 95-100%
    } else if (score >= 85) {
      comparisonPercent = 85 + Math.random() * 10 // 85-95%
    } else if (score >= 80) {
      comparisonPercent = 70 + Math.random() * 15 // 70-85%
    } else if (score >= 75) {
      comparisonPercent = 55 + Math.random() * 15 // 55-70%
    } else if (score >= 70) {
      comparisonPercent = 40 + Math.random() * 15 // 40-55%
    } else if (score >= 65) {
      comparisonPercent = 25 + Math.random() * 15 // 25-40%
    } else {
      comparisonPercent = 10 + Math.random() * 15 // 10-25%
    }
    
    this.setData({
      comparisonPercent: Math.round(comparisonPercent)
    })
  },

  // 生成成就徽章（根据历史平均分和当前得分）
  generateAchievements(data) {
    const achievements = []
    const score = data.score || 0
    const pitch = data.pitch || 0
    const rhythm = data.rhythm || 0
    const volume = data.volume || 0
    const timbre = data.timbre || 0
    
    // 获取历史平均分
    const history = app.globalData.mockHistory || []
    const avgScore = history.length > 0 
      ? history.reduce((sum, item) => sum + (item.score || 0), 0) / history.length
      : score
    
    // 节奏达人（节奏分≥85）
    if (rhythm >= 85) {
      achievements.push({
        icon: '🎼',
        name: '节奏达人',
        desc: '你的节奏感超强！'
      })
    }
    
    // 声音之光（总分≥90）
    if (score >= 90) {
      achievements.push({
        icon: '✨',
        name: '声音之光',
        desc: '完美的声音表现！'
      })
    }
    
    // 音准大师（音准分≥88）
    if (pitch >= 88) {
      achievements.push({
        icon: '🎵',
        name: '音准大师',
        desc: '音准精准无误！'
      })
    }
    
    // 进步之星（历史平均分提升）
    if (history.length >= 3) {
      const recentScores = history.slice(0, 3).map(item => item.score || 0)
      const oldAvg = recentScores.slice(1).reduce((a, b) => a + b, 0) / (recentScores.length - 1)
      if (score > oldAvg + 5) {
        achievements.push({
          icon: '📈',
          name: '进步之星',
          desc: '持续进步中！'
        })
      }
    }
    
    // 稳定发挥（各项指标均衡，差异<10分）
    const scores = [pitch, rhythm, volume, timbre]
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    if (maxScore - minScore < 10 && score >= 75) {
      achievements.push({
        icon: '⚖️',
        name: '稳定发挥',
        desc: '各项指标均衡！'
      })
    }
    
    // 至少显示1个成就（如果没有任何成就，给予鼓励徽章）
    if (achievements.length === 0 && score >= 60) {
      achievements.push({
        icon: '🌟',
        name: '勇敢尝试',
        desc: '敢于发声就是胜利！'
      })
    }
    
    // 最多显示2个成就
    this.setData({
      achievements: achievements.slice(0, 2)
    })
  },

  // 计算"65分"所在容器在 canvas 内部的圆心（像素）
  getScoreTextCenter(callback) {
    const query = wx.createSelectorQuery().in(this)
    query.select('#scoreGroup').boundingClientRect()
    query.select('#scoreRingCanvas').boundingClientRect()
    query.exec(res => {
      const textRect = res[0]
      const canvasRect = res[1]
      if (!textRect || !canvasRect) { 
        callback(null)
        return 
      }

      // 将页面坐标换算成 canvas 内部坐标
      const cx = (textRect.left - canvasRect.left) + textRect.width / 2
      const cy = (textRect.top - canvasRect.top) + textRect.height / 2
      callback({ cx, cy })
    })
  },

  // 用"65分"的几何中心来画（带光效动画，增强版）
  drawScoreRing(score) {
    this.getScoreTextCenter((center) => {
      // 兜底：获取失败就用默认中心
      const cx = center ? center.cx : 150
      const cy = center ? center.cy : 150
      const radius = 120
      const lineWidth = 18
      const ctx = wx.createCanvasContext('scoreRingCanvas', this)

      // 背景环
      ctx.setStrokeStyle('rgba(255, 255, 255, 0.2)')
      ctx.setLineWidth(lineWidth)
      ctx.setLineCap('round')
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()

      // 进度
      const progress = Math.max(0, Math.min(1, score / 100))
      const startAngle = -Math.PI / 2  // 从顶部开始
      const endAngle = startAngle + Math.PI * 2 * progress

      // 光晕层（可保留你的三层）
      ctx.setStrokeStyle('rgba(255, 154, 86, 0.15)')
      ctx.setLineWidth(lineWidth + 12)
      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.stroke()

      ctx.setStrokeStyle('rgba(255, 173, 112, 0.25)')
      ctx.setLineWidth(lineWidth + 6)
      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.stroke()

      // 主渐变环
      const g = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy)
      g.addColorStop(0, '#ff9a56')
      g.addColorStop(0.3, '#ffad70')
      g.addColorStop(0.6, '#ffd700')
      g.addColorStop(1, '#ff9a56')
      ctx.setStrokeStyle(g)
      ctx.setLineWidth(lineWidth)
      ctx.setLineCap('round')
      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.stroke()

      // 内高光
      ctx.setStrokeStyle('rgba(255, 255, 255, 0.4)')
      ctx.setLineWidth(lineWidth - 8)
      ctx.beginPath()
      ctx.arc(cx, cy, radius, startAngle, endAngle)
      ctx.stroke()

      // 端点光点
      const endX = cx + Math.cos(endAngle) * radius
      const endY = cy + Math.sin(endAngle) * radius
      ctx.setFillStyle('rgba(255, 255, 255, 0.6)')
      ctx.beginPath()
      ctx.arc(endX, endY, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.setFillStyle('#fff')
      ctx.beginPath()
      ctx.arc(endX, endY, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.draw()
    })
  },

  // 绘制声波形进度条（优化版：高分波动明显，低分平缓）
  drawWaveformBars() {
    const metricsList = this.data.metricsList || []
    
    metricsList.forEach((metric, index) => {
      const canvasId = `waveformBar${index}`
      const ctx = wx.createCanvasContext(canvasId, this)
      const score = metric.score || 0
      const width = 300 // 进度条宽度
      const height = 48 // 进度条高度
      const progress = score / 100
      const barWidth = width * progress
      
      // 根据分数动态调整波幅和频率
      // 高分：波动明显（振幅大、频率高）
      // 低分：波动平缓（振幅小、频率低）
      let waveAmplitude, waveFrequency, waveCount
      
      if (score >= 85) {
        // 高分：波动明显
        waveAmplitude = height * 0.7
        waveFrequency = 0.8
        waveCount = Math.floor(barWidth / 6)
      } else if (score >= 70) {
        // 中高分：中等波动
        waveAmplitude = height * 0.5
        waveFrequency = 0.6
        waveCount = Math.floor(barWidth / 7)
      } else if (score >= 60) {
        // 中分：轻微波动
        waveAmplitude = height * 0.35
        waveFrequency = 0.4
        waveCount = Math.floor(barWidth / 8)
      } else {
        // 低分：平缓波动
        waveAmplitude = height * 0.2
        waveFrequency = 0.3
        waveCount = Math.floor(barWidth / 10)
      }
      
      // 根据分数高低创建不同颜色的渐变（视觉对比）
      const isHighScore = score >= 70
      const gradient = ctx.createLinearGradient(0, 0, barWidth, 0)
      
      if (isHighScore) {
        // 高分：橙色/金色渐变
        gradient.addColorStop(0, '#ff9a56')
        gradient.addColorStop(0.5, '#ffad70')
        gradient.addColorStop(1, '#ffd700')
      } else {
        // 低分：灰色/蓝色渐变
        gradient.addColorStop(0, '#9ca3af')
        gradient.addColorStop(0.5, '#6b7280')
        gradient.addColorStop(1, '#4b5563')
      }
      
      ctx.setFillStyle(gradient)
      
      // 绘制波形路径
      ctx.beginPath()
      const centerY = height / 2
      
      for (let i = 0; i < waveCount; i++) {
        const x = i * (barWidth / waveCount)
        const waveOffset = Math.sin(i * waveFrequency) * waveAmplitude
        const barHeight = Math.abs(waveOffset) + height * 0.3
        
        // 绘制波形柱（圆角矩形效果）
        const barY = centerY - barHeight / 2
        
        // 使用圆角矩形绘制（通过多个小矩形模拟）
        ctx.fillRect(x, barY, Math.max(4, barWidth / waveCount - 2), barHeight)
      }
      
      // 绘制顶部波形曲线（可选，增强视觉效果）
      if (score >= 70) {
        ctx.setStrokeStyle('rgba(255, 255, 255, 0.3)')
        ctx.setLineWidth(2)
        ctx.beginPath()
        
        for (let i = 0; i < waveCount; i++) {
          const x = i * (barWidth / waveCount)
          const waveOffset = Math.sin(i * waveFrequency) * waveAmplitude
          const y = centerY - Math.abs(waveOffset) - height * 0.15
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }
      
      ctx.draw()
    })
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

  // 练习一下 - 跳转到个性化练习页面
  viewRecommend() {
    const resultData = this.data.resultData
    const metricsList = this.data.metricsList || []
    
    // 找出分数不好的板块（低于70分的）
    const weakAreas = metricsList
      .filter(item => item.score < 70)
      .map(item => ({
        name: item.name,
        score: item.score,
        icon: item.icon,
        advice: item.advice
      }))
      .sort((a, b) => a.score - b.score) // 按分数从低到高排序
    
    // 构建传递的数据
    const practiceData = {
      score: resultData.score || 0,
      metrics: {
        pitch: resultData.pitch || 0,
        rhythm: resultData.rhythm || 0,
        volume: resultData.volume || 0,
        timbre: resultData.timbre || 0
      },
      weakAreas: weakAreas, // 需要重点练习的板块
      metricsList: metricsList // 完整的指标列表
    }
    
    // 跳转到推荐页面，传递评测数据
    wx.navigateTo({
      url: `/pages/recommend/recommend?data=${encodeURIComponent(JSON.stringify(practiceData))}`
    })
  },

  // 显示分享菜单（根据反馈优化：添加H5页面分享）
  showShareMenu() {
    const score = this.data.resultData.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    
    wx.showActionSheet({
      itemList: ['分享给微信好友', '分享到朋友圈', '生成分享图片', 'H5页面分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 分享给微信好友
          this.shareToFriend()
        } else if (res.tapIndex === 1) {
          // 分享到朋友圈
          this.shareToTimeline()
        } else if (res.tapIndex === 2) {
          // 生成分享图片
          this.generateShareImage()
        } else if (res.tapIndex === 3) {
          // H5页面分享（根据反馈优化）
          this.shareToH5()
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
          const height = 1800  // 增加高度，确保所有内容都能完整显示
          
          canvas.width = width * dpr
          canvas.height = height * dpr
          ctx.scale(dpr, dpr)
          
          // 绘制内容（异步，等待二维码加载）
          this.drawShareImageContent(ctx, score, scoreLevel, data).then(() => {
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
          }).catch((error) => {
            console.error('绘制分享图片失败:', error)
            wx.hideLoading()
            wx.showToast({
              title: '生成图片失败，请重试',
              icon: 'none',
              duration: 2000
            })
          })
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
      
      // 旧版API直接绘制（二维码会在drawShareImageContentOld中处理）
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

  // ========== 辅助函数：文本测量和布局 ==========
  
  // 工具：文本换行测量（适配新旧 API）
  wrapText(ctx, text, maxWidth, fontPx, lineHeightPx) {
    // 设置字体（兼容）
    if (ctx.font !== undefined) ctx.font = `${fontPx}px sans-serif`
    else if (ctx.setFontSize) ctx.setFontSize(fontPx)

    const words = text.split('') // 中文逐字
    const lines = []
    let line = ''

    for (let i = 0; i < words.length; i++) {
      const test = line + words[i]
      const width = (ctx.measureText && ctx.measureText(test).width) || (test.length * fontPx * 0.6)
      if (width > maxWidth && line) {
        lines.push(line)
        line = words[i]
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return { lines, height: lines.length * lineHeightPx }
  },

  // 工具：绘制段落（限行数，支持省略号）
  drawParagraph(ctx, text, x, y, maxWidth, fontPx, lineHeightPx, color = '#fff', maxLines = 0, alignCenter = true) {
    if (ctx.fillStyle !== undefined) ctx.fillStyle = color
    else if (ctx.setFillStyle) ctx.setFillStyle(color)
    
    if (ctx.font !== undefined) ctx.font = `${fontPx}px sans-serif`
    else if (ctx.setFontSize) ctx.setFontSize(fontPx)
    
    if (ctx.textAlign !== undefined) ctx.textAlign = alignCenter ? 'center' : 'left'
    else if (ctx.setTextAlign) ctx.setTextAlign(alignCenter ? 'center' : 'left')
    
    if (ctx.textBaseline !== undefined) ctx.textBaseline = 'top'
    else if (ctx.setTextBaseline) ctx.setTextBaseline('top')

    const { lines } = this.wrapText(ctx, text, maxWidth, fontPx, lineHeightPx)
    let out = lines
    if (maxLines && lines.length > maxLines) {
      out = lines.slice(0, maxLines)
      // 省略号
      const last = out[out.length - 1]
      out[out.length - 1] = last.slice(0, Math.max(0, last.length - 2)) + '…'
    }
    out.forEach((ln, i) => {
      if (ctx.fillText) ctx.fillText(ln, x, y + i * lineHeightPx)
    })
    return out.length * lineHeightPx // 实际高度
  },
  
  // 测量文本宽度（旧版API）
  measureTextWidthOld(ctx, text, fontSize) {
    ctx.setFontSize(fontSize)
    const metrics = ctx.measureText(text)
    return metrics.width || 0
  },
  
  // 测量文本宽度（新版API）
  measureTextWidth(ctx, text, fontSize) {
    ctx.font = `${fontSize}px sans-serif`
    const metrics = ctx.measureText(text)
    return metrics.width || 0
  },
  
  // 文本换行并返回行数和总高度（旧版API）
  wrapTextOld(ctx, text, maxWidth, fontSize, lineHeight) {
    ctx.setFontSize(fontSize)
    const words = text.split('')
    const lines = []
    let line = ''
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width || 0
      
      if (testWidth > maxWidth && i > 0) {
        lines.push(line)
        line = words[i]
      } else {
        line = testLine
      }
    }
    if (line) {
      lines.push(line)
    }
    
    return {
      lines,
      height: lines.length * lineHeight,
      lineCount: lines.length
    }
  },
  
  // 自适应缩放计算
  calculateScale(height, baseHeight = 1800) {
    const ratio = height / baseHeight
    return Math.max(0.9, Math.min(1.2, ratio))  // clamp(0.9, 1.2)
  },
  
  // 绘制分享图片内容（旧版API，流式布局优化版）
  drawShareImageContentOld(ctx, score, scoreLevel, data) {
    const width = 750
    const height = 1800
    
    // ===== 统一布局参数 =====
    const s = Math.max(0.9, Math.min(1.2, height / 1800)) // 自适应比例
    const P = 60 * s               // 侧边留白
    const cx = width / 2
    const cy = 560 * s             // 圆心Y（可微调）
    const radius = 125 * s         // 放大半径约13%，视觉更饱满
    const ringGap = 56 * s         // 圆环到底部留白
    const scoreFS = 120 * s        // 分数字号
    const unitFS = 36 * s
    const badgeR = 50 * s
    const gapHalf = 50 * s         // "65"和"分"的半间距，确保文字与环内侧有≥20px空隙
    let cursorY = cy + radius + ringGap  // 从圆环下方开始流式排版
    
    // 绘制背景渐变（舞台风格：紫到橙金）
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#6b46c1')
    gradient.addColorStop(0.3, '#9333ea')
    gradient.addColorStop(0.7, '#f97316')
    gradient.addColorStop(1, '#fbbf24')
    ctx.setFillStyle(gradient)
    ctx.fillRect(0, 0, width, height)
    
    // 绘制标题（今日声音报告）
    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(52 * s)
    ctx.setTextAlign('center')
    ctx.fillText('今日声音报告', cx, 100 * s)
    
    // 绘制emoji
    ctx.setFontSize(60 * s)
    ctx.fillText('🎶', cx, 180 * s)
    
    // 绘制日期
    ctx.setFillStyle('rgba(255, 255, 255, 0.8)')
    ctx.setFontSize(28 * s)
    ctx.fillText(this.data.currentDate, cx, 220 * s)
    
    // ===== 圆环背景 =====
    ctx.setLineCap('round')
    ctx.setLineWidth(18 * s)  // 稍加粗线宽，保持比例协调
    ctx.setStrokeStyle('rgba(255,255,255,0.2)')
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
    
    // ===== 渐变进度环 =====
    const progress = Math.max(0, Math.min(1, (score || 0) / 100))
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + Math.PI * 2 * progress
    const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy)
    grad.addColorStop(0, '#ff9a56')
    grad.addColorStop(0.5, '#ffad70')
    grad.addColorStop(1, '#ffd700')
    ctx.setStrokeStyle(grad)
    ctx.setLineWidth(18 * s)  // 稍加粗线宽，保持比例协调
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.stroke()
    
    // ===== 圆心文字（同心摆放、永不与环相撞）=====
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    
    // 65 - 调整位置，避免与圆环重叠
    ctx.setFontSize(scoreFS)
    ctx.setFillStyle('#fff')
    ctx.fillText(String(score || 0), cx, cy - gapHalf * 0.9)
    
    // 分 - 调整位置，向下移动更多，避免与圆环重叠
    ctx.setFontSize(unitFS)
    ctx.fillText('分', cx, cy + gapHalf * 1.2)
    
    // ===== 等级徽章（固定距离）=====
    // 计算徽章位置：确保徽章外边缘与进度环外边缘之间至少预留 20px 可视空隙
    const R = radius                    // 进度环半径（已放大到 125 * s）
    const W = 18 * s                   // 进度环描边宽度（已加粗到 18 * s）
    const Rb = badgeR                  // 徽章半径
    // 推荐可视间距：gap = max( W/2 + 8px, 20px )，确保放大后仍有足够空隙
    const gapMin = 20 * s              // 最小间距（缩放后，确保≥20px）
    const gapCalc = (W / 2) + 8 * s   // 基于线宽计算的间距
    const gap = Math.max(gapCalc, gapMin)  // 取较大值，确保至少 20px
    // 目标圆心：badgeCenterY = cy + R + gap + Rb
    // 这样徽章外边缘在进度环外边缘下方 gap 距离处
    const levelBadgeY = cy + R + gap + Rb
    
    // 绘制徽章圆形背景（保持样式不变）
    ctx.setFillStyle('rgba(255,255,255,0.25)')
    ctx.beginPath()
    ctx.arc(cx, levelBadgeY, badgeR, 0, Math.PI * 2)
    ctx.fill()
    
    // "及格"文字 - 放在徽章圆形中心，确保不遮挡"分"字
    ctx.setFillStyle('#fff')
    ctx.setFontSize(32 * s)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')  // 使用 middle 基线，文字居中在徽章内
    ctx.fillText(scoreLevel, cx, levelBadgeY)
    
    // ===== 个性化文案（最多 2 行，保证不挤到指标）=====
    // 从徽章下方开始，留出间距（徽章下边缘 + 间距）
    cursorY = levelBadgeY + badgeR + 24 * s  // 徽章下边缘 + 间距
    const paraWidth = width - P * 2
    const msgH = this.drawParagraph(ctx, this.data.personalizedMessage || '', cx, cursorY, paraWidth, 30 * s, 42 * s, '#fff', 2, true)
    cursorY += (msgH ? msgH + 16 * s : 0)
    
    // ===== 数据对比（单行）=====
    if (this.data.comparisonPercent > 0) {
      ctx.setFontSize(26 * s)
      ctx.setFillStyle('rgba(255,255,255,0.85)')
      ctx.fillText(`超过 ${this.data.comparisonPercent}% 的用户`, cx, cursorY)
      cursorY += 44 * s
    }
    
    // ===== 指标列表（按剩余空间自适应）=====
    // 预留底部给"成就 + 日期 + 码 + 提示"
    const bottomReserve = 420 * s
    
    // 动态行高（若空间紧张就压缩）
    const spaceLeft = height - cursorY - bottomReserve
    const perRow = 100 * s
    const maxRows = Math.min(4, Math.floor(spaceLeft / perRow) || 3)
    const metrics = [
      { name: '音准', score: data.pitch || 0, icon: '🎵' },
      { name: '节奏', score: data.rhythm || 0, icon: '🎼' },
      { name: '音量', score: data.volume || 0, icon: '🔊' },
      { name: '音色', score: data.timbre || 0, icon: '🎤' }
    ].slice(0, maxRows)
    
    metrics.forEach((m, idx) => {
      const y = cursorY + idx * perRow
      // 左侧标题
      ctx.setTextAlign('left')
      ctx.setFontSize(34 * s)
      ctx.setFillStyle('#fff')
      ctx.fillText(`${m.icon} ${m.name}`, P, y)
      
      // 右侧分数
      ctx.setTextAlign('right')
      ctx.setFontSize(34 * s)
      ctx.fillText(`${m.score}分`, width - P, y)
      
      // 进度条
      const barY = y + 32 * s
      const barW = width - P * 2
      const barH = 18 * s
      // 背景
      ctx.setFillStyle('rgba(255,255,255,0.22)')
      ctx.fillRect(P, barY, barW, barH)
      // 前景
      const w = barW * Math.max(0, Math.min(1, m.score / 100))
      const g2 = ctx.createLinearGradient(P, barY, P + w, barY)
      g2.addColorStop(0, '#ff9a56')
      g2.addColorStop(0.5, '#ffad70')
      g2.addColorStop(1, '#ffd700')
      ctx.setFillStyle(g2)
      ctx.fillRect(P, barY, w, barH)
    })
    
    cursorY += metrics.length * perRow + 24 * s
    
    // ===== 成就徽章 + 日期 + 码（根据剩余空间决定显示）=====
    // 成就区：如果空间不足，自动隐藏
    let showBadges = (this.data.achievements && this.data.achievements.length > 0 && (height - cursorY > 360 * s))
    if (showBadges) {
      ctx.setTextAlign('center')
      ctx.setFontSize(32 * s)
      ctx.setFillStyle('#fff')
      ctx.fillText('成就徽章', cx, cursorY)
      cursorY += 18 * s
      
      const badges = this.data.achievements.slice(0, 2)
      const colW = 160 * s
      const startX = cx - (badges.length - 1) * colW / 2  // 确保对称分布
      badges.forEach((b, i) => {
        const bx = startX + i * colW
        const by = cursorY + 60 * s
        // 背景圆
        ctx.setFillStyle('rgba(255,255,255,0.22)')
        ctx.beginPath()
        ctx.arc(bx, by, 60 * s, 0, Math.PI * 2)
        ctx.fill()
        // icon - 垂直居中放在圆心
        ctx.setFillStyle('#fff')
        ctx.setFontSize(56 * s)
        ctx.setTextAlign('center')
        ctx.setTextBaseline('middle')
        ctx.fillText(b.icon, bx, by)
        // 名称 - 在圆下方，使用 top 基线
        ctx.setTextBaseline('top')
        ctx.setFontSize(26 * s)
        ctx.fillText(b.name, bx, by + 70 * s)
      })
      cursorY += 200 * s
    }
    
    // 日期
    ctx.setTextAlign('center')
    ctx.setFillStyle('rgba(255,255,255,0.8)')
    ctx.setFontSize(24 * s)
    ctx.fillText(this.data.currentDate, cx, cursorY + 40 * s)
    cursorY += 90 * s
    
    // 小程序码（真实/降级都行）
    this.drawQRCode(ctx, cx, cursorY + 90 * s, 120 * s)
    ctx.setFillStyle('rgba(255,255,255,0.9)')
    ctx.setFontSize(26 * s)
    ctx.fillText('扫码体验声乐评测', cx, cursorY + 220 * s)
  },


  // 绘制分享图片内容（异步版本，支持加载真实二维码，优化版）
  async drawShareImageContent(ctx, score, scoreLevel, data) {
    const width = 750
    const height = 1800
    
    // ===== 统一布局参数 =====
    const s = Math.max(0.9, Math.min(1.2, height / 1800)) // 自适应比例
    const P = 60 * s               // 侧边留白
    const cx = width / 2
    const cy = 560 * s             // 圆心Y（可微调）
    const radius = 125 * s         // 放大半径约13%，视觉更饱满
    const ringGap = 56 * s         // 圆环到底部留白
    const scoreFS = 120 * s        // 分数字号
    const unitFS = 36 * s
    const badgeR = 50 * s
    const gapHalf = 50 * s         // "65"和"分"的半间距，确保文字与环内侧有≥20px空隙
    let cursorY = cy + radius + ringGap  // 从圆环下方开始流式排版
    
    // 绘制背景渐变（舞台风格：紫到橙金）
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#6b46c1')
    gradient.addColorStop(0.3, '#9333ea')
    gradient.addColorStop(0.7, '#f97316')
    gradient.addColorStop(1, '#fbbf24')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
    
    // 绘制标题（今日声音报告）
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${52 * s}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('今日声音报告', cx, 100 * s)
    
    // 绘制emoji
    ctx.font = `${60 * s}px sans-serif`
    ctx.fillText('🎶', cx, 180 * s)
    
    // 绘制日期
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = `${28 * s}px sans-serif`
    ctx.fillText(this.data.currentDate, cx, 220 * s)
    
    // ===== 圆环背景 =====
    ctx.lineCap = 'round'
    ctx.lineWidth = 18 * s  // 稍加粗线宽，保持比例协调
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
    
    // ===== 渐变进度环 =====
    const progress = Math.max(0, Math.min(1, (score || 0) / 100))
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + Math.PI * 2 * progress
    const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy)
    grad.addColorStop(0, '#ff9a56')
    grad.addColorStop(0.5, '#ffad70')
    grad.addColorStop(1, '#ffd700')
    ctx.strokeStyle = grad
    ctx.lineWidth = 18 * s  // 稍加粗线宽，保持比例协调
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.stroke()
    
    // ===== 圆心文字（同心摆放、永不与环相撞）=====
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // 65 - 调整位置，避免与圆环重叠
    ctx.font = `bold ${scoreFS}px sans-serif`
    ctx.fillStyle = '#fff'
    ctx.fillText(String(score || 0), cx, cy - gapHalf * 0.9)
    
    // 分 - 调整位置，向下移动更多，避免与圆环重叠
    ctx.font = `${unitFS}px sans-serif`
    ctx.fillText('分', cx, cy + gapHalf * 1.2)
    
    // ===== 等级徽章（固定距离）=====
    // 计算徽章位置：确保徽章外边缘与进度环外边缘之间至少预留 20px 可视空隙
    const R = radius                    // 进度环半径（已放大到 125 * s）
    const W = 18 * s                   // 进度环描边宽度（已加粗到 18 * s）
    const Rb = badgeR                  // 徽章半径
    // 推荐可视间距：gap = max( W/2 + 8px, 20px )，确保放大后仍有足够空隙
    const gapMin = 20 * s              // 最小间距（缩放后，确保≥20px）
    const gapCalc = (W / 2) + 8 * s   // 基于线宽计算的间距
    const gap = Math.max(gapCalc, gapMin)  // 取较大值，确保至少 20px
    // 目标圆心：badgeCenterY = cy + R + gap + Rb
    // 这样徽章外边缘在进度环外边缘下方 gap 距离处
    const levelBadgeY = cy + R + gap + Rb
    
    // 绘制徽章圆形背景（保持样式不变）
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(cx, levelBadgeY, badgeR, 0, Math.PI * 2)
    ctx.fill()
    
    // "及格"文字 - 放在徽章圆形中心，确保不遮挡"分"字
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${32 * s}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'  // 使用 middle 基线，文字居中在徽章内
    ctx.fillText(scoreLevel, cx, levelBadgeY)
    
    // ===== 个性化文案（最多 2 行，保证不挤到指标）=====
    // 从徽章下方开始，留出间距（徽章下边缘 + 间距）
    cursorY = levelBadgeY + badgeR + 24 * s  // 徽章下边缘 + 间距
    const paraWidth = width - P * 2
    const msgH = this.drawParagraph(ctx, this.data.personalizedMessage || '', cx, cursorY, paraWidth, 30 * s, 42 * s, '#fff', 2, true)
    cursorY += (msgH ? msgH + 16 * s : 0)
    
    // ===== 数据对比（单行）=====
    if (this.data.comparisonPercent > 0) {
      ctx.font = `${26 * s}px sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillText(`超过 ${this.data.comparisonPercent}% 的用户`, cx, cursorY)
      cursorY += 44 * s
    }
    
    // ===== 指标列表（按剩余空间自适应）=====
    // 预留底部给"成就 + 日期 + 码 + 提示"
    const bottomReserve = 420 * s
    
    // 动态行高（若空间紧张就压缩）
    const spaceLeft = height - cursorY - bottomReserve
    const perRow = 100 * s
    const maxRows = Math.min(4, Math.floor(spaceLeft / perRow) || 3)
    const metrics = [
      { name: '音准', score: data.pitch || 0, icon: '🎵' },
      { name: '节奏', score: data.rhythm || 0, icon: '🎼' },
      { name: '音量', score: data.volume || 0, icon: '🔊' },
      { name: '音色', score: data.timbre || 0, icon: '🎤' }
    ].slice(0, maxRows)
    
    metrics.forEach((m, idx) => {
      const y = cursorY + idx * perRow
      // 左侧标题
      ctx.textAlign = 'left'
      ctx.font = `${34 * s}px sans-serif`
      ctx.fillStyle = '#fff'
      ctx.fillText(`${m.icon} ${m.name}`, P, y)
      
      // 右侧分数
      ctx.textAlign = 'right'
      ctx.font = `bold ${34 * s}px sans-serif`
      ctx.fillText(`${m.score}分`, width - P, y)
      
      // 进度条
      const barY = y + 32 * s
      const barW = width - P * 2
      const barH = 18 * s
      // 背景
      ctx.fillStyle = 'rgba(255,255,255,0.22)'
      ctx.fillRect(P, barY, barW, barH)
      // 前景
      const w = barW * Math.max(0, Math.min(1, m.score / 100))
      const g2 = ctx.createLinearGradient(P, barY, P + w, barY)
      g2.addColorStop(0, '#ff9a56')
      g2.addColorStop(0.5, '#ffad70')
      g2.addColorStop(1, '#ffd700')
      ctx.fillStyle = g2
      ctx.fillRect(P, barY, w, barH)
    })
    
    cursorY += metrics.length * perRow + 24 * s
    
    // ===== 成就徽章 + 日期 + 码（根据剩余空间决定显示）=====
    // 成就区：如果空间不足，自动隐藏
    let showBadges = (this.data.achievements && this.data.achievements.length > 0 && (height - cursorY > 360 * s))
    if (showBadges) {
      ctx.textAlign = 'center'
      ctx.font = `bold ${32 * s}px sans-serif`
      ctx.fillStyle = '#fff'
      ctx.fillText('成就徽章', cx, cursorY)
      cursorY += 18 * s
      
      const badges = this.data.achievements.slice(0, 2)
      const colW = 160 * s
      const startX = cx - (badges.length - 1) * colW / 2  // 确保对称分布
      badges.forEach((b, i) => {
        const bx = startX + i * colW
        const by = cursorY + 60 * s
        // 背景圆
        ctx.fillStyle = 'rgba(255,255,255,0.22)'
        ctx.beginPath()
        ctx.arc(bx, by, 60 * s, 0, Math.PI * 2)
        ctx.fill()
        // icon - 垂直居中放在圆心
        ctx.fillStyle = '#fff'
        ctx.font = `${56 * s}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(b.icon, bx, by)
        // 名称 - 在圆下方，使用 top 基线
        ctx.textBaseline = 'top'
        ctx.font = `${26 * s}px sans-serif`
        ctx.fillText(b.name, bx, by + 70 * s)
      })
      cursorY += 200 * s
    }
    
    // 日期
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = `${24 * s}px sans-serif`
    ctx.fillText(this.data.currentDate, cx, cursorY + 40 * s)
    cursorY += 90 * s
    
    // 小程序码（真实/降级都行）
    await (this.drawQRCodeNew ? this.drawQRCodeNew(ctx, cx, cursorY + 90 * s, 120 * s) : Promise.resolve())
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `${26 * s}px sans-serif`
    ctx.fillText('扫码体验声乐评测', cx, cursorY + 220 * s)
  },

  // 绘制二维码（旧版API）- 使用真实二维码图片资源
  drawQRCode(ctx, x, y, size) {
    // 二维码图片路径（需要将二维码图片放到images目录）
    const qrCodePath = '/images/qrcode.png'
    
    // 旧版API的drawImage可以直接使用图片路径，但需要确保在draw()之前调用
    // 先绘制二维码背景（白色背景，确保二维码清晰可见）
    ctx.setFillStyle('rgba(255, 255, 255, 0.98)')
    ctx.fillRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 绘制二维码边框
    ctx.setStrokeStyle('#ff9a56')
    ctx.setLineWidth(3)
    ctx.strokeRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 尝试绘制真实二维码图片（旧版API可以直接使用路径）
    try {
      ctx.drawImage(qrCodePath, x - size/2, y - size/2, size, size)
    } catch (error) {
      console.warn('绘制二维码图片失败，使用模拟二维码:', error)
      // 降级：如果图片绘制失败，使用模拟二维码
      this.drawQRCodeFallback(ctx, x, y, size)
    }
  },

  // 绘制二维码降级方案（模拟二维码）
  drawQRCodeFallback(ctx, x, y, size) {
    // 绘制二维码背景
    ctx.setFillStyle('rgba(255, 255, 255, 0.98)')
    ctx.fillRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 绘制二维码边框
    ctx.setStrokeStyle('#ff9a56')
    ctx.setLineWidth(3)
    ctx.strokeRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 绘制二维码图案（模拟真实二维码）
    this.drawQRPattern(ctx, x, y, size)
    
    // 绘制小程序图标背景（圆形）
    ctx.setFillStyle('#ff9a56')
    ctx.beginPath()
    ctx.arc(x, y, size/4, 0, 2 * Math.PI)
    ctx.fill()
    
    // 绘制小程序图标
    ctx.setFillStyle('#FFFFFF')
    ctx.setFontSize(size/6)
    ctx.setTextAlign('center')
    ctx.fillText('🎤', x, y + size/24)
  },

  // 绘制二维码（新版API）- 使用真实二维码图片资源
  async drawQRCodeNew(ctx, x, y, size) {
    // 二维码图片路径（需要将二维码图片放到images目录）
    const qrCodePath = '/images/qrcode.png'
    
    try {
      // 新版API需要先获取图片信息
      const imageInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: qrCodePath,
          success: resolve,
          fail: reject
        })
      })
      
      // 创建图片对象
      const image = ctx.createImage()
      image.src = imageInfo.path
      
      // 等待图片加载完成
      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = reject
        // 设置超时
        setTimeout(() => reject(new Error('图片加载超时')), 3000)
      })
      
      // 绘制真实二维码图片
      ctx.drawImage(image, x - size/2, y - size/2, size, size)
    } catch (error) {
      console.warn('加载二维码图片失败，使用模拟二维码:', error)
      // 降级：如果图片加载失败，使用模拟二维码
      this.drawQRCodeFallbackNew(ctx, x, y, size)
    }
  },

  // 绘制二维码降级方案（新版API，模拟二维码）
  drawQRCodeFallbackNew(ctx, x, y, size) {
    // 绘制二维码背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.fillRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 绘制二维码边框
    ctx.strokeStyle = '#ff9a56'
    ctx.lineWidth = 3
    ctx.strokeRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 绘制二维码图案（模拟真实二维码）
    this.drawQRPatternNew(ctx, x, y, size)
    
    // 绘制小程序图标背景（圆形）
    ctx.fillStyle = '#ff9a56'
    ctx.beginPath()
    ctx.arc(x, y, size/4, 0, 2 * Math.PI)
    ctx.fill()
    
    // 绘制小程序图标
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `bold ${size/6}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('🎤', x, y + size/24)
  },

  // 绘制二维码图案（旧版API）
  drawQRPattern(ctx, x, y, size) {
    const cellSize = size / 21
    const startX = x - size/2
    const startY = y - size/2
    
    // 绘制定位点（左上、右上、左下）
    this.drawFinderPattern(ctx, startX + cellSize * 2, startY + cellSize * 2, cellSize * 7)
    this.drawFinderPattern(ctx, startX + cellSize * 12, startY + cellSize * 2, cellSize * 7)
    this.drawFinderPattern(ctx, startX + cellSize * 2, startY + cellSize * 12, cellSize * 7)
    
    // 绘制数据区域
    ctx.setFillStyle('#000000')
    const score = this.data.resultData.score || 85
    const seed = score
    
    for (let i = 0; i < 21; i++) {
      for (let j = 0; j < 21; j++) {
        // 跳过定位点区域
        if ((i < 9 && j < 9) || (i < 9 && j > 11) || (i > 11 && j < 9)) {
          continue
        }
        
        // 跳过中心区域（小程序图标位置）
        if (i >= 8 && i <= 12 && j >= 8 && j <= 12) {
          continue
        }
        
        // 基于位置和种子生成数据点
        const hash = (i * 21 + j + seed) % 7
        if (hash < 3) {
          ctx.fillRect(
            startX + j * cellSize,
            startY + i * cellSize,
            cellSize,
            cellSize
          )
        }
      }
    }
  },

  // 绘制二维码图案（新版API）
  drawQRPatternNew(ctx, x, y, size) {
    const cellSize = size / 21
    const startX = x - size/2
    const startY = y - size/2
    
    // 绘制定位点（左上、右上、左下）
    this.drawFinderPatternNew(ctx, startX + cellSize * 2, startY + cellSize * 2, cellSize * 7)
    this.drawFinderPatternNew(ctx, startX + cellSize * 12, startY + cellSize * 2, cellSize * 7)
    this.drawFinderPatternNew(ctx, startX + cellSize * 2, startY + cellSize * 12, cellSize * 7)
    
    // 绘制数据区域
    ctx.fillStyle = '#000000'
    const score = this.data.resultData.score || 85
    const seed = score
    
    for (let i = 0; i < 21; i++) {
      for (let j = 0; j < 21; j++) {
        // 跳过定位点区域
        if ((i < 9 && j < 9) || (i < 9 && j > 11) || (i > 11 && j < 9)) {
          continue
        }
        
        // 跳过中心区域（小程序图标位置）
        if (i >= 8 && i <= 12 && j >= 8 && j <= 12) {
          continue
        }
        
        // 基于位置和种子生成数据点
        const hash = (i * 21 + j + seed) % 7
        if (hash < 3) {
          ctx.fillRect(
            startX + j * cellSize,
            startY + i * cellSize,
            cellSize,
            cellSize
          )
        }
      }
    }
  },

  // 绘制定位点（旧版API）
  drawFinderPattern(ctx, x, y, size) {
    const cellSize = size / 7
    
    // 外框
    ctx.setFillStyle('#000000')
    ctx.fillRect(x, y, size, size)
    
    // 内框
    ctx.setFillStyle('#FFFFFF')
    ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize)
    
    // 中心点
    ctx.setFillStyle('#000000')
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, size - 4 * cellSize, size - 4 * cellSize)
  },

  // 绘制定位点（新版API）
  drawFinderPatternNew(ctx, x, y, size) {
    const cellSize = size / 7
    
    // 外框
    ctx.fillStyle = '#000000'
    ctx.fillRect(x, y, size, size)
    
    // 内框
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize)
    
    // 中心点
    ctx.fillStyle = '#000000'
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, size - 4 * cellSize, size - 4 * cellSize)
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
  },

  // H5页面分享（根据反馈优化：添加可点击链接）
  shareToH5() {
    const score = this.data.resultData.score || 0
    const scoreLevel = this.data.scoreLevel.level || '初级'
    
    // 获取H5页面地址配置（从app.js获取）
    const app = getApp()
    const h5BaseUrl = app.globalData.h5BaseUrl || 'https://your-h5-domain.com'
    
    // 构建完整的评测数据（包含所有必要信息）
    const shareData = {
      score: this.data.resultData.score || 0,
      pitch: this.data.resultData.pitch || 0,
      rhythm: this.data.resultData.rhythm || 0,
      volume: this.data.resultData.volume || 0,
      timbre: this.data.resultData.timbre || 0,
      duration: this.data.resultData.duration || 60,
      song: this.data.resultData.song || '自定义评测',
      date: this.data.currentDate || new Date().toLocaleDateString('zh-CN')
    }
    
    // 生成H5分享链接（通过URL参数传递数据）
    const encodedData = encodeURIComponent(JSON.stringify(shareData))
    const h5Url = `${h5BaseUrl}/h5/result.html?data=${encodedData}`
    
    // 生成分享内容（包含可点击链接）
    const shareContent = `🎤 我的声乐评测得分：${score}分（${scoreLevel}）

🎵 评测详情：
• 音准：${shareData.pitch}分
• 节奏：${shareData.rhythm}分
• 音量：${shareData.volume}分
• 音色：${shareData.timbre}分

🔗 点击链接查看完整报告：${h5Url}

快来测试你的声音吧！✨`
    
    // 显示分享选项
    wx.showActionSheet({
      itemList: ['复制链接', '复制全部内容', '生成短链接（需后端支持）'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 只复制链接
          wx.setClipboardData({
            data: h5Url,
            success: () => {
              wx.showToast({
                title: '链接已复制',
                icon: 'success',
                duration: 2000
              })
              // 提示用户可以在微信中粘贴分享
              setTimeout(() => {
                wx.showModal({
                  title: '分享提示',
                  content: '链接已复制，您可以：\n1. 在微信中粘贴发送给好友\n2. 在朋友圈发布时粘贴链接\n3. 在其他平台分享此链接',
                  showCancel: false,
                  confirmText: '我知道了'
                })
              }, 500)
            }
          })
        } else if (res.tapIndex === 1) {
          // 复制全部内容
          wx.setClipboardData({
            data: shareContent,
            success: () => {
              wx.showToast({
                title: '内容已复制',
                icon: 'success',
                duration: 2000
              })
            }
          })
        } else if (res.tapIndex === 2) {
          // 生成短链接（需要后端支持）
          this.generateShortLink(h5Url)
        }
      },
      fail: (err) => {
        console.error('显示分享菜单失败:', err)
      }
    })
  },

  // 生成短链接（需要后端支持）
  generateShortLink(longUrl) {
    const app = getApp()
    const apiBaseUrl = app.globalData.apiBaseUrl || 'https://your-backend-api.com'
    
    // 检查是否配置了后端API
    if (apiBaseUrl === 'https://your-backend-api.com') {
      wx.showModal({
        title: '功能提示',
        content: '短链接功能需要后端支持。\n\n当前已生成完整链接，可以直接使用。\n如需短链接，请配置后端API并实现短链接生成接口。',
        showCancel: false,
        confirmText: '我知道了',
        success: () => {
          // 降级：直接复制长链接
          wx.setClipboardData({
            data: longUrl,
            success: () => {
              wx.showToast({
                title: '链接已复制',
                icon: 'success'
              })
            }
          })
        }
      })
      return
    }
    
    // 调用后端API生成短链接
    wx.showLoading({
      title: '生成短链接中...',
      mask: true
    })
    
    wx.request({
      url: `${apiBaseUrl}/api/share/shorten`,
      method: 'POST',
      data: {
        url: longUrl,
        expire: 30 // 30天有效期
      },
      success: (res) => {
        wx.hideLoading()
        if (res.data && res.data.code === 0 && res.data.data && res.data.data.shortUrl) {
          const shortUrl = res.data.data.shortUrl
          wx.setClipboardData({
            data: shortUrl,
            success: () => {
              wx.showToast({
                title: '短链接已复制',
                icon: 'success',
                duration: 2000
              })
            }
          })
        } else {
          wx.showToast({
            title: '生成失败，使用原链接',
            icon: 'none',
            duration: 2000
          })
          // 降级：使用原链接
          setTimeout(() => {
            wx.setClipboardData({
              data: longUrl,
              success: () => {
                wx.showToast({
                  title: '原链接已复制',
                  icon: 'success'
                })
              }
            })
          }, 500)
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('生成短链接失败:', err)
        wx.showToast({
          title: '生成失败，使用原链接',
          icon: 'none',
          duration: 2000
        })
        // 降级：使用原链接
        setTimeout(() => {
          wx.setClipboardData({
            data: longUrl,
            success: () => {
              wx.showToast({
                title: '原链接已复制',
                icon: 'success'
              })
            }
          })
        }, 500)
      }
    })
  }
})
