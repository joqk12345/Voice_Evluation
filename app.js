// app.js
App({
  globalData: {
    userInfo: null,
    hasLogin: false,
    openid: '',
    session_key: '',
    // 后端 API 地址配置
    // TODO: 请替换为实际的后端 API 地址
    apiBaseUrl: 'https://your-backend-api.com', // 例如：'https://api.example.com'
    // H5 页面地址配置（用于分享链接）
    // TODO: 请替换为实际的 H5 页面部署地址
    h5BaseUrl: 'https://your-h5-domain.com', // 例如：'https://h5.example.com' 或 'https://your-domain.com'
    // 模拟用户数据
    mockUser: {
      nickName: '音乐爱好者',
      avatarUrl: '',
      level: '初级',
      totalTests: 2,
      bestScore: 85
    },
    // 模拟评测历史数据
    mockHistory: [
      {
        id: 1,
        date: '2024-01-15',
        score: 85,
        pitch: 88,
        rhythm: 82,
        volume: 90,
        timbre: 80,
        song: '小星星',
        duration: 30
      },
      {
        id: 2,
        date: '2024-01-10',
        score: 78,
        pitch: 75,
        rhythm: 80,
        volume: 85,
        timbre: 72,
        song: '茉莉花',
        duration: 45
      }
    ]
  },

  onLaunch() {
    console.log('小程序启动')
    // 展示本地存储能力
    try {
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    } catch (error) {
      console.error('存储日志失败:', error)
    }

    // 延迟登录，避免启动时立即调用导致错误
    setTimeout(() => {
      this.login().catch(err => {
        console.error('登录失败:', err)
        // 静默失败，不影响应用启动
      })
    }, 500)
  },

  onShow() {
    console.log('小程序显示')
  },

  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: res => {
          if (res.code) {
            // 发送 res.code 到后台换取 openId, sessionKey, unionId
            console.log('登录成功', res.code)
            this.globalData.hasLogin = true
            resolve(res.code)
          } else {
            console.log('登录失败！' + res.errMsg)
            reject(res.errMsg)
          }
        },
        fail: err => {
          console.error('wx.login调用失败:', err)
          // 不阻止应用运行，静默处理
          reject(err)
        }
      })
    })
  },

  getUserInfo() {
    return new Promise((resolve, reject) => {
      if (this.globalData.userInfo) {
        resolve(this.globalData.userInfo)
      } else {
        try {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (res) => {
            this.globalData.userInfo = res.userInfo
            resolve(res.userInfo)
          },
            fail: (err) => {
              console.error('getUserProfile失败:', err)
              reject(err)
            }
        })
        } catch (error) {
          console.error('getUserProfile调用异常:', error)
          reject(error)
        }
      }
    })
  }
})