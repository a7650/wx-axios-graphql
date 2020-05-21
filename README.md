# 🛸wx-axios-graphql
### 可以在微信小程序上使用的axios，同时支持graphQL

[npm v1.1.1][npm-url] &emsp; [git地址][git-url]


[npm-url]: https://www.npmjs.com/package/wx-axios-graphql
[git-url]: https://github.com/a7650/wx-axios-graphql.git

### 如果该项目对你有用的话，麻烦在git上点个star⭐，我将会有更多动力去维护
### 如果你在使用过程碰到了问题或者bug，欢迎在issue里提

## 使用方法

### 安装

`npm install wx-axios-graphql`

或者把request文件拷贝下来，放在你的项目中，然后`import request from "./request/index.js"`


### 用法

该js库是对微信上的wx.request的封装，参考axios的功能和语法，同时加入了graphQL的支持

#### 1: axios部分

支持以下请求语法

```
//和axios语法保持一致

get(url, config)

post(url, data, config)

put(url, data, config)

delete(url, config)

head(url, config)

options(url, config) 

patch(url, data, config)
```

还支持以下扩展功能

（1）配置defaults

配置可通过`request.defaults[propertyName]`配置，propertyName有以下几项

```
const defaults = {
	method: 'GET', // 配置默认的请求方法，大写

	timeout: 0, // 请求超时时间 ms

	headers: { // 默认的请求头
		common: {
			Accept: 'application/json, text/plain, */*'
		}
	},

	baseURL: "", // baseURL

	auth: null, // {null | String | Function} // 配置Authorization请求头的value,function类型时需要返回一个字符串

	authKey: "Authorization", // 配置Authorization请求头的key

	authURL: {
		inclusive: null, // 如果配置了inclusive数组，则只有inclusive中包含的url才会被添加auth
		exclusive: null // exclusive中包含的url不会被添加auth
	} // {null | String[]} 
}
```

（2）请求拦截器和响应拦截器

使用方式和axios一样

```
//以下是请求和响应拦截器简单的配置

request.interceptors.request.use(
    res => {
        return Promise.resolve("success")
    },
    err => {
        return Promise.reject("error")
    }
)

request.interceptors.response.use(
    res => {
        return Promise.resolve("success")
    },
    err => {
        return Promise.reject("error")
    }
)
```

（3）取消请求

取消请求支持cancelToken形式

```
// 以下是一个简单的示例

const url = '/api/hello'

const data = { msg : 1 }

const cancelFn = null

request.post(url, data, {
      cancelToken: new request.CancelToken(_c => cancelFn = _c)
      })

// 该请求将会在1s后被取消
setTimeout(() => {
      cancelFn && cancelFn()
}, 1000)
```

（4）创建axios实例

可以使用`request.create(defaultConfig)`创建一个新的实例


#### 2:graphQL部分

该request插件提供了一个简单的解析器，你只需要写简单的语法，就可以帮你生成graphQL那些繁琐的查询语句。

graphQL挂载在request上，你可以通过`request.graphQL`获得grapgQL类


```
const gql = new request.graphQL({
    url: "https://dev.test.cn/graphql", // url是请求的地址
    custom: false // custom表示是否自定义查询语句，后面会介绍
})

// 可以通过gql.client获得client实例
const client = gql.client

// graph.client和request一样，可以配置defaults以及请求/响应拦截器，支持request的所有配置
// 所以如果你想对graphQL做一些全局的响应拦截，比如验证token，拦截错误，对返回结果封装等，可以在这里设置

// 用法和request一模一样
gql.client.interceptors.response.use(
    res => {
        let { statusCode, data, config } = res
        if (statusCode >= 500) {
            return Promise.reject("服务器错误，请稍后再试")
        }
        return Promise.resolve(data)
    },
    err => {
        return Promise.reject(err)
    }
)

```

创建完gql后，就可以使用了,以下通过几个demo来说明如何使用

```
/**
 * 完整的graphQL方法示例，包含目前gql方法支持的所有的属性
 * gql拥有query方法和mutate方法
 */

/**
 * query操作
 * 使用模板语法
 */
function demoQuery1() {
      //gql就是刚才用 new request.graphQL 创建的实例
    gql.query({ //通过gql.query执行query操作
        //custom属性设置是否自定义查询语法，同graphQL初始化时候的custom属性，该属性会覆盖初始化时候的custom且仅对本次请求有效
        custom: false, //可选
        //query操作需要传入query属性
        //custom为false时候需要按照模板格式传入即 operationName(key1: type1, key2: type2)
        //只要按照规定格式写query，都会自动编译为正确的graphQL查询语句
        //如传入session(appId: ID!, code: String!) 和 responseNode：session
        //在请求时会编译为query session($appId:ID!,$code:String!){session(appId:$appId,code:$code){↵id↵name↵token}}
        query: `session(appId: ID!, code: String!)`, // 必填
        //定义返回的节点信息 
        responseNode: fragment.session, //可选, 本demo中，session就是`↵id↵name↵token`字符串
        variables: { //可选
            appId: APPID,
            code: code
        }
    }).then(res => {
        if (res.errors) {
            //也可以在相应拦截器里面设置
            console.log('error')
            reject(errors)
        } else {
            resolve(res.data)
        }
    }, err => {
        reject(err)
    })
}


/**
 * query操作
 * 自定义查询语法
 */
function demoQuery1() {
    gql.query({
        //custom为true时，使用自定义查询语法
        custom: true,
        //自定义查询语法时，需要手动写完整的查询语句，不会进行编译过程，会原封不动的使用query进行请求
        query: `query sessionByWechat($appId: ID!, $code: String!){
                    sessionByWechat(appId: $appId, code:$code){
                        ${fragment.session}
                    }
                }`,
        variables: {
            appId: APPID,
            authCode: code
        }
    }).then(res => {
        if (res.errors) {
            console.log('error')
        } else {
            resolve(res.data)
        }
    }, err => {
        reject(err)
    })
}

/**
 * mutate操作
 * mutate操作的使用方式和query相同
 */
function demoMutate() {
    gql.mutate({
        //mutate操作时不传query，而是传mutation，其他使用方式和query一模一样
        mutation: `query sessionByWechat(appId: ID!, authCode: String!)`,
        responseNode: fragment.session,
        custom: false,
        variables: {
            appId: APPID,
            authCode: code
        }
    }).then(res => {
        resolve(res.data.sessionByWechat)
    }, err => {
        reject(err)
    })
}
```

### 新增 同时进行多个查询
```
function demoQuery1() {
    gql.query({
        custom: false, //可选
        //同时查询多个时，query需要传入数组
        query: [`session(appId: ID!, code: String!)`,`userInfo(id: $id)`]， // 会同时查询session和userInfo
        // 此时responseNode需要为一个对象，分别定义不同查询的返回节点
        responseNode:{
            session: `token`,
            userInfo: `name`
        },
        // variables也要为对象，分别传入不同查询的参数
        variables: { 
            session: {
                appId: "test123",
                code: "test456"
            },
            userInfo:{
                id: "userid"
            }
        }
    }).then(res => {
        if (res.errors) {
            //也可以在相应拦截器里面设置
            console.log('error')
            reject(errors)
        } else {
            resolve(res.data)
        }
    }, err => {
        reject(err)
    })
}
```

#### 如果使用方法有不明白的欢迎在issue里和我交流
#### 如果对你有帮助欢迎点个star




    
