// pages/payment/payment.js
Page({
  data: {
    selectedMethod: 'wechat',
    agreed: false
  },

  onLoad(options) {
    console.log('支付页面加载', options)
  },

  // 选择支付方式
  selectPaymentMethod(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      selectedMethod: type
    })
  },

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
      content: `使用${this.data.selectedMethod === 'wechat' ? '微信支付' : '支付宝'}支付¥29？`,
      confirmText: '确认支付',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.processPayment()
        }
      }
    })
  },

  // 处理支付
  processPayment() {
    wx.showLoading({
      title: '正在支付...'
    })

    // 模拟支付流程
    setTimeout(() => {
      wx.hideLoading()
      wx.showModal({
        title: '支付成功',
        content: '恭喜您获得专业深度评测服务！\n\n现在开始您的专业评测之旅吧！',
        showCancel: false,
        confirmText: '开始评测',
        success: (res) => {
          if (res.confirm) {
            // 跳转到专业评测页面
            wx.redirectTo({
              url: '/pages/record/record?type=pro&paid=true'
            })
          }
        }
      })
    }, 2000)
  }
})

