// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    color: "#666666",
    selectedColor: "#DAA520",
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        icon: "🏠"
      },
      {
        pagePath: "/pages/record/record",
        text: "评测",
        icon: "🎤"
      },
      {
        pagePath: "/pages/history/history",
        text: "历史",
        icon: "📊"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        icon: "👤"
      }
    ]
  },
  attached() {
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({url})
      this.setData({
        selected: data.index
      })
    }
  }
})

