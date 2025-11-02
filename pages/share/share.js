// pages/share/share.js
const app = getApp()

Page({
  data: {
    evaluationResult: {},
    shareText: '',
    generatedImage: '',
    currentPlatform: '',
    shareTemplates: [
      '🎵 我的声乐评测得了{score}分！快来测试你的声音吧！',
      '🎤 专业声乐评测，AI分析音准节奏，我的表现还不错！',
      '🎯 发现了一个超棒的声乐评测小程序，快来试试你的声音！'
    ],
    platformStyles: {
      wechat: {
        name: '微信朋友圈',
        bgGradient: ['#07C160', '#00D4AA'],
        primaryColor: '#07C160',
        textColor: '#FFFFFF',
        style: '简约商务风'
      },
      xiaohongshu: {
        name: '小红书',
        bgGradient: ['#FF2442', '#FF6B6B'],
        primaryColor: '#FF2442',
        textColor: '#FFFFFF',
        style: '清新文艺风'
      },
      xianyu: {
        name: '闲鱼',
        bgGradient: ['#FF6B35', '#F7931E'],
        primaryColor: '#FF6B35',
        textColor: '#FFFFFF',
        style: '生活化风格'
      },
      zhihu: {
        name: '知乎',
        bgGradient: ['#0084FF', '#00A8FF'],
        primaryColor: '#0084FF',
        textColor: '#FFFFFF',
        style: '专业学术风'
      },
      douyin: {
        name: '抖音',
        bgGradient: ['#000000', '#333333'],
        primaryColor: '#000000',
        textColor: '#FFFFFF',
        style: '潮流炫酷风'
      },
      weibo: {
        name: '微博',
        bgGradient: ['#E6162D', '#FF4757'],
        primaryColor: '#E6162D',
        textColor: '#FFFFFF',
        style: '热点话题风'
      }
    }
  },

  onLoad(options) {
    console.log('分享页面加载', options)
    this.loadEvaluationResult()
    this.initShareText()
  },

  // 加载评测结果
  loadEvaluationResult() {
    // 从全局数据或页面参数获取评测结果
    const result = app.globalData.currentEvaluationResult || {
      score: 85,
      pitch: 88,
      rhythm: 82,
      timbre: 85,
      volume: 80,
      summary: '你的声音表现很不错！音准和音色都很好，节奏感也很强。建议多练习气息控制，会让你的声音更加稳定。'
    }
    
    this.setData({
      evaluationResult: result
    })
  },

  // 初始化分享文本
  initShareText() {
    const template = this.data.shareTemplates[0].replace('{score}', this.data.evaluationResult.score)
    this.setData({
      shareText: template
    })
  },

  // 分享到微信朋友圈
  shareToWechat() {
    this.showShareGuide('微信朋友圈', '请复制以下内容，然后打开微信朋友圈发布：')
  },

  // 分享到小红书
  shareToXiaohongshu() {
    this.showShareGuide('小红书', '请复制以下内容，然后打开小红书发布笔记：')
  },

  // 分享到闲鱼
  shareToXianyu() {
    this.showShareGuide('闲鱼', '请复制以下内容，然后打开闲鱼发布动态：')
  },

  // 分享到知乎
  shareToZhihu() {
    this.showShareGuide('知乎', '请复制以下内容，然后打开知乎发布想法：')
  },

  // 分享到抖音
  shareToDouyin() {
    this.showShareGuide('抖音', '请复制以下内容，然后打开抖音发布视频或图文：')
  },

  // 分享到微博
  shareToWeibo() {
    this.showShareGuide('微博', '请复制以下内容，然后打开微博发布：')
  },

  // 显示分享指导
  showShareGuide(platform, instruction) {
    const shareContent = this.generateShareContent()
    
    wx.showModal({
      title: `分享到${platform}`,
      content: `${instruction}\n\n${shareContent}\n\n💡 提示：建议先生成分享图片，然后到对应平台发布图文内容。`,
      confirmText: '复制内容',
      cancelText: '生成图片',
      success: (res) => {
        if (res.confirm) {
          this.copyToClipboard(shareContent)
        } else if (res.cancel) {
          this.generateShareImage()
        }
      }
    })
  },

  // 生成分享内容
  generateShareContent() {
    const result = this.data.evaluationResult
    const text = this.data.shareText || this.data.shareTemplates[0].replace('{score}', result.score)
    
    return `${text}

🎵 我的声乐评测结果：
• 总分：${result.score}分
• 音准：${result.pitch}分
• 节奏：${result.rhythm}分  
• 音色：${result.timbre}分
• 音量：${result.volume}分

${result.summary}

快来测试你的声音吧！🎤`
  },

  // 复制到剪贴板
  copyToClipboard(content) {
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '内容已复制',
          icon: 'success'
        })
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        })
      }
    })
  },

  // 分享文本输入
  onShareTextInput(e) {
    this.setData({
      shareText: e.detail.value
    })
  },

  // 使用模板
  useTemplate(e) {
    const templateIndex = e.currentTarget.dataset.template - 1
    let template = this.data.shareTemplates[templateIndex]
    
    if (template.includes('{score}')) {
      template = template.replace('{score}', this.data.evaluationResult.score)
    }
    
    this.setData({
      shareText: template
    })
  },

  // 生成分享图片
  generateShareImage() {
    wx.showLoading({
      title: '生成图片中...'
    })

    // 使用Canvas生成评分图片
    this.createScoreImage()
  },

  // 生成平台专属图片
  generatePlatformImage(e) {
    const platform = e.currentTarget.dataset.platform
    this.setData({
      currentPlatform: platform
    })
    
    wx.showLoading({
      title: `生成${this.data.platformStyles[platform].name}风格图片...`
    })

    // 使用Canvas生成平台专属评分图片
    this.createPlatformScoreImage(platform)
  },

  // 创建评分图片
  createScoreImage() {
    const ctx = wx.createCanvasContext('scoreCanvas', this)
    const result = this.data.evaluationResult
    
    // 设置画布背景
    const gradient = ctx.createLinearGradient(0, 0, 0, 600)
    gradient.addColorStop(0, '#008080')
    gradient.addColorStop(1, '#20B2AA')
    ctx.setFillStyle(gradient)
    ctx.fillRect(0, 0, 375, 600)
    
    // 标题
    ctx.setFillStyle('#FFFFFF')
    ctx.setFontSize(24)
    ctx.setTextAlign('center')
    ctx.fillText('我的声乐评测结果', 187.5, 50)
    
    // 分数显示
    ctx.setFontSize(60)
    ctx.setFillStyle('#FFD700')
    ctx.fillText(result.score.toString(), 187.5, 120)
    
    ctx.setFontSize(20)
    ctx.setFillStyle('#FFFFFF')
    ctx.fillText('综合评分', 187.5, 150)
    
    // 详细分数
    const metrics = [
      { name: '音准', score: result.pitch, color: '#4CAF50' },
      { name: '节奏', score: result.rhythm, color: '#2196F3' },
      { name: '音色', score: result.timbre, color: '#9C27B0' },
      { name: '音量', score: result.volume, color: '#FF9800' }
    ]
    
    let y = 200
    metrics.forEach((metric, index) => {
      // 指标名称
      ctx.setFontSize(18)
      ctx.setFillStyle('#FFFFFF')
      ctx.setTextAlign('left')
      ctx.fillText(metric.name, 50, y)
      
      // 分数
      ctx.setTextAlign('right')
      ctx.fillText(metric.score + '分', 325, y)
      
      // 进度条背景
      ctx.setFillStyle('rgba(255, 255, 255, 0.3)')
      ctx.fillRect(50, y + 10, 275, 8)
      
      // 进度条填充
      ctx.setFillStyle(metric.color)
      ctx.fillRect(50, y + 10, (metric.score / 100) * 275, 8)
      
      y += 50
    })
    
    // 评价文字
    ctx.setFontSize(16)
    ctx.setFillStyle('#FFFFFF')
    ctx.setTextAlign('center')
    const summary = result.summary || '你的声音表现很不错！'
    this.wrapText(ctx, summary, 187.5, y + 30, 300, 20)
    
    // 小程序二维码区域
    const qrY = y + 80 // 调整二维码位置，与评价文字保持适当距离
    this.drawQRCode(ctx, 187.5, qrY, 70) // 稍微减小二维码尺寸
    
    // 小程序二维码提示
    ctx.setFontSize(14)
    ctx.setFillStyle('rgba(255, 255, 255, 0.8)')
    ctx.fillText('扫码体验声乐评测', 187.5, qrY + 50)
    
    ctx.draw(false, () => {
      wx.hideLoading()
      this.saveGeneratedImageToAlbum()
    })
  },

  // 创建平台专属评分图片
  createPlatformScoreImage(platform) {
    const ctx = wx.createCanvasContext('scoreCanvas', this)
    const result = this.data.evaluationResult
    const style = this.data.platformStyles[platform]
    
    // 根据平台设置不同的背景和样式
    this.drawPlatformBackground(ctx, platform, style)
    
    // 根据平台绘制不同的标题样式
    this.drawPlatformTitle(ctx, platform, style, result)
    
    // 根据平台绘制不同的分数显示
    this.drawPlatformScore(ctx, platform, style, result)
    
    // 根据平台绘制不同的详细指标
    this.drawPlatformMetrics(ctx, platform, style, result)
    
    // 根据平台绘制不同的评价文字
    this.drawPlatformSummary(ctx, platform, style, result)
    
    // 根据平台绘制不同的二维码
    this.drawPlatformQRCode(ctx, platform, style)
    
    ctx.draw(false, () => {
      wx.hideLoading()
      this.saveGeneratedImageToAlbum()
    })
  },

  // 生成真实小程序码（需要后端支持）
  generateRealQRCode() {
    // 这里可以调用后端API生成真实的小程序码
    // 示例：调用微信API生成小程序码
    wx.request({
      url: 'https://api.weixin.qq.com/wxa/getwxacodeunlimit',
      method: 'POST',
      data: {
        scene: 'share',
        page: 'pages/index/index',
        width: 280,
        auto_color: false,
        line_color: {"r":0,"g":128,"b":128},
        is_hyaline: false
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.data) {
          // 将小程序码保存为临时文件
          const fs = wx.getFileSystemManager()
          const filePath = `${wx.env.USER_DATA_PATH}/qrcode_${Date.now()}.jpg`
          fs.writeFile({
            filePath: filePath,
            data: res.data,
            success: () => {
              this.setData({
                qrCodePath: filePath
              })
            }
          })
        }
      },
      fail: (err) => {
        console.error('生成小程序码失败:', err)
      }
    })
  },

  // 文字换行处理
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split('')
    let line = ''
    let currentY = y
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width
      
      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY)
        line = words[i]
        currentY += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line, x, currentY)
  },

  // 绘制二维码
  drawQRCode(ctx, x, y, size) {
    // 绘制二维码背景（更柔和的白色背景）
    ctx.setFillStyle('rgba(255, 255, 255, 0.98)')
    ctx.fillRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 绘制二维码边框（更细的边框）
    ctx.setStrokeStyle('#008080')
    ctx.setLineWidth(2)
    ctx.strokeRect(x - size/2 - 12, y - size/2 - 12, size + 24, size + 24)
    
    // 绘制二维码图案（模拟真实二维码）
    this.drawQRPattern(ctx, x, y, size)
    
    // 绘制小程序图标背景（圆形）
    ctx.setFillStyle('#008080')
    ctx.beginPath()
    ctx.arc(x, y, size/4, 0, 2 * Math.PI)
    ctx.fill()
    
    // 绘制小程序图标
    ctx.setFillStyle('#FFFFFF')
    ctx.setFontSize(16)
    ctx.setTextAlign('center')
    ctx.fillText('🎤', x, y + 2)
  },

  // 绘制二维码图案
  drawQRPattern(ctx, x, y, size) {
    const cellSize = size / 21 // 21x21的二维码网格，更紧凑
    const startX = x - size/2
    const startY = y - size/2
    
    // 绘制定位点（左上、右上、左下）
    this.drawFinderPattern(ctx, startX + cellSize * 2, startY + cellSize * 2, cellSize * 7)
    this.drawFinderPattern(ctx, startX + cellSize * 12, startY + cellSize * 2, cellSize * 7)
    this.drawFinderPattern(ctx, startX + cellSize * 2, startY + cellSize * 12, cellSize * 7)
    
    // 绘制数据区域（基于固定算法生成，确保一致性）
    ctx.setFillStyle('#000000')
    const seed = this.data.evaluationResult.score || 85 // 使用分数作为种子
    
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

  // 绘制定位点
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

  // 绘制平台背景
  drawPlatformBackground(ctx, platform, style) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 600)
    gradient.addColorStop(0, style.bgGradient[0])
    gradient.addColorStop(1, style.bgGradient[1])
    ctx.setFillStyle(gradient)
    ctx.fillRect(0, 0, 375, 600)
    
    // 根据平台添加特殊背景元素
    switch(platform) {
      case 'xiaohongshu':
        // 小红书：添加花瓣装饰
        this.drawXiaohongshuDecorations(ctx)
        break
      case 'douyin':
        // 抖音：添加音符装饰
        this.drawDouyinDecorations(ctx)
        break
      case 'zhihu':
        // 知乎：添加几何装饰
        this.drawZhihuDecorations(ctx)
        break
    }
  },

  // 绘制平台标题
  drawPlatformTitle(ctx, platform, style, result) {
    ctx.setFillStyle(style.textColor)
    ctx.setFontSize(24)
    ctx.setTextAlign('center')
    
    let title = '我的声乐评测结果'
    switch(platform) {
      case 'xiaohongshu':
        title = '🎵 我的声乐评测分享'
        break
      case 'douyin':
        title = '🎤 声乐挑战结果'
        break
      case 'zhihu':
        title = '声乐评测数据分析'
        break
      case 'weibo':
        title = '#声乐评测# 我的表现'
        break
    }
    
    ctx.fillText(title, 187.5, 50)
  },

  // 绘制平台分数
  drawPlatformScore(ctx, platform, style, result) {
    // 分数显示
    ctx.setFontSize(60)
    ctx.setFillStyle('#FFD700')
    ctx.fillText(result.score.toString(), 187.5, 120)
    
    // 分数标签
    ctx.setFontSize(20)
    ctx.setFillStyle(style.textColor)
    let scoreLabel = '综合评分'
    switch(platform) {
      case 'xiaohongshu':
        scoreLabel = '综合表现'
        break
      case 'douyin':
        scoreLabel = '挑战得分'
        break
      case 'zhihu':
        scoreLabel = '评测分数'
        break
    }
    ctx.fillText(scoreLabel, 187.5, 150)
  },

  // 绘制平台指标
  drawPlatformMetrics(ctx, platform, style, result) {
    const metrics = [
      { name: '音准', score: result.pitch, color: '#4CAF50' },
      { name: '节奏', score: result.rhythm, color: '#2196F3' },
      { name: '音色', score: result.timbre, color: '#9C27B0' },
      { name: '音量', score: result.volume, color: '#FF9800' }
    ]
    
    let y = 200
    metrics.forEach((metric, index) => {
      // 指标名称
      ctx.setFontSize(18)
      ctx.setFillStyle(style.textColor)
      ctx.setTextAlign('left')
      ctx.fillText(metric.name, 50, y)
      
      // 分数
      ctx.setTextAlign('right')
      ctx.fillText(metric.score + '分', 325, y)
      
      // 进度条背景
      ctx.setFillStyle('rgba(255, 255, 255, 0.3)')
      ctx.fillRect(50, y + 10, 275, 8)
      
      // 进度条填充
      ctx.setFillStyle(metric.color)
      ctx.fillRect(50, y + 10, (metric.score / 100) * 275, 8)
      
      y += 50
    })
  },

  // 绘制平台评价
  drawPlatformSummary(ctx, platform, style, result) {
    ctx.setFontSize(16)
    ctx.setFillStyle(style.textColor)
    ctx.setTextAlign('center')
    
    let summary = result.summary || '你的声音表现很不错！'
    switch(platform) {
      case 'xiaohongshu':
        summary = `✨ ${summary} 快来试试你的声音吧！`
        break
      case 'douyin':
        summary = `🎵 ${summary} 挑战你的声音极限！`
        break
      case 'zhihu':
        summary = `📊 ${summary} 基于AI算法的专业分析。`
        break
      case 'weibo':
        summary = `#声乐评测# ${summary}`
        break
    }
    
    this.wrapText(ctx, summary, 187.5, 420, 300, 20)
  },

  // 绘制平台二维码
  drawPlatformQRCode(ctx, platform, style) {
    const qrY = 480
    this.drawQRCode(ctx, 187.5, qrY, 70)
    
    // 二维码提示文字
    ctx.setFontSize(14)
    ctx.setFillStyle('rgba(255, 255, 255, 0.8)')
    let qrText = '扫码体验声乐评测'
    switch(platform) {
      case 'xiaohongshu':
        qrText = '扫码发现你的声音之美'
        break
      case 'douyin':
        qrText = '扫码挑战你的声音'
        break
      case 'zhihu':
        qrText = '扫码获取专业评测'
        break
    }
    ctx.fillText(qrText, 187.5, qrY + 50)
  },

  // 小红书装饰
  drawXiaohongshuDecorations(ctx) {
    ctx.setFillStyle('rgba(255, 255, 255, 0.1)')
    // 绘制花瓣装饰
    for(let i = 0; i < 5; i++) {
      const x = 50 + i * 60
      const y = 100 + Math.sin(i) * 20
      ctx.beginPath()
      ctx.arc(x, y, 15, 0, 2 * Math.PI)
      ctx.fill()
    }
  },

  // 抖音装饰
  drawDouyinDecorations(ctx) {
    ctx.setFillStyle('rgba(255, 255, 255, 0.1)')
    // 绘制音符装饰
    for(let i = 0; i < 6; i++) {
      const x = 30 + i * 50
      const y = 80 + Math.sin(i * 0.5) * 30
      ctx.setFontSize(20)
      ctx.fillText('🎵', x, y)
    }
  },

  // 知乎装饰
  drawZhihuDecorations(ctx) {
    ctx.setFillStyle('rgba(255, 255, 255, 0.1)')
    // 绘制几何装饰
    for(let i = 0; i < 4; i++) {
      const x = 80 + i * 60
      const y = 120
      ctx.fillRect(x, y, 20, 20)
    }
  },

  // 保存图片到相册
  saveImageToAlbum() {
    if (this.data.generatedImage) {
      // 如果已有生成的图片，直接保存
      wx.saveImageToPhotosAlbum({
        filePath: this.data.generatedImage,
        success: () => {
          wx.showModal({
            title: '图片保存成功',
            content: '分享图片已保存到相册，您可以在各平台分享使用。',
            showCancel: false,
            confirmText: '我知道了'
          })
        },
        fail: (err) => {
          console.error('保存图片失败:', err)
          if (err.errMsg.includes('auth deny')) {
            wx.showModal({
              title: '保存失败',
              content: '请允许访问相册权限后重试',
              showCancel: false,
              confirmText: '我知道了'
            })
          } else {
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        }
      })
    } else {
      // 如果没有生成的图片，先生成再保存
      this.generateShareImage()
    }
  },

  // 保存生成的图片到相册
  saveGeneratedImageToAlbum() {
    wx.canvasToTempFilePath({
      canvasId: 'scoreCanvas',
      success: (res) => {
        // 先显示预览
        this.setData({
          generatedImage: res.tempFilePath
        })
        
        // 然后保存到相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showModal({
              title: '图片生成成功',
              content: '分享图片已保存到相册，您可以在各平台分享使用。',
              showCancel: false,
              confirmText: '我知道了'
            })
          },
          fail: (err) => {
            console.error('保存图片失败:', err)
            if (err.errMsg.includes('auth deny')) {
              wx.showModal({
                title: '保存失败',
                content: '请允许访问相册权限后重试',
                showCancel: false,
                confirmText: '我知道了'
              })
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              })
            }
          }
        })
      },
      fail: (err) => {
        console.error('Canvas生成失败:', err)
        wx.hideLoading()
        wx.showToast({
          title: '生成失败',
          icon: 'none'
        })
      }
    })
  },

  // 复制分享内容
  copyShareContent() {
    const content = this.generateShareContent()
    this.copyToClipboard(content)
  }
})
