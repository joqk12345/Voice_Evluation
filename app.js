// app.js
App({
  globalData: {
    userInfo: null,
    hasLogin: false,
    openid: '',
    session_key: '',
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
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    this.login()
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
        }
      })
    })
  },

  getUserInfo() {
    return new Promise((resolve, reject) => {
      if (this.globalData.userInfo) {
        resolve(this.globalData.userInfo)
      } else {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (res) => {
            this.globalData.userInfo = res.userInfo
            resolve(res.userInfo)
          },
          fail: reject
        })
      }
    })
  }
})