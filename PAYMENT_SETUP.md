# 微信支付接口配置说明

## 📋 概述

小程序已接入官方微信支付 API (`wx.requestPayment`)，符合微信小程序审核要求。

参考文档：[微信小程序支付](https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=7_3&index=1)

## 🔧 配置步骤

### 1. 配置后端 API 地址

在 `app.js` 中配置后端 API 地址：

```javascript
globalData: {
  // ... 其他配置
  apiBaseUrl: 'https://your-backend-api.com', // 替换为实际的后端 API 地址
}
```

### 2. 后端接口要求

#### 2.1 统一下单接口

**接口路径：** `POST /api/payment/unifiedorder`

**请求参数：**
```json
{
  "openid": "用户openid",
  "amount": 29,  // 支付金额（分）
  "description": "专业深度评测服务",
  "attach": "pro_evaluation"
}
```

**响应格式：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "timeStamp": "1609459200",
    "nonceStr": "随机字符串",
    "package": "prepay_id=wx123456789",
    "signType": "RSA",
    "paySign": "签名",
    "orderId": "订单ID"
  }
}
```

#### 2.2 支付验证接口（可选）

**接口路径：** `POST /api/payment/verify`

**请求参数：**
```json
{
  "orderId": "订单ID"
}
```

**响应格式：**
```json
{
  "code": 0,
  "message": "success"
}
```

### 3. 后端实现要点

#### 3.1 统一下单接口实现

后端需要调用微信支付统一下单接口，参考文档：
- [统一下单接口](https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=9_1)

**关键步骤：**
1. 接收前端请求，获取订单信息
2. 调用微信支付统一下单接口（`https://api.mch.weixin.qq.com/pay/unifiedorder`）
3. 生成支付签名（使用商户密钥）
4. 返回支付参数给前端

**示例代码（Node.js）：**
```javascript
const crypto = require('crypto');
const axios = require('axios');

async function unifiedOrder(req, res) {
  const { openid, amount, description, attach } = req.body;
  
  // 1. 构建统一下单参数
  const params = {
    appid: '你的小程序AppID',
    mch_id: '你的商户号',
    nonce_str: generateNonceStr(),
    body: description,
    out_trade_no: generateOrderNo(),
    total_fee: amount,
    spbill_create_ip: req.ip,
    notify_url: 'https://your-backend-api.com/api/payment/notify',
    trade_type: 'JSAPI',
    openid: openid,
    attach: attach
  };
  
  // 2. 生成签名
  params.sign = generateSign(params, '你的商户密钥');
  
  // 3. 调用微信支付接口
  const response = await axios.post(
    'https://api.mch.weixin.qq.com/pay/unifiedorder',
    xmlEncode(params),
    { headers: { 'Content-Type': 'application/xml' } }
  );
  
  // 4. 解析响应，获取 prepay_id
  const result = xmlDecode(response.data);
  
  // 5. 生成小程序支付参数
  const paymentParams = {
    timeStamp: Math.floor(Date.now() / 1000).toString(),
    nonceStr: generateNonceStr(),
    package: `prepay_id=${result.prepay_id}`,
    signType: 'RSA',
    paySign: generatePaySign({
      appId: params.appid,
      timeStamp: timeStamp,
      nonceStr: nonceStr,
      package: package
    }),
    orderId: params.out_trade_no
  };
  
  res.json({
    code: 0,
    message: 'success',
    data: paymentParams
  });
}
```

#### 3.2 支付回调处理

需要实现支付结果通知接口，参考文档：
- [支付结果通知](https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=9_7)

### 4. 微信支付配置

#### 4.1 商户平台配置

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 配置支付授权目录
3. 配置支付回调地址
4. 获取商户号和 API 密钥

#### 4.2 小程序配置

1. 在微信公众平台配置支付参数
2. 关联商户号
3. 配置支付域名

## ⚠️ 注意事项

1. **安全性**
   - 所有支付相关操作必须在后端完成
   - 商户密钥不能暴露在前端
   - 使用 HTTPS 协议

2. **错误处理**
   - 前端已实现完整的错误处理
   - 后端需要返回明确的错误信息

3. **测试**
   - 使用微信支付沙箱环境进行测试
   - 确保支付流程完整可用

4. **审核要求**
   - 必须使用官方 `wx.requestPayment` API
   - 不能使用模拟支付
   - 支付功能必须真实可用

## 📝 当前状态

- ✅ 已接入官方 `wx.requestPayment` API
- ✅ 已移除模拟支付代码
- ✅ 已移除支付宝选项（小程序仅支持微信支付）
- ⚠️ 需要配置后端 API 地址
- ⚠️ 需要实现后端统一下单接口

## 🔗 相关文档

- [微信小程序支付文档](https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=7_3&index=1)
- [统一下单接口](https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=9_1)
- [支付结果通知](https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=9_7)






