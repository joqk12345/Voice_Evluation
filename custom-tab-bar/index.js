// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    color: "#9ca3af",
    selectedColor: "#ff9a56",
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        icon: "🏡"
      },
      {
        pagePath: "/pages/record/record",
        text: "评测",
        icon: "🎙️"
      },
      {
        pagePath: "/pages/history/history",
        text: "历史",
        icon: "📋"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        icon: "💝"
      }
    ]
  },
  lifetimes: {
  attached() {
      // 根据当前页面路径设置选中状态
      try {
        const pages = getCurrentPages()
        if (pages && pages.length > 0) {
          const currentPage = pages[pages.length - 1]
          if (currentPage && currentPage.route) {
            const url = '/' + currentPage.route
            
            this.data.list.forEach((item, index) => {
              if (item.pagePath === url) {
                this.setData({
                  selected: index
                })
              }
            })
          }
        }
      } catch (error) {
        console.warn('tabBar attached 错误:', error)
      }
    }
  },
  pageLifetimes: {
    show() {
      // 页面显示时更新选中状态
      try {
        const pages = getCurrentPages()
        if (pages && pages.length > 0) {
          const currentPage = pages[pages.length - 1]
          if (currentPage && currentPage.route) {
            const url = '/' + currentPage.route
            
            this.data.list.forEach((item, index) => {
              if (item.pagePath === url) {
                this.setData({
                  selected: index
                })
              }
            })
          }
        }
      } catch (error) {
        console.warn('tabBar show 错误:', error)
      }
    }
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      const index = data.index
      
      this.setData({
        selected: index
      })
      
      wx.switchTab({
        url: url,
        success: () => {
          this.setData({
            selected: index
          })
        },
        fail: (err) => {
          console.error('switchTab失败:', err)
        }
      })
    }
  }
})

