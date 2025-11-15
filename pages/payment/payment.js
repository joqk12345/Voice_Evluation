// pages/payment/payment.js
Page({
  data: {
    selectedMethod: 'wechat', // 小程序仅支持微信支付
    agreed: false
  },

  onLoad(options) {
    console.log('支付页面加载', options)
  },

  // 注意：小程序仅支持微信支付，已移除支付方式选择功能

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  // 显示用户协议
  showUserAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '这里是用户协议的内容...',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '这里是隐私政策的内容...',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  // 确认支付
  confirmPayment() {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认支付',
      content: '使用微信支付¥29？',
      confirmText: '确认支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.processPayment()
        }
      }
    })
  },

  // 处理支付 - 使用官方微信支付 API
  processPayment() {
    // 只支持微信支付
    if (this.data.selectedMethod !== 'wechat') {
      wx.showToast({
        title: '小程序仅支持微信支付',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '正在支付...',
      mask: true
    })

    // 第一步：调用后端接口统一下单，获取支付参数
    // 注意：需要配置后端 API 地址，后端需要调用微信支付统一下单接口
    this.createOrder((err, paymentParams) => {
      if (err) {
        wx.hideLoading()
        wx.showToast({
          title: err.message || '获取支付参数失败',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // 第二步：调用微信支付 API
      wx.requestPayment({
        timeStamp: paymentParams.timeStamp,
        nonceStr: paymentParams.nonceStr,
        package: paymentParams.package,
        signType: paymentParams.signType || 'RSA',
        paySign: paymentParams.paySign,
        success: (res) => {
          wx.hideLoading()
          console.log('支付成功', res)
          
          // 支付成功，验证订单状态（可选）
          this.verifyPayment(paymentParams.orderId, (verifyErr) => {
            if (verifyErr) {
              console.error('验证订单失败:', verifyErr)
            }
            
            wx.showModal({
              title: '支付成功',
              content: '恭喜您获得专业深度评测服务！\n\n现在开始您的专业评测之旅吧！',
              showCancel: false,
              confirmText: '开始评测',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 跳转到专业评测页面
                  wx.redirectTo({
                    url: '/pages/record/record?type=pro&paid=true'
                  })
                }
              }
            })
          })
        },
        fail: (err) => {
          wx.hideLoading()
          console.error('支付失败', err)
          
          // 用户取消支付
          if (err.errMsg && err.errMsg.includes('cancel')) {
            wx.showToast({
              title: '已取消支付',
              icon: 'none'
            })
          } else {
            wx.showToast({
              title: '支付失败，请重试',
              icon: 'none',
              duration: 2000
            })
          }
        }
      })
    })
  },

  // 创建订单并获取支付参数
  // 需要后端实现：调用微信支付统一下单接口
  // 参考文档：https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=7_3&index=1
  createOrder(callback) {
    // 从 app.js 获取 API 配置，如果没有则使用默认值
    const app = getApp()
    const apiBaseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || 'https://your-backend-api.com'
    
    if (apiBaseUrl === 'https://your-backend-api.com') {
      callback(new Error('请先配置后端 API 地址。在 app.js 中设置 globalData.apiBaseUrl'), null)
      return
    }
    
    // 获取用户 openid（用于订单）
    // openid 应该通过 wx.login() 获取 code，然后发送到后端换取
    let openid = app.globalData.openid || ''
    
    // 如果全局没有 openid，尝试从本地存储获取
    if (!openid) {
      const userInfo = wx.getStorageSync('userInfo') || {}
      openid = userInfo.openid || ''
    }
    
    if (!openid) {
      callback(new Error('请先登录。openid 需要通过 wx.login() 获取 code 后，由后端换取'), null)
      return
    }

    // 订单信息
    const orderData = {
      openid: openid,
      amount: 29, // 支付金额（分）
      description: '专业深度评测服务',
      attach: 'pro_evaluation' // 附加数据
    }

    wx.request({
      url: `${apiBaseUrl}/api/payment/unifiedorder`, // 统一下单接口
      method: 'POST',
      data: orderData,
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          // 后端返回支付参数
          const paymentParams = res.data.data
          callback(null, paymentParams)
        } else {
          callback(new Error(res.data.message || '获取支付参数失败'), null)
        }
      },
      fail: (err) => {
        console.error('创建订单失败:', err)
        // 如果后端接口未配置，提供开发提示
        if (err.errMsg && err.errMsg.includes('fail')) {
          callback(new Error('请配置后端支付接口。参考文档：https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=7_3&index=1'), null)
        } else {
          callback(new Error('网络请求失败，请检查网络连接'), null)
        }
      }
    })
  },

  // 验证支付结果（可选）
  verifyPayment(orderId, callback) {
    // 从 app.js 获取 API 配置
    const app = getApp()
    const apiBaseUrl = (app && app.globalData && app.globalData.apiBaseUrl) || 'https://your-backend-api.com'
    
    wx.request({
      url: `${apiBaseUrl}/api/payment/verify`,
      method: 'POST',
      data: {
        orderId: orderId
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          callback(null)
        } else {
          callback(new Error('订单验证失败'))
        }
      },
      fail: (err) => {
        console.error('验证订单失败:', err)
        callback(err)
      }
    })
  }
})




