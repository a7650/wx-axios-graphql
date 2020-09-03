const loggerMap = {}

function getOperationName(ast) {
    return ast.map(item => item.operationName).join('_')
}

function getOperationType(ast) {
    return ast[0].operationType
}

function transAst(ast) {
    return {
        name: getOperationName(ast),
        type: getOperationType(ast)
    }
}

function printLog(loggerItem) {
    const { request, response, type, name } = loggerItem
    console.log(`%c ${type} : ${name} `, `background-color:${type === 'query' ? '#00ff00' : '#ffc400'};color:#000`)
    console.log('请求', request.variables)
    console.log('响应', response)
}

export function requestStart(ast, variables) {
    const { name, type } = transAst(ast)
    loggerMap[name] = {
        request: {
            variables
        },
        response: {},
        type,
        name
    }
}

export function requestEnd(ast, res) {
    const { name } = transAst(ast)
    if (name && loggerMap[name]) {
        loggerMap[name].response = res
        printLog(loggerMap[name])
    }
}

export function requestEndError(ast, err) {
    const { name, type } = transAst(ast)
    console.log(`%c ${type} : ${name}  %c Error `, `background-color:${type === 'query' ? '#00ff00' : '#ffc400'};color:#000`, 'background-color:#ff0000;color:#fff')
    console.log('AST', ast)
    console.log('err', err)
}
