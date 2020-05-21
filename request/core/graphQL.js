/*
 * @Author: zhang zhipeng 
 * @Date: 2020-04-15 10:29:40 
 * @Last Modified by: zhang zhipeng
 * @Last Modified time: 2020-05-21 21:01:41
 */
import Request from './request'
import { deepMerge } from '../utils'
import defaults from '../defaults'

let cache = {}

/**
 * Request的graphQL扩展
 */
class graphQL {
    constructor(config = {}) {
        this.client = new Request(deepMerge(defaults, config))
        this.config = config
        if (config.custom !== "undefined") {
            this.isCustomQueryStatement = !!config.custom
        } else {
            this.isCustomQueryStatement = false
        }
    }
    /**
     * @property {String} query query查询语句
     * @property {Object} variables 查询参数
     */
    query(data, config = {}) {
        let type = "query"
        return this.dispatchRequest(data, config, type, 'query')
    }
    /**
     * @property {String} mutation mutation查询语句
     * @property {Object} variables 查询参数
     */
    mutate(data, config = {}) {
        let type = "mutation"
        data.query = data.mutation
        return this.dispatchRequest(data, config, type, 'mutate')
    }
    dispatchRequest(data, config, type, handleType) {
        let { query, variables = {}, responseNode, custom } = data
        if (!(query = formatQuery(query))) {
            return Promise.reject()
        }
        let queryStatement = ""
        let isCustomQueryStatement
        if (typeof custom === "boolean") {
            isCustomQueryStatement = custom
        } else {
            isCustomQueryStatement = this.isCustomQueryStatement
        }
        if (isCustomQueryStatement) {
            queryStatement = query
        } else {
            let cacheKey = query.join("/") + responseNode || ""
            if (cache[cacheKey]) {
                queryStatement = cache[cacheKey]
            } else {
                try {
                    let ast = parse(query, responseNode, type, variables)
                    console.log(ast)
                    queryStatement = cache[cacheKey] = gencode(ast)
                } catch (err) {
                    cache[cacheKey] = ""
                    console.error(err)
                    return Promise.reject()
                }
            }
        }
        return this.client.post(this.config.url, { query: queryStatement, variables }, config)
    }
}

function parse(queries, responseNode, type, variables) {
    if (!responseNode) {
        responseNode = {}
    }
    // const resultMap = {}
    const resultArr = []
    queries.forEach(query => {
        let ast = parseQuery(query, responseNode, type, variables)
        // resultMap[ast.operationName] = ast
        resultArr.push(ast)
    })
    return resultArr
}

/**
 * @param {Object[]} ast query的ast
 */
function gencode(ast) {
    let result = ""
    let { operationName, operationType, variables, responseNode } = ast
    let hasVariables = variables && variables.length > 0
    result += `${operationType} ${operationName}`
    if (hasVariables) {
        result += "("
        variables.forEach(({ key, type }, i) => {
            result += `${i === 0 ? "" : ","}$${key}:${type}`
        })
        result += `){${operationName}(`
        variables.forEach(({ key, type }, i) => {
            result += `${i === 0 ? "" : ","}${key}:$${key}`
        })
        result += ")"
        if (responseNode) {
            result += `{${responseNode}}`
        }
        result += "}"
    } else {
        if (responseNode) {
            result += `{${operationName}{${responseNode}}}`
        }
    }
    return result
}

/**
 * 
 * @param {String|String[]} query 
 */
function formatQuery(query) {
    if (!query) {
        console.error(`${handleType}缺少${type}属性`)
        return false
    }
    if (typeof query === 'string') {
        return [query]
    }
    if (Array.isArray(query)) {
        if (query.some(item => typeof item !== 'string')) {
            console.error(`query为数组时需要是 "string[]" 类型`)
            return false
        }
        return query
    }
    console.error('query只支持 string 和 string[] 类型')
    return false
}

/**
 * 
 * @param {String} query query语句
 * @param {String | Object} responseNode 返回节点声明
 * @param {String}} type 操作类型
 * @param {Object} variables 变量
 */
function parseQuery(query, responseNode, type, variables) {
    query = query.trim()
    let contentReg = /\(([^)]*)\)/
    let result = {}
    let match = query.match(contentReg)
    if (!match) {
        query += "()"
        match = query.match(contentReg)
        if (!match) {
            throw new Error(`${query}语法错误`)
        }
    }
    let variablesStatement = match[1]
    let operationIdx = match["index"]
    let operationName = query.substr(0, operationIdx)
    if (!operationName) {
        throw new Error(`缺少操作名称: ${query}`)
    }
    result.operationName = operationName
    result.variables = []
    result.variablesMap = {}
    if (variablesStatement) {
        variablesStatement.split(",").forEach(item => {
            let [key, type] = item.split(":")
            key = key.trim()
            type = type.trim()
            if (!type) {
                throw new Error(`变量"${key}"缺少类型: ${query}`)
            }
            result.variables.push({ key, type })
            result.variablesMap[key] = type
        })
    }
    if (typeof variables === 'string') {
        variables = { [operationName]: variables }
    }
    result.variablesStore = variables[operationName]
    result.responseNode = responseNode
    result.operationType = type
    return result
}

export default graphQL

